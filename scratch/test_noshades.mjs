import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9280
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_test_noshades')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

// Helper to generate crisp 3D text shadow without any blurry shadows
function make3DShadow(depth, color = '#181818', topHairline = true) {
  const parts = []
  if (topHairline) {
    parts.push('-1px 0 0 rgba(0,0,0,0.18)', '0 -1px 0 rgba(0,0,0,0.15)', '-1px -1px 0 rgba(0,0,0,0.12)')
  }
  for (let i = 1; i <= depth; i++) {
    parts.push(`${i}px ${i}px 0 ${color}`)
  }
  return parts.join(',\n      ')
}

function makePure3D(depth, color = '#000000') {
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
    padding: 0;
  }
  .box { margin-bottom: 50px; }
  h3 { font-size: 15px; color: #71717a; margin-bottom: 10px; font-weight: 600; }

  .title-base {
    font-size: 96px;
    font-weight: 900;
    line-height: 0.84;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    display: inline-block;
    color: #ffffff;
  }

  /* Version 1: Pure White + 12px Crisp Solid Extrusion (Zero blurry shades) */
  .v-crisp-12 {
    text-shadow: ${makePure3D(12, '#181818')};
  }

  /* Version 2: Pure White + 14px Crisp Solid Black Extrusion (Zero blurry shades) */
  .v-crisp-14 {
    text-shadow: ${makePure3D(14, '#0a0a0a')};
  }

  /* Version 3: White with subtle edge hairline + 14px Crisp Extrusion (Zero blurry shades) */
  .v-crisp-hairline {
    text-shadow: ${make3DShadow(14, '#141414', true)};
  }

  /* Version 4: 16px Solid Extrusion matching reference depth (Zero blurry shades) */
  .v-crisp-16 {
    text-shadow: ${makePure3D(16, '#181818')};
  }

  .dot-blue {
    color: #2563eb;
    display: inline-block;
  }
</style>
</head>
<body>
  <div class="box">
    <h3>Version 1: 12px Crisp Solid 3D Extrusion (No blur, no dark shades around text)</h3>
    <div class="title-base v-crisp-12">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
  </div>

  <div class="box">
    <h3>Version 2: 14px Crisp Jet Black Extrusion (No blur, no dark shades around text)</h3>
    <div class="title-base v-crisp-14">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
  </div>

  <div class="box">
    <h3>Version 3: 14px Extrusion with Faint Top/Left Boundary for 'L' & 'E'</h3>
    <div class="title-base v-crisp-hairline">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
  </div>

  <div class="box">
    <h3>Version 4: 16px Deep Solid 3D Extrusion (Matching PSD depth)</h3>
    <div class="title-base v-crisp-16">LET'S<br>CONNECT<span class="dot-blue">.</span></div>
  </div>
</body>
</html>
`

const htmlPath = path.join(ARTIFACTS_DIR, 'scratch', 'test_noshades.html')
fs.writeFileSync(htmlPath, htmlContent)

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1200,1600',
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
    const outShot = path.join(ARTIFACTS_DIR, 'qa_test_noshades.png')
    fs.writeFileSync(outShot, Buffer.from(shot.data, 'base64'))
    console.log('Saved qa_test_noshades.png')

    ws.close()
  } catch (err) {
    console.error('Error:', err)
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run()

