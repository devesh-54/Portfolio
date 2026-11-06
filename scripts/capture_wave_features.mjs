import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';

async function run() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9298',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch('http://127.0.0.1:9298/json/list');
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

    // 1. Pixel Wave sweeping from Left to Right (at p = 0.138, middle of transition)
    // Left side is white, middle is dark pixel wave, right side is Welcome room!
    console.log('Milestone 1: Pixel Wave sweeping left-to-right (revealing white)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const heroTr = window.ScrollTrigger.getAll().find(t => t.trigger?.id === 'hero');
          const target = heroTr.start + (heroTr.end - heroTr.start) * 0.137931;
          window.lenis.scrollTo(target, { immediate: true });
          window.ScrollTrigger.update();
        })()
      `,
    });
    await new Promise(r => setTimeout(r, 600));
    await capture('pixel_wave_left_to_right.png');

    // 2. White Background in Projects with 3D card field (at flightP = 0.18)
    console.log('Milestone 2: White Background Projects 3D Corridor...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const handover = 80 / 580;
          const p = handover + 0.18 * (1 - handover);
          const heroTr = window.ScrollTrigger.getAll().find(t => t.trigger?.id === 'hero');
          const target = heroTr.start + (heroTr.end - heroTr.start) * p;
          window.lenis.scrollTo(target, { immediate: true });
          window.ScrollTrigger.update();
        })()
      `,
    });
    await new Promise(r => setTimeout(r, 1200));
    await capture('projects_white_background.png');

    // 3. Card Pixel Wave Sweeping across Card Surface (JeevaLink approaching at flightP = 0.24)
    console.log('Milestone 3: Pixel Wave sweeping across card surface...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const handover = 80 / 580;
          const p = handover + 0.24 * (1 - handover);
          const heroTr = window.ScrollTrigger.getAll().find(t => t.trigger?.id === 'hero');
          const target = heroTr.start + (heroTr.end - heroTr.start) * p;
          window.lenis.scrollTo(target, { immediate: true });
          window.ScrollTrigger.update();
        })()
      `,
    });
    await new Promise(r => setTimeout(r, 1200));
    await capture('card_pixel_wave_mid.png');

    // 4. Completed Project Card at Focus Crest (JeevaLink at flightP = 0.35)
    console.log('Milestone 4: Completed Card Picture at Focus Crest...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const handover = 80 / 580;
          const p = handover + 0.35 * (1 - handover);
          const heroTr = window.ScrollTrigger.getAll().find(t => t.trigger?.id === 'hero');
          const target = heroTr.start + (heroTr.end - heroTr.start) * p;
          window.lenis.scrollTo(target, { immediate: true });
          window.ScrollTrigger.update();
        })()
      `,
    });
    await new Promise(r => setTimeout(r, 1200));
    await capture('card_pixel_wave_complete.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
