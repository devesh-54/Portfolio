import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9300
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_qa_rot')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

const STAGE_TOTAL_VH = 2010
const testPoints = [
  { vh: 265, name: 'rot_1_center_hold.png', desc: '50/50 Center Hold' },
  { vh: 285, name: 'rot_2_rotating_cw.png', desc: 'Clockwise Rotation Midpoint' },
  { vh: 300, name: 'rot_3_near_diagonal.png', desc: 'Clockwise Rotation Nearing Diagonal' },
  { vh: 310, name: 'rot_4_diagonal_incline.png', desc: 'Diagonal Incline Corner-to-Corner' },
  { vh: 325, name: 'rot_5_sweep_right_mid.png', desc: 'Inclined Line Sweeping Right' },
  { vh: 340, name: 'rot_6_sweep_right_far.png', desc: 'Inclined Line Near Exit' },
  { vh: 350, name: 'rot_7_full_white.png', desc: '100% Full White Screen' },
  { vh: 385, name: 'rot_8_title_ascend.png', desc: 'Title Ascending & Card Fly-In' },
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
          const data = JSON.parse(event.data)
          if (data.id === msgId) {
            ws.removeEventListener('message', handler)
            resolve(data.result)
          }
        }
        ws.addEventListener('message', handler)
        ws.send(JSON.stringify({ id: msgId, method, params }))
      })
    }

    await send('Page.enable')
    await send('Runtime.enable')

    console.log('Navigating to http://localhost:5174/ ...')
    await send('Page.navigate', { url: 'http://localhost:5174/' })
    await sleep(3500)

    for (const pt of testPoints) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const STAGE_TOTAL_VH = ${STAGE_TOTAL_VH};
          const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
          const targetY = ((${pt.vh} * window.innerHeight) / (STAGE_TOTAL_VH * window.innerHeight)) * totalScroll;
          window.scrollTo(0, targetY);
        })()`,
      })
      await sleep(500)

      const shot = await send('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(ARTIFACTS_DIR, pt.name)
      fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'))
      console.log(`Saved ${pt.name} (${pt.desc})`)
    }

    console.log('Finished capturing rotation sequence!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    chromeProc.kill()
  }
}

run()

