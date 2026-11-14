import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9294
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_title_move_test')

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

    await send('Page.navigate', { url: 'http://localhost:5174/' })
    await sleep(2500)

    // Scroll to projects browsing state (s ~ 1255)
    await send('Runtime.evaluate', {
      expression: `window.__portfolioSetScrollProgress ? window.__portfolioSetScrollProgress(1255) : window.scrollTo(0, 1255 * (document.body.scrollHeight - window.innerHeight) / 2010)`,
    })
    await sleep(600)

    // Baseline
    let snap = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_title_move_baseline.png'), Buffer.from(snap.data, 'base64'))

    // Test Move 1: dx = 28px, dy = 18px
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('.pe-header-left');
          if (el) el.style.transform = 'translate(28px, 18px)';
        })()
      `,
    })
    await sleep(300)
    snap = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_title_move_opt1.png'), Buffer.from(snap.data, 'base64'))

    // Test Move 2: dx = 48px, dy = 28px
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('.pe-header-left');
          if (el) el.style.transform = 'translate(48px, 28px)';
        })()
      `,
    })
    await sleep(300)
    snap = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_title_move_opt2.png'), Buffer.from(snap.data, 'base64'))

    ws.close()
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run().catch(console.error)

