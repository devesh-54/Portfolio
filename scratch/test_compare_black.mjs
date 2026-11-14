import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9295
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_compare_black')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

function make3D(depth, color) {
  const parts = []
  for (let i = 1; i <= depth; i++) {
    parts.push(`${i}px ${i}px 0 ${color}`)
  }
  return parts.join(',\n      ')
}

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
  }
  .box { margin-bottom: 60px; }
  h2 { font-size: 16px; color: #64748b; margin-bottom: 12px; }

  .title-base {
    font-size: 96px;
    font-weight: 900;
    line-height: 0.84;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    display: inline-block;
  }

  /* Interpretation 1: Title 3D extrusion uses rgba(15, 23, 42, 0.92), preserving the white 3D face */
  .title-opt1 {
    color: #ffffff;
    text-shadow: ${make3D(14, 'rgba(15, 23, 42, 0.92)')};
  }

  /* Interpretation 2: Title face uses rgba(15, 23, 42, 0.92) flat (no 3D shadow) */
  .title-opt2 {
    color: rgba(15, 23, 42, 0.92);
  }

  /* Interpretation 3: Title face uses rgba(15, 23, 42, 0.92) with a darker 3D extrusion (#020617) */
  .title-opt3 {
    color: rgba(15, 23, 42, 0.92);
    text-shadow: ${make3D(10, '#020617')};
  }

  /* Interpretation 4: Title face uses rgba(15, 23, 42, 0.92) with a white/light 3D extrusion or soft shadow */
  .title-opt4 {
    color: rgba(15, 23, 42, 0.92);
    text-shadow: ${make3D(8, 'rgba(15, 23, 42, 0.25)')};
  }

  .dot-blue { color: #2563eb; }

  /* Info card preview with rgba(15, 23, 42, 0.92) */
  .info-preview {
    margin-top: 20px;
    padding: 16px;
    border-top: 1px solid rgba(0,0,0,0.08);
    display: flex;
    gap: 40px;
    align-items: center;
  }
  .name {
    font-size: 24px;
    font-weight: 800;
    color: rgba(15, 23, 42, 0.92);
  }
  .link-val {
    font-size: 16px;
    font-weight: 600;
    color: rgba(15, 23, 42, 0.92);
  }
</style>
</head>
<body>
  <div class="box">
    <h2>Interpretation 1: 3D Extrusion is rgba(15, 23, 42, 0.92) (replaces the harsh #181818 black extrusion)</h2>
    <div class="title-base title-opt1">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
    <div class="info-preview">
      <div class="name">Devesh</div>
      <div class="link-val">deveshdhanush73@gmail.com</div>
      <div class="link-val">in/devesh-s-6097a6370</div>
    </div>
  </div>

  <div class="box">
    <h2>Interpretation 2: Title Face is rgba(15, 23, 42, 0.92) Flat (replaces 3D with solid text)</h2>
    <div class="title-base title-opt2">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
    <div class="info-preview">
      <div class="name">Devesh</div>
      <div class="link-val">deveshdhanush73@gmail.com</div>
      <div class="link-val">in/devesh-s-6097a6370</div>
    </div>
  </div>

  <div class="box">
    <h2>Interpretation 4: Title Face is rgba(15, 23, 42, 0.92) with soft 3D block</h2>
    <div class="title-base title-opt4">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
    <div class="info-preview">
      <div class="name">Devesh</div>
      <div class="link-val">deveshdhanush73@gmail.com</div>
      <div class="link-val">in/devesh-s-6097a6370</div>
    </div>
  </div>
</body>
</html>
`

const htmlPath = path.join(ARTIFACTS_DIR, 'scratch', 'test_compare_black.html')
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
    const outShot = path.join(ARTIFACTS_DIR, 'qa_compare_black.png')
    fs.writeFileSync(outShot, Buffer.from(shot.data, 'base64'))
    console.log('Saved qa_compare_black.png')

    ws.close()
  } catch (err) {
    console.error('Error:', err)
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run()

