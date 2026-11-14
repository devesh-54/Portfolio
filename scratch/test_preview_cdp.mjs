import { spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const BASE_URL = 'http://localhost:4173';

async function main() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=' + process.cwd() + '/scratch/chrome_profile',
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch(`http://localhost:${PORT}/json/list`);
    const tabs = await listRes.json();
    const wsUrl = tabs[0]?.webSocketDebuggerUrl;
    if (!wsUrl) throw new Error('No tab websocket found');

    const ws = new WebSocket(wsUrl);
    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg.result, msg.error);
        callbacks.delete(msg.id);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, (res, err) => {
          if (err) reject(err);
          else resolve(res);
        });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await new Promise(r => ws.onopen = r);

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('=== TESTING ROUTES ===');
    const routes = [
      '/', '/#about', '/#skills', '/#hackathons', '/#projects', '/#achievements', '/#contact',
      '/about', '/skills', '/hackathons', '/achievements', '/contact', '/projects', '/unknown-404'
    ];

    for (const r of routes) {
      const url = BASE_URL + r;
      await send('Page.navigate', { url });
      await new Promise(res => setTimeout(res, 800));
      const evalRes = await send('Runtime.evaluate', { expression: 'window.location.href' });
      console.log(`Route ${r.padEnd(20)} -> Landed on: ${evalRes.result.value}`);
    }

    console.log('\n=== TESTING VIEWPORT OVERFLOW ===');
    const viewports = [
      { name: '1080p Desktop', w: 1920, h: 1080 },
      { name: 'Laptop', w: 1366, h: 768 },
      { name: 'Mobile', w: 390, h: 844 }
    ];

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: vp.w < 600
      });
      await send('Page.navigate', { url: BASE_URL + '/' });
      await new Promise(res => setTimeout(res, 1200));

      const overflowRes = await send('Runtime.evaluate', {
        expression: `({
          docW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
          bodyW: document.body.scrollWidth,
          hasHScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
        })`,
        returnByValue: true
      });
      const v = overflowRes.result.value;
      console.log(`Viewport ${vp.name.padEnd(16)} (${vp.w}x${vp.h}): H-Scroll = ${v.hasHScroll ? 'FAIL (Overflow)' : 'PASS (Clean)'} (scrollWidth=${v.docW}, clientWidth=${v.clientW})`);
    }

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

main().catch(console.error);

