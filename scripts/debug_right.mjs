import { spawn } from 'child_process';
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9305',
  '--no-sandbox',
  '--disable-dev-shm-usage',
]);
await new Promise(r => setTimeout(r, 2000));
const listRes = await fetch('http://127.0.0.1:9305/json/list');
const pages = await listRes.json();
const target = pages.find(p => p.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 1;
function send(m, p = {}) {
  return new Promise(res => {
    const i = id++;
    const cb = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === i) { ws.removeEventListener('message', cb); res(d.result); }
    };
    ws.addEventListener('message', cb);
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });
}
await new Promise(r => ws.onopen = r);
await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: 'http://localhost:5174?p=0.00' });
await new Promise(r => setTimeout(r, 4000));
await send('Runtime.evaluate', { expression: 'window.__setHeroProgress(0.35)' });
await new Promise(r => setTimeout(r, 500));
const res = await send('Runtime.evaluate', {
  expression: `(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all.filter(el => {
      const r = el.getBoundingClientRect();
      return r.left >= 850 && r.width > 50 && r.height > 100;
    }).map(el => ({ tag: el.tagName, id: el.id, cls: el.className, rect: el.getBoundingClientRect(), bg: getComputedStyle(el).backgroundColor }));
  })()`,
  returnByValue: true
});
console.log('DOM elements on the right:', res.result?.value);
chrome.kill();

