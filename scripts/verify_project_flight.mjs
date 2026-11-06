import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';

async function capture() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9309',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9309/json/list');
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
    await new Promise(r => setTimeout(r, 4000));

    const steps = [
      { name: 'proj_flight_01_p0280.png', p: 0.280, label: 'p = 0.280: Project 01 JeevaLink approaching camera' },
      { name: 'proj_flight_02_p0380.png', p: 0.380, label: 'p = 0.380: Project 02 ChitGuard approaching camera' },
      { name: 'proj_flight_03_p0500.png', p: 0.500, label: 'p = 0.500: Project 03 DR Detection approaching camera' },
    ];

    for (const step of steps) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          if (window.lenis && window.heroTrigger) {
            const start = window.heroTrigger.start;
            const end = window.heroTrigger.end;
            const targetScroll = start + ${step.p} * (end - start);
            window.lenis.scrollTo(targetScroll, { immediate: true });
          }
          if (window.__setHeroProgress) {
            window.__setHeroProgress(${step.p});
          } else {
            window.heroProgress.set(${step.p});
          }
        })()`,
      });

      await new Promise(r => setTimeout(r, 1200));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACT_DIR, step.name), Buffer.from(shot.data, 'base64'));
      console.log(`Saved ${step.name} (${step.label})`);
    }

  } catch(e) {
    console.error(e);
  } finally {
    chrome.kill();
  }
}
capture();
