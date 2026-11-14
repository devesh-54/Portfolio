import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9293
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_qa_wipe')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    'http://localhost:5173/#achievements',
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

    // Set viewport to 1440x900
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    await sleep(2000)

    // Ensure stage helper is loaded
    await send('Runtime.evaluate', {
      expression: `(() => {
        return typeof window.__applyStage === 'function';
      })()`,
      returnByValue: true,
    })

    // STAGE_SEGMENTS from stageConfig:
    // CONTACT_TRANS_START_VH: 1780
    // CONTACT_TRANS_END_VH: 1910
    // STAGE_TOTAL_VH: 2010
    // s_contact(P) = (1780 + P * (1910 - 1780)) / 2010
    const startVH = 1780
    const endVH = 1910
    const totalVH = 2010

    const getStageS = (pContact) => {
      const vh = startVH + pContact * (endVH - startVH)
      return vh / totalVH
    }

    const checkpoints = [
      { name: 'wipe_qa_01_cards_joining', pContact: 0.20, desc: 'Achievements cards joining flush into dark box' },
      { name: 'wipe_qa_02_box_dissolving', pContact: 0.45, desc: 'Elevation shadow & dark box dissolving into black page' },
      { name: 'wipe_qa_03_dark_void', pContact: 0.58, desc: 'Box completely gone, clean dark page' },
      { name: 'wipe_qa_04_scattered_blocks', pContact: 0.63, desc: 'Phase 1: Small scattered electric-purple square blocks' },
      { name: 'wipe_qa_05_pixel_expansion', pContact: 0.70, desc: 'Phase 2: Progressive block expansion & connected mosaic' },
      { name: 'wipe_qa_06_full_coverage_solid', pContact: 0.80, desc: 'Phase 3: 100% solid electric-purple screen hold' },
      { name: 'wipe_qa_07_reveal_underneath', pContact: 0.88, desc: 'Phase 4: Purple blocks retracting to reveal Contact section' },
      { name: 'wipe_qa_08_reveal_late', pContact: 0.94, desc: 'Phase 4 late: Most of Contact revealed through pixel holes' },
      { name: 'wipe_qa_09_contact_settled', pContact: 1.00, desc: 'Transition complete: Contact fully uncovered & interactive' },
      { name: 'wipe_qa_10_reverse_scroll', pContact: 0.70, desc: 'Reverse scrub: cleanly renders back to mosaic state' },
    ]

    for (const cp of checkpoints) {
      const s = getStageS(cp.pContact)
      await send('Runtime.evaluate', {
        expression: `(() => {
          window.__applyStage(${s});
          return {
            pContact: ${cp.pContact},
            s: ${s},
            blockWipeVis: document.querySelector('.ps-block-wipe-canvas')?.style.visibility,
            blockWipeDisp: document.querySelector('.ps-block-wipe-canvas')?.style.display,
            contactVis: document.querySelector('#contact')?.style.visibility,
            contactOp: document.querySelector('#contact')?.style.opacity
          };
        })()`,
        returnByValue: true,
      })

      await sleep(350)

      const shot = await send('Page.captureScreenshot', { format: 'png' })
      const buf = Buffer.from(shot.data, 'base64')
      const outPath = path.join(ARTIFACTS_DIR, `${cp.name}.png`)
      fs.writeFileSync(outPath, buf)
      console.log(`Captured ${cp.name}.png (${cp.desc})`)
    }

    console.log('All QA screenshots captured successfully!')
    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

