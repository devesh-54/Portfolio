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
    await new Promise(r => setTimeout(r, 3000));

    async function capture(filename) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');
      fs.writeFileSync(path.join(ARTIFACT_DIR, filename), buf);
      console.log(`Saved screenshot: ${filename} (size: ${buf.length} bytes)`);
    }

    // 1. Peak Handover Pixelate Mosaic (p = 0.230769 -> scroll = 5200 * 0.230769 = 1200)
    console.log('Testing Milestone 1: Welcome -> Projects Pixelate Mosaic Peak...');
    const r1 = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const heroTr = window.ScrollTrigger.getAll().find(t => t.trigger?.id === 'hero');
          const target = heroTr.start + (heroTr.end - heroTr.start) * 0.230769;
          window.lenis.scrollTo(target, { immediate: true });
          window.ScrollTrigger.update();
          const crisp = document.getElementById('pixelate-crisp-canvas');
          return {
            scroll: window.lenis.scroll,
            crispDisplay: crisp?.style.display,
            crispOpacity: crisp?.style.opacity,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Milestone 1 state:', r1.result.value);
    await new Promise(r => setTimeout(r, 300));
    await capture('pixelate_trans_peak.png');

    // 2. Card in distant coarse pixel state (JeevaLink at flightP = 0.15)
    console.log('Testing Milestone 2: Distant Card Coarse Pixel Assembly...');
    const r2 = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const handover = 150 / 650;
          const p = handover + 0.15 * (1 - handover);
          const heroTr = window.ScrollTrigger.getAll().find(t => t.trigger?.id === 'hero');
          const target = heroTr.start + (heroTr.end - heroTr.start) * p;
          window.lenis.scrollTo(target, { immediate: true });
          window.ScrollTrigger.update();
          return {
            scroll: window.lenis.scroll,
            heroProgress: window.heroProgress?.get(),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Milestone 2 state:', r2.result.value);
    await new Promise(r => setTimeout(r, 300));
    await capture('card_pixel_distant.png');

    // 3. Card in mid-resolution pixel assembly (JeevaLink at flightP = 0.26)
    console.log('Testing Milestone 3: Approaching Card Pixel Decode (mid-res)...');
    const r3 = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const handover = 150 / 650;
          const p = handover + 0.26 * (1 - handover);
          const heroTr = window.ScrollTrigger.getAll().find(t => t.trigger?.id === 'hero');
          const target = heroTr.start + (heroTr.end - heroTr.start) * p;
          window.lenis.scrollTo(target, { immediate: true });
          window.ScrollTrigger.update();
          return {
            scroll: window.lenis.scroll,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Milestone 3 state:', r3.result.value);
    await new Promise(r => setTimeout(r, 300));
    await capture('card_pixel_mid_res.png');

    // 4. Card at crisp focus crest (JeevaLink at flightP = 0.35)
    console.log('Testing Milestone 4: Card at Crisp Focus Crest...');
    const r4 = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const handover = 150 / 650;
          const p = handover + 0.35 * (1 - handover);
          const heroTr = window.ScrollTrigger.getAll().find(t => t.trigger?.id === 'hero');
          const target = heroTr.start + (heroTr.end - heroTr.start) * p;
          window.lenis.scrollTo(target, { immediate: true });
          window.ScrollTrigger.update();
          return {
            scroll: window.lenis.scroll,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Milestone 4 state:', r4.result.value);
    await new Promise(r => setTimeout(r, 300));
    await capture('card_pixel_crisp_crest.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
