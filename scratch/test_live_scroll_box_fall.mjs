import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9320
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_test_scroll_fall')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1920,1080',
    'about:blank',
  ])

  try {
    await sleep(1500)
    let wsUrl = null
    for (let i = 0; i < 20; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`)
        const list = await res.json()
        const page = list.find((t) => t.type === 'page')
        if (page?.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl
          break
        }
      } catch (e) {}
      await sleep(300)
    }

    if (!wsUrl) throw new Error('Could not get CDP WebSocket')

    const ws = new WebSocket(wsUrl)
    await new Promise((resolve) => ws.onopen = resolve)

    let msgId = 1
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = msgId++
        const handler = (evt) => {
          const res = JSON.parse(evt.data)
          if (res.id === id) {
            ws.removeEventListener('message', handler)
            if (res.error) reject(res.error)
            else resolve(res.result)
          }
        }
        ws.addEventListener('message', handler)
        ws.send(JSON.stringify({ id, method, params }))
      })

    await send('Page.enable')
    await send('Runtime.enable')

    const evalScript = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      return res.result?.value
    }

    const captureShot = async (filename) => {
      const { data } = await send('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(ARTIFACTS_DIR, filename)
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
      console.log('Saved:', filename)
    }

    console.log('Navigating to http://localhost:5174/#about...')
    await send('Page.navigate', { url: 'http://localhost:5174/#about' })
    await sleep(4000)

    const stageInfo = await evalScript(`(() => {
      const stage = document.getElementById('stage');
      const aboutBox = document.querySelector('.about-stage--embedded');
      const st = window.ScrollTrigger ? window.ScrollTrigger.getById?.('stage-trigger') || window.ScrollTrigger.getAll().find(t => t.trigger === stage) : null;
      return {
        hasStage: Boolean(stage),
        hasAboutBox: Boolean(aboutBox),
        scrollY: window.scrollY,
        innerHeight: window.innerHeight,
        stStart: st?.start,
        stEnd: st?.end,
      };
    })()`)
    console.log('Stage info on load:', stageInfo)

    // Capture initial About screen
    await captureShot('qa_scroll_01_about_initial.png')

    // If stage trigger exists, scroll through the transition
    if (stageInfo.stStart !== undefined && stageInfo.stEnd !== undefined) {
      const { stStart, stEnd } = stageInfo
      const totalVh = 2010

      // 1. Standing About Box (158vh) - verify NO white shades while in section
      const scroll158 = stStart + (158 / totalVh) * (stEnd - stStart)
      await evalScript(`window.scrollTo(0, ${scroll158})`)
      await sleep(600)
      await captureShot('qa_refine_01_about_clean_in_section.png')

      // 2. User starts moving to next section (185vh) - border & tight white shadow emerge
      const scroll185 = stStart + (185 / totalVh) * (stEnd - stStart)
      await evalScript(`window.scrollTo(0, ${scroll185})`)
      await sleep(600)
      await captureShot('qa_refine_02_tight_shadow_emerging.png')

      // 3. Box Tipping Forward (200vh)
      const scroll200 = stStart + (200 / totalVh) * (stEnd - stStart)
      await evalScript(`window.scrollTo(0, ${scroll200})`)
      await sleep(600)
      await captureShot('qa_refine_03_box_tipping_forward.png')

      // 4. Box Falling Flat & Skills Heading Showing Up (232vh)
      const scroll232 = stStart + (232 / totalVh) * (stEnd - stStart)
      await evalScript(`window.scrollTo(0, ${scroll232})`)
      await sleep(600)
      await captureShot('qa_refine_04_falling_flat_heading_232vh.png')
    }

    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)
