import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9298
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_qa_split')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

const STAGE_TOTAL_VH = 2010

const testPoints = [
  { vh: 158, name: '1_about_settled.png', desc: 'About Settled View' },
  { vh: 198, name: '2_about_particles_reverse_out.png', desc: 'About Disintegrating to Right' },
  { vh: 220, name: '3_black_void_screen.png', desc: 'Pure Black Void Screen' },
  { vh: 238, name: '4_white_sweep_entering.png', desc: 'White Sweep from Left to Center' },
  { vh: 265, name: '5_half_white_half_black_hold.png', desc: '50/50 Split Hold (Title on White Only)' },
  { vh: 290, name: '6_center_line_inclined.png', desc: 'Center Line Incline Tilt' },
  { vh: 325, name: '7_inclined_line_sweep_right.png', desc: 'Inclined Line Sweeping Right' },
  { vh: 345, name: '8_full_white_title_centered.png', desc: '100% White, Title Centered' },
  { vh: 380, name: '9_title_ascend_card_flyin.png', desc: 'Title Ascends, Card 01 Rises In' },
  { vh: 420, name: '10_skills_cards_flythrough.png', desc: 'Skills Card Hero Focus' },
]

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
    await sleep(2500)
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

    console.log('Navigating to http://localhost:5174/#about...')
    await send('Page.navigate', { url: 'http://localhost:5174/#about' })
    await sleep(3500)

    for (const pt of testPoints) {
      const sRaw = pt.vh / STAGE_TOTAL_VH
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            if (window.__applyStage) {
              window.__applyStage(${sRaw});
            }
          })()
        `,
      })
      await sleep(400)
      const snap = await send('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(ARTIFACTS_DIR, pt.name)
      fs.writeFileSync(filePath, Buffer.from(snap.data, 'base64'))
      console.log(`Saved ${pt.name} (${pt.desc}) at ${pt.vh}vh (s=${sRaw.toFixed(4)}) - size: ${fs.statSync(filePath).size} bytes`)
    }

    console.log('All 10 test captures completed!')
    ws.close()
  } catch (err) {
    console.error('Error during test execution:', err)
  } finally {
    chromeProc.kill()
  }
}

run()

