import { spawn } from 'node:child_process'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 5173
const CDP_PORT = 9283
const USER_DATA_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc\\scratch\\chrome_inspect_spot'

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1440,900',
    `http://localhost:${PORT}/`,
  ])

  try {
    await sleep(2000)
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`)
    const list = await res.json()
    const page = list.find((t) => t.type === 'page')
    const ws = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
    let id = 1
    const send = (m, p = {}) => new Promise((resolve, reject) => {
      const cur = id++
      const handler = (evt) => {
        const msg = JSON.parse(evt.data)
        if (msg.id === cur) { ws.removeEventListener('message', handler); resolve(msg.result) }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({ id: cur, method: m, params: p }))
    })

    await send('Page.enable')
    await send('Runtime.enable')
    await send('Runtime.evaluate', { expression: `try { sessionStorage.setItem('welcomeIntroPlayed', 'true'); } catch(e){}` })
    await send('Page.navigate', { url: `http://localhost:${PORT}/` })
    await sleep(2000)

    const inspectResult = await send('Runtime.evaluate', {
      expression: `(() => {
        window.__applyStage(1820 / 1960);
        const backs = document.querySelectorAll('.ach-card-face--back');
        const results = [];
        backs.forEach((b, i) => {
          const cs = getComputedStyle(b);
          const before = getComputedStyle(b, '::before');
          const after = getComputedStyle(b, '::after');
          const children = Array.from(b.children).map(c => ({
            tag: c.tagName,
            class: c.className,
            opacity: getComputedStyle(c).opacity,
            bg: getComputedStyle(c).background,
            display: getComputedStyle(c).display,
            visibility: getComputedStyle(c).visibility
          }));
          results.push({
            card: i,
            bg: cs.backgroundColor,
            bgImage: cs.backgroundImage,
            boxShadow: cs.boxShadow,
            filter: cs.filter,
            beforeContent: before.content,
            beforeBg: before.backgroundImage,
            afterContent: after.content,
            afterBg: after.backgroundImage,
            children
          });
        });
        // Also check .ach-card-inner-3d and .ach-card-slot and .ach-3d-stage
        const stage3d = document.querySelector('.ach-3d-stage');
        const spotlightCount = document.querySelectorAll('.ach-card-spotlight').length;
        return {
          spotlightCount,
          stage3dBg: getComputedStyle(stage3d).backgroundImage,
          stage3dBoxShadow: getComputedStyle(stage3d).boxShadow,
          cards: results
        };
      })()`,
      returnByValue: true
    })

    console.log(JSON.stringify(inspectResult.result?.value, null, 2))
    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)
