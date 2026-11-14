import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9270
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_test_psd')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    margin: 40px;
    color: #111;
  }
  h2 { font-size: 18px; color: #666; margin-bottom: 8px; }
  .box { margin-bottom: 50px; background: #ffffff; padding: 20px; }

  .title-base {
    font-size: 96px;
    font-weight: 900;
    line-height: 0.85;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    display: inline-block;
  }

  /* Variation 1: Pure white, multi-layer solid extrusion down-right + soft drop shadow */
  .v1 {
    color: #ffffff;
    text-shadow:
      1px 1px 0 #222,
      2px 2px 0 #222,
      3px 3px 0 #222,
      4px 4px 0 #222,
      5px 5px 0 #202020,
      6px 6px 0 #1e1e1e,
      7px 7px 0 #1c1c1c,
      8px 8px 0 #1a1a1a,
      9px 9px 0 #181818,
      10px 10px 0 #161616,
      11px 11px 0 #141414,
      12px 12px 0 #121212,
      13px 13px 0 #101010,
      14px 14px 0 #0e0e0e,
      15px 15px 0 #0c0c0c,
      16px 16px 0 #0a0a0a,
      0 20px 24px rgba(0,0,0,0.35),
      10px 25px 30px rgba(0,0,0,0.25);
  }

  /* Variation 2: White with delicate black contour/stroke + 3D extrusion */
  .v2 {
    color: #ffffff;
    -webkit-text-stroke: 1.5px #1a1a1a;
    paint-order: stroke fill;
    text-shadow:
      1px 1px 0 #222,
      2px 2px 0 #222,
      3px 3px 0 #222,
      4px 4px 0 #222,
      5px 5px 0 #202020,
      6px 6px 0 #1e1e1e,
      7px 7px 0 #1c1c1c,
      8px 8px 0 #1a1a1a,
      9px 9px 0 #181818,
      10px 10px 0 #161616,
      11px 11px 0 #141414,
      12px 12px 0 #121212,
      13px 13px 0 #101010,
      14px 14px 0 #0e0e0e,
      0 20px 24px rgba(0,0,0,0.35),
      8px 24px 28px rgba(0,0,0,0.25);
  }

  /* Variation 3: Pure white with top-right diagonal bevel simulation + bottom-right extrusion */
  .v3 {
    color: #ffffff;
    text-shadow:
      /* subtle dark border on left/top to separate from white canvas */
      -1px -1px 0 rgba(0,0,0,0.3),
      -1px 0 0 rgba(0,0,0,0.25),
      0 -1px 0 rgba(0,0,0,0.25),
      /* top-right bevel */
      1px -1px 0 #222,
      2px -2px 0 #222,
      3px -3px 0 #1e1e1e,
      /* main 3D extrusion down-right */
      1px 1px 0 #2a2a2a,
      2px 2px 0 #282828,
      3px 3px 0 #262626,
      4px 4px 0 #242424,
      5px 5px 0 #222222,
      6px 6px 0 #202020,
      7px 7px 0 #1e1e1e,
      8px 8px 0 #1c1c1c,
      9px 9px 0 #1a1a1a,
      10px 10px 0 #181818,
      11px 11px 0 #161616,
      12px 12px 0 #141414,
      13px 13px 0 #121212,
      14px 14px 0 #101010,
      /* bottom floor shadow */
      0 22px 25px rgba(0,0,0,0.35),
      10px 26px 30px rgba(0,0,0,0.2);
  }

  /* Variation 4: Dark Charcoal / Black face with dramatic deep 3D drop shadow */
  .v4 {
    color: #0f172a;
    text-shadow:
      1px 1px 0 #000000,
      2px 2px 0 #000000,
      3px 3px 0 #000000,
      4px 4px 0 #000000,
      5px 5px 0 #1e293b,
      6px 6px 0 #1e293b,
      7px 7px 0 #334155,
      8px 8px 0 #334155,
      0 20px 24px rgba(0,0,0,0.4),
      10px 28px 36px rgba(0,0,0,0.25);
  }

  .dot-blue { color: #2563eb; }
</style>
</head>
<body>
  <div class="box">
    <h2>Variation 1: White Face + Pure 3D Extrusion + Soft Shadow (No Stroke)</h2>
    <div class="title-base v1">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
  </div>

  <div class="box">
    <h2>Variation 2: White Face + Subtle Contour Edge + 3D Extrusion + Shadow</h2>
    <div class="title-base v2">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
  </div>

  <div class="box">
    <h2>Variation 3: White Face + Bevel & Contour + 3D Extrusion + Shadow</h2>
    <div class="title-base v3">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
  </div>

  <div class="box">
    <h2>Variation 4: Dark Face + Deep 3D Shadow</h2>
    <div class="title-base v4">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
  </div>
</body>
</html>
`

const htmlPath = path.join(ARTIFACTS_DIR, 'scratch', 'test_variations.html')
fs.writeFileSync(htmlPath, htmlContent)

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1200,1800',
    'about:blank',
  ])

  try {
    await sleep(1500)
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
    await send('Page.navigate', { url: `file://${htmlPath.replace(/\\/g, '/')}` })
    await sleep(1500)

    const shot = await send('Page.captureScreenshot', { format: 'png' })
    const outShot = path.join(ARTIFACTS_DIR, 'qa_test_variations.png')
    fs.writeFileSync(outShot, Buffer.from(shot.data, 'base64'))
    console.log('Saved qa_test_variations.png')

    ws.close()
  } catch (err) {
    console.error('Error:', err)
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run()

