import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';

async function capture() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9312',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9312/json/list');
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
    // Navigate without p= query param so intro ended and scroll progress work cleanly
    await send('Page.navigate', { url: 'http://localhost:5174/' });
    await new Promise(r => setTimeout(r, 4500));

    const milestones = [
      { name: 'verify_01_corridor_plates_p0220.png', p: 0.220, label: 'p = 0.220: Perspective corridor, top & bottom plates streaming, open black center horizon' },
      { name: 'verify_02_center_blocks_appear_p0270.png', p: 0.270, label: 'p = 0.270: Multiple white blocks rushing from top and bottom' },
      { name: 'verify_03_slit_wiped_by_blocks_p0282.png', p: 0.282, label: 'p = 0.282: Center blocks (yellow marks) rush along horizontal black slit, wiping it' },
      { name: 'verify_04_full_white_screen_p0292.png', p: 0.292, label: 'p = 0.292: Screen blanketed in pure white by blocks, Project 01 softly emerging with blur' },
      { name: 'verify_05_handover_clean_form_p0296.png', p: 0.296, label: 'p = 0.296: Handover point: Project 01 in crisp clean form, distant cards blurred' },
      { name: 'verify_06_flight_individual_blur_p0350.png', p: 0.350, label: 'p = 0.350: Flight forward: Project 01 active, Project 02 behind retains distance blur' },
      { name: 'verify_07_project02_focuses_p0420.png', p: 0.420, label: 'p = 0.420: Approach Project 02: blur clears individually as it gets close, Project 03 blurred' },
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
          } else if (window.heroProgress) {
            window.heroProgress.set(${m.p});
          }
        })()`,
      });

      await new Promise(r => setTimeout(r, 1200));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACT_DIR, m.name), Buffer.from(shot.data, 'base64'));
      console.log(`Saved ${m.name} (${m.label})`);
    }

  } catch(e) {
    console.error(e);
  } finally {
    chrome.kill();
  }
}
capture();
