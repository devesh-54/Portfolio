import { spawn } from 'node:child_process'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 5173
const CDP_PORT = 9282
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_test_border')

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

    const result = await send('Runtime.evaluate', {
      expression: `(() => {
        window.__applyStage(1800 / 1960);
        const b0 = document.querySelector('.ach-card-slot--0 .ach-card-face--back');
        return {
          borderRight: b0?.style.borderRight,
          cssText: b0?.style.cssText,
          csBorderRight: getComputedStyle(b0).borderRight,
          csBorderRightWidth: getComputedStyle(b0).borderRightWidth
        };
      })()`,
      returnByValue: true
    })

    console.log('Result:', result.result?.value)
    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

