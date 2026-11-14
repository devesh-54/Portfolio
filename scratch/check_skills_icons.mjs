import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9330
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_check_icons')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1920,1080',
    'http://localhost:5174/#skills',
  ])

  try {
    await sleep(2000)
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

    await sleep(3000)

    // Check Card 01 focused (D = 0)
    const stageInfo = await evalScript(`(() => {
      const stage = document.getElementById('stage');
      const st = window.ScrollTrigger ? window.ScrollTrigger.getAll().find(t => t.trigger === stage) : null;
      return { stStart: st?.start, stEnd: st?.end };
    })()`)

    if (stageInfo.stStart !== undefined) {
      const { stStart, stEnd } = stageInfo
      const totalVh = 2010

      // Scroll to 335vh (Skills Hold - Card 01 focused hero)
      const scroll335 = stStart + (335 / totalVh) * (stEnd - stStart)
      await evalScript(`window.scrollTo(0, ${scroll335})`)
      await sleep(600)
      await captureShot('qa_card01_ai_icons.png')

      // Scroll to constellation (650vh)
      const scroll650 = stStart + (650 / totalVh) * (stEnd - stStart)
      await evalScript(`window.scrollTo(0, ${scroll650})`)
      await sleep(600)
      await captureShot('qa_constellation_icons.png')
    }

    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

