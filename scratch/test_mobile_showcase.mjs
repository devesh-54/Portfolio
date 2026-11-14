import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9298
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_mobile_showcase')

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

    console.log('Navigating to http://localhost:5174/#projects...')
    await send('Page.navigate', { url: 'http://localhost:5174/#projects' })
    await sleep(3000)

    console.log('Opening JeevaLink (Mobile App #1)...')
    await send('Runtime.evaluate', {
      expression: `
        const cards = Array.from(document.querySelectorAll('.pe-card'));
        const jCard = cards.find(c => c.textContent.includes('JeevaLink'));
        if (jCard) jCard.click();
      `,
    })
    await sleep(1500)
    await capture('qa_mobile_jeevalink.png')

    console.log('Navigating to SafeChit (Mobile App #2) via next project button...')
    await send('Runtime.evaluate', {
      expression: `
        const nextBtn = document.querySelector('.detail-proj-btn--next');
        if (nextBtn) nextBtn.click();
      `,
    })
    await sleep(1500)
    await capture('qa_mobile_safechit_slide1.png')

    console.log('Clicking slide 2 in SafeChit carousel...')
    await send('Runtime.evaluate', {
      expression: `
        const dots = Array.from(document.querySelectorAll('.detail-carousel-dot'));
        if (dots[1]) dots[1].click();
      `,
    })
    await sleep(800)
    await capture('qa_mobile_safechit_slide2.png')

    console.log('Navigating to DR Detection (Web App) to verify web layout preserved...')
    await send('Runtime.evaluate', {
      expression: `
        const nextBtn = document.querySelector('.detail-proj-btn--next');
        if (nextBtn) nextBtn.click();
      `,
    })
    await sleep(1500)
    await capture('qa_web_preserved_check.png')

    console.log('All done successfully!')
    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch((e) => {
  console.error('Test run failed:', e)
  process.exit(1)
})

