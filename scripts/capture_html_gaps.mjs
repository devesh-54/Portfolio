import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';

async function run() {
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
    if (!target) throw new Error('No page target found');

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
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Navigating to http://localhost:5174/?p=0 ...');
    await send('Page.navigate', { url: 'http://localhost:5174/?p=0' });
    await new Promise(r => setTimeout(r, 3500));

    async function capture(filename) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');
      fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buf);
      console.log(`Saved screenshot: ${filename} (size: ${buf.length} bytes)`);
    }

    // 1. Initial flight view (Project 01 - JeevaLink)
    console.log('Capture 1: Project 01 approach (flightP = 0.02)...');
    await send('Runtime.evaluate', {
      expression: 'window.__setFlightProgress(0.02)',
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('html_gaps_proj01.png');

    // 2. Project 02 approach (flightP = 0.15)
    console.log('Capture 2: Project 02 approach (flightP = 0.15)...');
    await send('Runtime.evaluate', {
      expression: 'window.__setFlightProgress(0.15)',
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('html_gaps_proj02.png');

    // 3. Project 03 approach (flightP = 0.28)
    console.log('Capture 3: Project 03 approach (flightP = 0.28)...');
    await send('Runtime.evaluate', {
      expression: 'window.__setFlightProgress(0.28)',
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('html_gaps_proj03.png');

  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    chrome.kill();
  }
}

run();

