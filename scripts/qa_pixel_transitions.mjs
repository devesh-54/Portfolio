import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';
const USER_DATA_DIR = path.join(ARTIFACT_DIR, 'scratch', 'chrome_qa_pixel_clean');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function run() {
  console.log('=== Starting Phase 7 Visual QA Suite ===');

  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9299',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);

  await sleep(2000);

  try {
    const listRes = await fetch('http://127.0.0.1:9299/json/list');
    const pages = await listRes.json();
    const target = pages.find(p => p.type === 'page');
    if (!target) throw new Error('No page target discovered!');

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    const callbacks = new Map();

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && callbacks.has(data.id)) {
        const { resolve, reject } = callbacks.get(data.id);
        callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };

    await new Promise((res) => (ws.onopen = res));
    console.log('Connected to Chrome DevTools CDP on Page Target.');

    await send('Page.enable');
    await send('Runtime.enable');

    async function waitFor(fnExpr, maxWait = 12000) {
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        const res = await send('Runtime.evaluate', {
          expression: fnExpr,
          returnByValue: true,
        });
        if (res?.result?.value) return res.result.value;
        await sleep(300);
      }
      return null;
    }

    // ─── 1. Viewport Fit Checks at 1920x1080, 1366x768, 1280x720 ─────────────
    console.log('\n--- 1. Testing Screen Viewport Fit across standard resolutions ---');
    const resolutions = [
      { w: 1920, h: 1080 },
      { w: 1366, h: 768 },
      { w: 1280, h: 720 },
    ];

    for (const res of resolutions) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: res.w,
        height: res.h,
        deviceScaleFactor: 1,
        mobile: false,
      });

      await send('Page.navigate', { url: 'http://localhost:5174/?p=0&dev=1' });
      const ready = await waitFor('Boolean(document.getElementById("stage"))');
      if (!ready) {
        console.error(`Timeout waiting for #stage at ${res.w}x${res.h}`);
        continue;
      }
      await sleep(1500);

      const fitCheck = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const screens = ['about', 'skills', 'contact'];
            return screens.map(id => {
              const el = document.getElementById(id);
              const content = el ? el.querySelector('.ps-screen-content') : null;
              if (!content) return { id, error: 'not found' };
              return {
                id,
                clientHeight: content.clientHeight,
                scrollHeight: content.scrollHeight,
                overflows: content.scrollHeight > content.clientHeight + 2
              };
            });
          })()
        `,
        returnByValue: true,
      });

      console.log(`Resolution ${res.w}x${res.h}:`, JSON.stringify(fitCheck?.result?.value));
      const hasOverflow = fitCheck?.result?.value?.some(s => s.overflows);
      if (hasOverflow) {
        console.warn(`WARNING: Viewport overflow detected at ${res.w}x${res.h}!`);
      } else {
        console.log(`PASS: All screens fit inside ${res.w}x${res.h} without vertical scrolling.`);
      }
    }

    // Reset resolution to 1280x800 for transition suite
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: 'http://localhost:5174/' });
    await waitFor('Boolean(document.getElementById("stage") && window.__applyStage)');
    await sleep(2000);

    // Helper to evaluate stage progress directly
    async function setStageProgress(s) {
      return await send('Runtime.evaluate', {
        expression: `
          (() => {
            const stage = document.getElementById('stage');
            if (stage) stage.scrollIntoView({ behavior: 'instant' });
            if (window.__applyStage) {
              window.__applyStage(${s});
              return {
                progress: +(${s}).toFixed(4),
                headerTheme: document.getElementById('site-header')?.getAttribute('data-theme'),
                crispOpacity: document.querySelector('.ps-crisp')?.style.opacity,
                aboutClip: document.getElementById('about')?.style.clipPath,
                skillsClip: document.getElementById('skills')?.style.clipPath,
                contactClip: document.getElementById('contact')?.style.clipPath
              };
            }
            return { error: '__applyStage not defined' };
          })()
        `,
        returnByValue: true,
      });
    }

    // Normalized stage sequence mapping:
    // Trans 1: void -> about (Scan L->R) [0, 100/510]
    // Hold 1: about [100/510, 170/510], mid = 135/510
    // Trans 2: about -> skills (Burst Center) [170/510, 270/510]
    // Hold 2: skills [270/510, 340/510], mid = 305/510
    // Trans 3: skills -> contact (Scan R->L) [340/510, 440/510]
    // Hold 3: contact [440/510, 510/510], mid = 475/510
    const P_values = [0.1, 0.3, 0.5, 0.7, 0.9];
    const sTrans1 = p => (p * 100) / 510;
    const sTrans2 = p => (170 + p * 100) / 510;
    const sTrans3 = p => (340 + p * 100) / 510;

    // A. Transition 1: Projects -> About (Scan L->R)
    console.log('\n--- Testing Transition 1 (Projects -> About: Scan L->R) ---');
    const fwd1 = {};
    for (const p of P_values) {
      const state = (await setStageProgress(sTrans1(p)))?.result?.value;
      fwd1[p] = state;
      if (p === 0.5) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'qa_trans1_scan_p0.5.png'), Buffer.from(shot.data, 'base64'));
        console.log('Saved qa_trans1_scan_p0.5.png');
      }
    }
    const rev1 = {};
    for (const p of [...P_values].reverse()) {
      const state = (await setStageProgress(sTrans1(p)))?.result?.value;
      rev1[p] = state;
    }
    for (const p of P_values) {
      const match = fwd1[p]?.aboutClip === rev1[p]?.aboutClip;
      console.log(`Trans 1 P=${p}: Forward === Reverse (${match ? 'EXACT' : 'MISMATCH'}) [Clip: ${fwd1[p]?.aboutClip?.slice(0, 35)}...]`);
    }

    // B. Hold 1 (About)
    console.log('\n--- Testing Hold 1 (About) ---');
    const holdAbout = (await setStageProgress(135 / 510))?.result?.value;
    console.log('Hold About State:', JSON.stringify(holdAbout));
    const shotHoldAbout = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'qa_hold1_about.png'), Buffer.from(shotHoldAbout.data, 'base64'));
    console.log('Saved qa_hold1_about.png');

    // C. Transition 2: About -> Skills (Burst Center)
    console.log('\n--- Testing Transition 2 (About -> Skills: Burst Center) ---');
    const fwd2 = {};
    for (const p of P_values) {
      const state = (await setStageProgress(sTrans2(p)))?.result?.value;
      fwd2[p] = state;
      if (p === 0.5) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'qa_trans2_burst_p0.5.png'), Buffer.from(shot.data, 'base64'));
        console.log('Saved qa_trans2_burst_p0.5.png');
      }
    }
    const rev2 = {};
    for (const p of [...P_values].reverse()) {
      const state = (await setStageProgress(sTrans2(p)))?.result?.value;
      rev2[p] = state;
    }
    for (const p of P_values) {
      const match = fwd2[p]?.skillsClip === rev2[p]?.skillsClip;
      console.log(`Trans 2 P=${p}: Forward === Reverse (${match ? 'EXACT' : 'MISMATCH'}) [Clip: ${fwd2[p]?.skillsClip}]`);
    }

    // D. Hold 2 (Skills)
    console.log('\n--- Testing Hold 2 (Skills) ---');
    const holdSkills = (await setStageProgress(305 / 510))?.result?.value;
    console.log('Hold Skills State:', JSON.stringify(holdSkills));
    const shotHoldSkills = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'qa_hold2_skills.png'), Buffer.from(shotHoldSkills.data, 'base64'));
    console.log('Saved qa_hold2_skills.png');

    // E. Transition 3: Skills -> Contact (Scan R->L)
    console.log('\n--- Testing Transition 3 (Skills -> Contact: Scan R->L) ---');
    const fwd3 = {};
    for (const p of P_values) {
      const state = (await setStageProgress(sTrans3(p)))?.result?.value;
      fwd3[p] = state;
      if (p === 0.5) {
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'qa_trans3_scan_rtl_p0.5.png'), Buffer.from(shot.data, 'base64'));
        console.log('Saved qa_trans3_scan_rtl_p0.5.png');
      }
    }
    const rev3 = {};
    for (const p of [...P_values].reverse()) {
      const state = (await setStageProgress(sTrans3(p)))?.result?.value;
      rev3[p] = state;
    }
    for (const p of P_values) {
      const match = fwd3[p]?.contactClip === rev3[p]?.contactClip;
      console.log(`Trans 3 P=${p}: Forward === Reverse (${match ? 'EXACT' : 'MISMATCH'}) [Clip: ${fwd3[p]?.contactClip?.slice(0, 35)}...]`);
    }

    // F. Hold 3 (Contact)
    console.log('\n--- Testing Hold 3 (Contact) ---');
    const holdContact = (await setStageProgress(475 / 510))?.result?.value;
    console.log('Hold Contact State:', JSON.stringify(holdContact));
    const shotHoldContact = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'qa_hold3_contact.png'), Buffer.from(shotHoldContact.data, 'base64'));
    console.log('Saved qa_hold3_contact.png');

    // ─── 3. Header Theme Switching Verification ───────────────────────────────
    console.log('\n--- 3. Verifying Header Theme Flipping ---');
    const theme0 = (await setStageProgress(0))?.result?.value?.headerTheme;
    const themeMid = (await setStageProgress(50 / 510))?.result?.value?.headerTheme;
    const themeBack = (await setStageProgress(0))?.result?.value?.headerTheme;
    console.log(`Theme at s=0: "${theme0}" (expected dark)`);
    console.log(`Theme at s=50/510: "${themeMid}" (expected light)`);
    console.log(`Theme back at s=0: "${themeBack}" (expected dark)`);

    // ─── 4. Deep Links Verification ──────────────────────────────────────────
    console.log('\n--- 4. Testing Deep Links (/#skills) ---');
    await send('Page.navigate', { url: 'http://localhost:5174/#skills' });
    await waitFor('Boolean(document.getElementById("skills") && window.__applyStage)');
    await sleep(2000);

    const deepLinkState = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const skills = document.getElementById('skills');
          const header = document.getElementById('site-header');
          return {
            url: window.location.hash,
            skillsVisibility: skills ? getComputedStyle(skills).visibility : 'none',
            skillsClip: skills ? skills.style.clipPath : 'none',
            headerTheme: header?.getAttribute('data-theme')
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Deep Link #skills state:', JSON.stringify(deepLinkState?.result?.value));

    // ─── 5. Performance / FPS Benchmark ──────────────────────────────────────
    console.log('\n--- 5. Benchmarking Scrub Performance / FPS ---');
    const fpsBenchmark = await send('Runtime.evaluate', {
      expression: `
        new Promise(resolve => {
          let frameCount = 0;
          let startTime = performance.now();
          const totalFrames = 60;

          function step() {
            frameCount++;
            const s = (frameCount % totalFrames) / totalFrames;
            if (window.__applyStage) window.__applyStage(s);

            if (frameCount < totalFrames) {
              requestAnimationFrame(step);
            } else {
              const elapsed = performance.now() - startTime;
              const fps = (frameCount / elapsed) * 1000;
              resolve({ fps: Math.round(fps), elapsedMs: Math.round(elapsed) });
            }
          }
          requestAnimationFrame(step);
        })
      `,
      awaitPromise: true,
      returnByValue: true,
    });
    console.log('FPS Benchmark result:', JSON.stringify(fpsBenchmark?.result?.value));

    ws.close();
    console.log('\n=== Phase 7 Visual QA Completed Successfully ===');
  } catch (err) {
    console.error('QA error:', err);
  } finally {
    chrome.kill();
  }
}

run();
