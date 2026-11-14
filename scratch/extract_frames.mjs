import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9288
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_extract_frames')

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

    // Extract frames at 0.1s, 0.3s, 0.6s, 0.9s, 1.1s, 1.4s, 1.7s, 2.0s
    const times = [0.1, 0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.8, 2.1]

    for (let idx = 0; idx < times.length; idx++) {
      const t = times[idx]
      const frameData = await send('Runtime.evaluate', {
        expression: `(async () => {
          if (!window._video) {
            window._video = document.createElement('video');
            window._video.src = 'data:video/mp4;base64,${videoData}';
            window._video.muted = true;
            await new Promise(r => window._video.onloadeddata = r);
            window._canvas = document.createElement('canvas');
            window._canvas.width = window._video.videoWidth;
            window._canvas.height = window._video.videoHeight;
            window._ctx = window._canvas.getContext('2d');
          }
          window._video.currentTime = ${t};
          await new Promise(r => window._video.onseeked = r);
          window._ctx.drawImage(window._video, 0, 0);
          return window._canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
        })()`,
        awaitPromise: true,
        returnByValue: true
      })

      if (frameData.result?.value) {
        const frameBuf = Buffer.from(frameData.result.value, 'base64')
        fs.writeFileSync(path.join(ARTIFACTS_DIR, `ref_frame_${idx}_${t}s.jpg`), frameBuf)
      }
    }

    console.log('Extracted frames successfully')
    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

