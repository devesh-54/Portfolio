import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';

async function verify() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9300',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9300/json/list');
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
    await send('Page.navigate', { url: 'http://localhost:5174?dev=1&p=0.00' });
    
    // Wait for initial model loads & intro finish
    await new Promise(r => setTimeout(r, 4000));

    const captures = [
      { name: '01_welcome_start.png',            p: 0.02,  label: 'p = 0.02: Welcome scene start (Blue computer + DEVESH text)' },
      { name: '02_monitor_dive_bezel.png',       p: 0.138, label: 'p = 0.138: Dive right at bezel moment (matching 871551bb)' },
      { name: '03_stream_cards_emerge.png',      p: 0.160, label: 'p = 0.160: 3D blocks streaming from top & bottom planes (matching 4a9d0e7b)' },
      { name: '04_stream_cards_cascading.png',   p: 0.185, label: 'p = 0.185: Cascading waves passing camera at staggered depths' },
      { name: '05_white_portal_emergence.png',    p: 0.215, label: 'p = 0.215: White background portal emerging at center horizon as trailing blocks move' },
      { name: '06_projects_handover_white.png',   p: 0.240, label: 'p = 0.240: 100% Full-screen pure white, Project 01 JeevaLink unveiled' },
      { name: '07_projects_depth_flight.png',     p: 0.350, label: 'p = 0.350: Continuing existing 3D Projects depth flythrough' },
    ];

    for (const cap of captures) {
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          if (window.__setHeroProgress) {
            window.__setHeroProgress(${cap.p});
          } else {
            window.heroProgress.set(${cap.p});
          }
          return window.heroProgress.debug;
        })()`,
        returnByValue: true
      });
      await new Promise(r => setTimeout(r, 700));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(ARTIFACT_DIR, cap.name), Buffer.from(shot.data, 'base64'));
      console.log(`Captured ${cap.name} (${cap.label}):`, res.result?.value);
    }

  } catch(e) {
    console.error(e);
  } finally {
    chrome.kill();
  }
}
verify();
