import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9298
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_top_line_test')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1440,900',
    'about:blank',
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

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    await send('Page.navigate', { url: 'http://localhost:5174/' })
    await sleep(2500)

    // Scroll to projects browsing state (s ~ 1255)
    await send('Runtime.evaluate', {
      expression: `window.__portfolioSetScrollProgress ? window.__portfolioSetScrollProgress(1255) : window.scrollTo(0, 1255 * (document.body.scrollHeight - window.innerHeight) / 2010)`,
    })
    await sleep(600)

    let snap = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_proj_top_line_browsing.png'), Buffer.from(snap.data, 'base64'))
    console.log('Saved qa_proj_top_line_browsing.png')

    // Scroll to stream state
    await send('Runtime.evaluate', {
      expression: `window.__portfolioSetScrollProgress ? window.__portfolioSetScrollProgress(1443) : window.scrollTo(0, 1443 * (document.body.scrollHeight - window.innerHeight) / 2010)`,
    })
    await sleep(600)

    snap = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_proj_top_line_stream.png'), Buffer.from(snap.data, 'base64'))
    console.log('Saved qa_proj_top_line_stream.png')

    ws.close()
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run().catch(console.error)

