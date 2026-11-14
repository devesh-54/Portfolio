import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9290
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_compare_left')

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
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })

    let id = 1
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++
        const handler = (event) => {
          const d = JSON.parse(event.data)
          if (d.id === msgId) {
            ws.removeEventListener('message', handler)
            resolve(d.result)
          }
        }
        ws.addEventListener('message', handler)
        ws.send(JSON.stringify({ id: msgId, method, params }))
      })
    }

    await send('Page.enable')
    await send('Runtime.enable')

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    await send('Page.navigate', { url: 'http://localhost:5174/#projects' })
    await sleep(2800)

    // Option 1: dx = 0px, dy = 26px
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('.pe-header-left');
          if (el) el.style.transform = 'translate(0px, 26px)';
        })()
      `,
    })
    await sleep(300)
    let snap = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_left_compare_dx0.png'), Buffer.from(snap.data, 'base64'))

    // Option 2: dx = -50px, dy = 26px
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('.pe-header-left');
          if (el) el.style.transform = 'translate(-50px, 26px)';
        })()
      `,
    })
    await sleep(300)
    snap = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_left_compare_dxMinus50.png'), Buffer.from(snap.data, 'base64'))

    // Option 3: dx = -100px, dy = 26px (flush left with stage padding / orange stroke start)
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('.pe-header-left');
          if (el) el.style.transform = 'translate(-100px, 26px)';
        })()
      `,
    })
    await sleep(300)
    snap = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_left_compare_dxMinus100.png'), Buffer.from(snap.data, 'base64'))

    ws.close()
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run().catch(console.error)

