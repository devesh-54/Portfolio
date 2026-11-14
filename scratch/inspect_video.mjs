import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9287
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_inspect_video')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
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

    const videoPath = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc/.user_uploaded/media_1794560600208_16d398e8.mp4'
    const videoData = fs.readFileSync(videoPath).toString('base64')

    const videoMeta = await send('Runtime.evaluate', {
      expression: `(async () => {
        const video = document.createElement('video');
        video.src = 'data:video/mp4;base64,${videoData}';
        video.muted = true;
        await new Promise(r => video.onloadedmetadata = r);
        return {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    })

    console.log('Video Meta:', videoMeta.result?.value)
    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

