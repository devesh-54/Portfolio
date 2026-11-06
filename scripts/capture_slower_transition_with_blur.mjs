import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc';

async function capture() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9310',
    '--use-gl=angle',
    '--window-size=1280,800',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ]);
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9310/json/list');
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
      { name: 'slow_01_open_horizon_p0160.png', p: 0.160, label: 'p = 0.160: Slower stream, center white box removed, open horizon' },
      { name: 'slow_02_corridor_stream_p0220.png', p: 0.220, label: 'p = 0.220: Floor & ceiling plates cascading smoothly' },
      { name: 'slow_03_multi_blocks_appear_p0270.png', p: 0.270, label: 'p = 0.270: Multiple white blocks appear across field' },
      { name: 'slow_04_blocks_cover_screen_p0290.png', p: 0.290, label: 'p = 0.290: Multiple white blocks rushing and covering screen fully' },
      { name: 'slow_05_soft_blur_emergence_p0300.png', p: 0.300, label: 'p = 0.300: White screen full, projects emerge with soft blur' },
      { name: 'slow_06_project01_focused_p0330.png', p: 0.330, label: 'p = 0.330: Project 01 comes close, blur dissolves to crisp focus' },
      { name: 'slow_07_projects_continue_p0420.png', p: 0.420, label: 'p = 0.420: Projects continue smoothly as is' },
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
