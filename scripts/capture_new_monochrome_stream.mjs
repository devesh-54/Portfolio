import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';

async function capture() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9308',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9308/json/list');
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

    const milestones = [
      { name: 'mono_stream_01_p0145.png', p: 0.145, label: 'p = 0.145: Horizontal plates emerging on floor & ceiling' },
      { name: 'mono_stream_02_p0165.png', p: 0.165, label: 'p = 0.165: Perspective corridor with glowing slit at horizon' },
      { name: 'mono_stream_03_p0190.png', p: 0.190, label: 'p = 0.190: Cascading plates, expanding window of light' },
      { name: 'mono_stream_04_p0220.png', p: 0.220, label: 'p = 0.220: Large white window flooding the frame' },
      { name: 'mono_stream_05_p0240.png', p: 0.240, label: 'p = 0.240: 100% Full-screen pure white, Project 01 unveiled' },
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

