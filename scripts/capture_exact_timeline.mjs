import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';

async function captureTimeline() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9307',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9307/json/list');
    const pages = await listRes.json();
    const target = pages.find(p => p.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = new Map();
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && callbacks.has(data.id)) {
        const cb = callbacks.get(data.id);
        callbacks.delete(data.id);
        cb(data.result);
      }
    };
    await new Promise((res) => (ws.onopen = res));
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://localhost:5174?p=0.00' });
    
    // Wait for models to load & intro to settle
    await new Promise(r => setTimeout(r, 4000));

    const milestones = [
      { filename: 'timeline_1_welcome_desk.png',      p: 0.00,  label: '1. Welcome scene (blue wireframe computer & DEVESH text)' },
      { filename: 'timeline_2_monitor_reading.png',    p: 0.136, label: '2. Monitor screen fills viewport (bezel at edge matching user image)' },
      { filename: 'timeline_3_stream_blocks_fly.png',  p: 0.155, label: '3. 3D blocks streaming from top & bottom planes (matching reference image)' },
      { filename: 'timeline_4_cascading_stream.png',   p: 0.180, label: '4. Cascading wave with staggered depths & speeds' },
      { filename: 'timeline_5_white_emergence.png',    p: 0.210, label: '5. White background portal emerges from horizon as trailing blocks pass' },
      { filename: 'timeline_6_white_handover.png',     p: 0.240, label: '6. Full-screen pure white, Project 01 JeevaLink unveiled' },
      { filename: 'timeline_7_projects_depth.png',     p: 0.420, label: '7. Existing 3D Projects depth flythrough continuing to ChitGuard' },
    ];

    for (const m of milestones) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          if (window.lenis && window.heroTrigger) {
            const start = window.heroTrigger.start;
            const end = window.heroTrigger.end;
            const targetScroll = start + ${m.p} * (end - start);
            window.lenis.scrollTo(targetScroll, { immediate: true });
          }
          if (window.__setHeroProgress) {
            window.__setHeroProgress(${m.p});
          } else {
            window.heroProgress.set(${m.p});
          }
        })()`,
      });

      // Allow 1.2s for frame render and Lenis settle
      await new Promise(r => setTimeout(r, 1200));

      const debugRes = await send('Runtime.evaluate', {
        expression: 'window.heroProgress ? window.heroProgress.debug : null',
        returnByValue: true
      });

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACT_DIR, m.filename), Buffer.from(shot.data, 'base64'));
      console.log(`Saved ${m.filename} (${m.label}) at p=${m.p}:`, debugRes.result?.value);
    }

  } catch(e) {
    console.error(e);
  } finally {
    chrome.kill();
  }
}
captureTimeline();

