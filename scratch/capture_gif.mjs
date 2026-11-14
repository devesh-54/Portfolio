import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9296
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_qa_gif')
const FRAMES_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'gif_frames')

if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true })
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1280,800',
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
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    })

    await send('Page.navigate', { url: 'http://localhost:5174/#about' })
    await sleep(3500)

    const pValues = [0.05, 0.12, 0.20, 0.28, 0.36, 0.44, 0.52, 0.60, 0.68, 0.76, 0.84, 0.92, 1.00]

    for (let i = 0; i < pValues.length; i++) {
      const p = pValues[i]
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const stageEl = document.querySelector('.about-stage');
            if (stageEl) {
              stageEl.style.opacity = '1';
              stageEl.style.transform = 'none';
              stageEl.style.visibility = 'visible';
              stageEl.style.zIndex = '9999';

              let parent = stageEl.parentElement;
              while (parent && parent !== document.body) {
                parent.style.opacity = '1';
                parent.style.visibility = 'visible';
                parent = parent.parentElement;
              }

              if (window.__applyAboutStageVars) {
                window.__applyAboutStageVars(stageEl, ${p}, 0);
              }
            }
          })()
        `,
      })
      await sleep(150)
      const snap = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 })
      const framePath = path.join(FRAMES_DIR, `frame_${String(i).padStart(2, '0')}.jpg`)
      fs.writeFileSync(framePath, Buffer.from(snap.data, 'base64'))
    }

    console.log('Captured', pValues.length, 'frames')
    ws.close()
  } catch (err) {
    console.error('Error:', err)
  } finally {
    chromeProc.kill()
  }
}

run()

