import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9310
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_test_live_fall')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1920,1080',
    'http://localhost:5174/',
  ])

  try {
    let wsUrl = null
    for (let i = 0; i < 30; i++) {
      await sleep(400)
      try {
        const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
        const data = await res.json()
        const page = data.find((p) => p.type === 'page')
        if (page?.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl
          break
        }
      } catch (e) {}
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

    // Wait for portfolio to load
    await sleep(2500)

    // Check if __applyStage is ready
    let ready = false
    for (let i = 0; i < 20; i++) {
      ready = await evalScript(`typeof window.__applyStage === 'function'`)
      if (ready) break
      await sleep(300)
    }
    console.log('__applyStage ready:', ready)

    // Test cases:
    // 1. Standing About Box with glowing white shadows (s = 158 / 2010 = 0.0786)
    await evalScript(`window.__applyStage(158 / 2010, 1)`)
    await sleep(400)
    await captureShot('qa_live_01_about_standing_box.png')

    // 2. Box Tipping Forward in 3D (s = 195 / 2010 = 0.0970, P_boxFall ~ 0.285)
    await evalScript(`window.__applyStage(195 / 2010)`)
    await sleep(400)
    await captureShot('qa_live_02_about_tipping_forward.png')

    // 3. Box Falling Down Flat towards ground, SKILLS heading revealed (s = 225 / 2010 = 0.1119, P_boxFall ~ 0.714)
    await evalScript(`window.__applyStage(225 / 2010)`)
    await sleep(400)
    await captureShot('qa_live_03_box_falling_flat_heading_revealed.png')

    // 4. Box Landed & Settled, SKILLS Centered (s = 245 / 2010 = 0.1218, P_boxFall = 1.0)
    await evalScript(`window.__applyStage(245 / 2010)`)
    await sleep(400)
    await captureShot('qa_live_04_skills_heading_centered.png')

    // 5. Cards Flying In into 3D view (s = 285 / 2010 = 0.1417, introSkillsP ~ 0.53)
    await evalScript(`window.__applyStage(285 / 2010)`)
    await sleep(400)
    await captureShot('qa_live_05_skills_cards_fly_in.png')

    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

