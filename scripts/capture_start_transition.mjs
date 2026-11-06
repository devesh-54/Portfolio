import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc';

async function capture() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9316',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9316/json/list');
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
    await send('Page.navigate', { url: 'http://localhost:5174/' });
    await new Promise(r => setTimeout(r, 4500));

    const testP = [0.125, 0.128, 0.132, 0.136, 0.145, 0.160, 0.180];
    for (const pVal of testP) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          if (window.lenis && window.heroTrigger) {
            const start = window.heroTrigger.start;
            const end = window.heroTrigger.end;
            const targetScroll = start + ${pVal} * (end - start);
            window.lenis.scrollTo(targetScroll, { immediate: true });
          }
          if (window.__setHeroProgress) {
            window.__setHeroProgress(${pVal});
          } else if (window.heroProgress) {
            window.heroProgress.set(${pVal});
          }
        })()`,
      });

      await new Promise(r => setTimeout(r, 800));

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const name = `new_start_p_${pVal.toFixed(3)}.png`;
      fs.writeFileSync(path.join(ARTIFACT_DIR, name), Buffer.from(shot.data, 'base64'));
      console.log(`Saved ${name}`);
    }

  } catch(e) {
    console.error(e);
  } finally {
    chrome.kill();
  }
}
capture();
