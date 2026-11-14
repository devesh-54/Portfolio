import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9297
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_detail_test3')

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

    async function capture(filename) {
      const shot = await send('Page.captureScreenshot', { format: 'png' })
      const buffer = Buffer.from(shot.data, 'base64')
      const outPath = path.join(ARTIFACTS_DIR, filename)
      fs.writeFileSync(outPath, buffer)
      console.log(`Saved screenshot: ${outPath}`)
    }

    console.log('Loading page...')
    await send('Page.navigate', { url: 'http://localhost:5174/' })
    await sleep(4000)

    // Open HireConnect
    console.log('Opening HireConnect modal...')
    await send('Runtime.evaluate', {
      expression: `new Promise(r => {
        const check = () => {
          if (typeof window.openProject === 'function') {
            window.openProject('hireconnect');
            r();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      })`,
      awaitPromise: true,
    })
    await sleep(2000)
    await capture('qa_dashboard_hireconnect.png')

    // Close
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.detail-back-btn')?.click()`,
    })
    await sleep(1000)

    // Open SafeChit
    console.log('Opening SafeChit modal...')
    await send('Runtime.evaluate', {
      expression: `window.openProject('safechit')`,
    })
    await sleep(2000)
    await capture('qa_dashboard_safechit.png')

    // Close
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.detail-back-btn')?.click()`,
    })
    await sleep(1000)

    // Open DR Detection
    console.log('Opening DR Detection modal...')
    await send('Runtime.evaluate', {
      expression: `window.openProject('dr-detection')`,
    })
    await sleep(2000)
    await capture('qa_dashboard_dr_detection.png')

    // Close
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.detail-back-btn')?.click()`,
    })
    await sleep(1000)

    // Open CashPilot
    console.log('Opening CashPilot modal...')
    await send('Runtime.evaluate', {
      expression: `window.openProject('cashpilot')`,
    })
    await sleep(2000)
    await capture('qa_dashboard_cashpilot.png')

    console.log('Done!')
    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch((e) => {
  console.error('Test run failed:', e)
  process.exit(1)
})
