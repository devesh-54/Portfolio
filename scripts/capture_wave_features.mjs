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

    // 1. Pixel Wave sweeping from Left to Right (at p = 0.07, middle of handover transition)
    // Left side is white, middle is chunky square pixel wave, right side is Welcome room!
    console.log('Milestone 1: Pixel Wave sweeping left-to-right (revealing white)...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          window.heroProgress.set(0.07);
          const heroTr = window.ScrollTrigger.getAll().find(t => t.trigger?.id === 'hero');
          if (heroTr) {
            const target = heroTr.start + (heroTr.end - heroTr.start) * 0.07;
            window.scrollTo(0, target);
            if (window.lenis) window.lenis.scrollTo(target, { immediate: true });
          }
        })()
      `,
    });
    await new Promise(r => setTimeout(r, 800));
    await capture('pixel_wave_left_to_right.png');

    // 2. Floating 3D Sofa Layout overview (at flightP = 0.00)
    console.log('Milestone 2: Floating 3D Sofa Layout overview...');
    await send('Runtime.evaluate', {
      expression: 'window.__setFlightProgress(0.00)',
    });
    await new Promise(r => setTimeout(r, 1200));
    await capture('sofa_floating_layout.png');

    // 3. Mid Flight: flying through sofa projects (at flightP = 0.45)
    console.log('Milestone 3: Flying through sofa projects...');
    await send('Runtime.evaluate', {
      expression: 'window.__setFlightProgress(0.45)',
    });
    await new Promise(r => setTimeout(r, 1000));
    await capture('sofa_mid_flight.png');

    // 4. End Flight: small space after last project, ending page (at flightP = 0.95)
    console.log('Milestone 4: Small space after last project, ending page...');
    await send('Runtime.evaluate', {
      expression: 'window.__setFlightProgress(0.95)',
    });
    await new Promise(r => setTimeout(r, 1000));
    await capture('sofa_end_flight.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
