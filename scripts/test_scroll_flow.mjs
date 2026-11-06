import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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
    await new Promise(r => setTimeout(r, 2500));

    // Inspect triggers
    const triggerReport = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ST = window.ScrollTrigger;
          const all = ST.getAll();
          return all.map(t => ({
            id: t.trigger?.id,
            start: Math.round(t.start),
            end: Math.round(t.end),
            spacerOffsetTop: t.spacer ? Math.round(t.spacer.offsetTop) : null,
          }));
        })()
      `,
      returnByValue: true,
    });
    console.log('=== Active ScrollTriggers ===');
    console.log(JSON.stringify(triggerReport.result.value, null, 2));

    const checkPoints = [
      { name: 'Top (Hero)', pos: 0 },
      { name: 'Card Flight Mid', pos: 2500 },
      { name: 'Flight End / Stage Start', pos: 5200 },
      { name: 'Trans 0 Scan Mid', pos: 5600 },
      { name: 'Hold 1 (About)', pos: 6300 },
      { name: 'Trans 1 Burst Mid', pos: 7100 },
      { name: 'Hold 2 (Skills)', pos: 7800 },
      { name: 'Trans 2 Scan RTL Mid', pos: 8500 },
      { name: 'Hold 3 (Contact)', pos: 9200 },
    ];

    console.log('\n=== Forward Scroll Progression ===');
    for (const pt of checkPoints) {
      const state = await send('Runtime.evaluate', {
        expression: `
          (() => {
            window.lenis.scrollTo(${pt.pos}, { immediate: true });
            window.ScrollTrigger.update();
            const header = document.getElementById('site-header');
            const about = document.getElementById('about');
            const skills = document.getElementById('skills');
            const contact = document.getElementById('contact');
            const crisp = document.querySelector('.ps-crisp');
            return {
              scroll: Math.round(window.lenis.scroll),
              headerTheme: header?.getAttribute('data-theme'),
              crispOpacity: crisp ? crisp.style.opacity : null,
              aboutVis: about?.style.visibility,
              skillsVis: skills?.style.visibility,
              contactVis: contact?.style.visibility,
            };
          })()
        `,
        returnByValue: true,
      });
      console.log(`[${pt.name}] pos=${pt.pos} -> actual scroll=${state.result.value.scroll}, theme=${state.result.value.headerTheme}, crispOp=${state.result.value.crispOpacity}`);
    }

    console.log('\n=== Reverse Scroll Progression ===');
    const reversePoints = [...checkPoints].reverse();
    for (const pt of reversePoints) {
      const state = await send('Runtime.evaluate', {
        expression: `
          (() => {
            window.lenis.scrollTo(${pt.pos}, { immediate: true });
            window.ScrollTrigger.update();
            const header = document.getElementById('site-header');
            return {
              scroll: Math.round(window.lenis.scroll),
              headerTheme: header?.getAttribute('data-theme'),
            };
          })()
        `,
        returnByValue: true,
      });
      console.log(`[Reverse to ${pt.name}] actual scroll=${state.result.value.scroll}, theme=${state.result.value.headerTheme}`);
    }

    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
