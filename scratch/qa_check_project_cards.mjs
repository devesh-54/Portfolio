import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9295
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_qa_proj_cards')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    'http://localhost:5173/#projects',
  ])

  try {
    await sleep(2500)
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

    await sleep(2000)

    // STAGE_SEGMENTS: PROJECTS_HOLD_VH: 1260, STAGE_TOTAL_VH: 2010 -> s = 1260 / 2010 = 0.6268
    const sProjects = 1260 / 2010
    await send('Runtime.evaluate', {
      expression: `(() => {
        window.__applyStage(${sProjects});
      })()`,
    })

    await sleep(800)

    // Capture resting view
    const shot1 = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_projects_new_cards_stage.png'), Buffer.from(shot1.data, 'base64'))
    console.log('Saved qa_projects_new_cards_stage.png')

    // Find first card bounding box and hover over it
    const cardBox = await send('Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('.pe-card');
        if (!card) return null;
        const r = card.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width, height: r.height };
      })()`,
      returnByValue: true
    })

    if (cardBox.result?.value) {
      const { x, y } = cardBox.result.value
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
      await sleep(400)
      const shot2 = await send('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_projects_card_hover.png'), Buffer.from(shot2.data, 'base64'))
      console.log('Saved qa_projects_card_hover.png')
    }

    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

