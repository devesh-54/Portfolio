import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';

async function testDive() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9297',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9297/json/list');
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
    await send('Page.navigate', { url: 'http://localhost:5174?dev=1' });
    await new Promise(r => setTimeout(r, 3500));

    const handover = 80 / 480;
    const uVals = [0.75, 0.80, 0.83, 0.86, 0.89, 0.92, 0.95];
    for (const u of uVals) {
      const p = u * handover;
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          window.heroProgress.set(${p});
          return window.heroProgress.debug;
        })()`,
        returnByValue: true
      });
      await new Promise(r => setTimeout(r, 500));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACT_DIR, `dive_u_${u.toFixed(2)}.png`), Buffer.from(shot.data, 'base64'));
      console.log(`Captured dive_u_${u.toFixed(2)}.png (p=${p.toFixed(4)}):`, res.result?.value);
    }
  } catch(e) {
    console.error(e);
  } finally {
    chrome.kill();
  }
}
testDive();

