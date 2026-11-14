import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9275
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_fine_tune_psd')

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
    margin: 50px;
  }
  .box { margin-bottom: 60px; }
  h3 { font-size: 16px; color: #888; margin-bottom: 12px; font-weight: 500; }

  .title-base {
    font-size: 104px;
    font-weight: 900;
    line-height: 0.84;
    letter-spacing: -0.04em;
    text-transform: uppercase;
    display: inline-block;
  }

  /* Option A: Pure white face, pure solid extrusion, soft ambient floor shadow */
  .opt-a {
    color: #ffffff;
    text-shadow:
      1px 1px 0 #262626,
      2px 2px 0 #242424,
      3px 3px 0 #222222,
      4px 4px 0 #202020,
      5px 5px 0 #1e1e1e,
      6px 6px 0 #1c1c1c,
      7px 7px 0 #1a1a1a,
      8px 8px 0 #181818,
      9px 9px 0 #161616,
      10px 10px 0 #141414,
      11px 11px 0 #121212,
      12px 12px 0 #101010,
      13px 13px 0 #0e0e0e,
      14px 14px 0 #0c0c0c,
      0 20px 24px rgba(0, 0, 0, 0.38),
      6px 24px 30px rgba(0, 0, 0, 0.22);
  }

  /* Option B: Ultra-faint top-left hairline (0.15 opacity) for crisp edge definition */
  .opt-b {
    color: #ffffff;
    text-shadow:
      -1px 0 0 rgba(0, 0, 0, 0.16),
      0 -1px 0 rgba(0, 0, 0, 0.14),
      -1px -1px 0 rgba(0, 0, 0, 0.1),
      1px 1px 0 #262626,
      2px 2px 0 #242424,
      3px 3px 0 #222222,
      4px 4px 0 #202020,
      5px 5px 0 #1e1e1e,
      6px 6px 0 #1c1c1c,
      7px 7px 0 #1a1a1a,
      8px 8px 0 #181818,
      9px 9px 0 #161616,
      10px 10px 0 #141414,
      11px 11px 0 #121212,
      12px 12px 0 #101010,
      13px 13px 0 #0e0e0e,
      14px 14px 0 #0c0c0c,
      0 20px 24px rgba(0, 0, 0, 0.38),
      6px 24px 30px rgba(0, 0, 0, 0.22);
  }

  /* Option C: Crisp bevel with 3D extrusion & drop shadow */
  .opt-c {
    color: #ffffff;
    text-shadow:
      /* Top-right bevel facet */
      1px -1px 0 #262626,
      2px -2px 0 #202020,
      3px -3px 0 #1a1a1a,
      /* Bottom-right extrusion */
      1px 1px 0 #262626,
      2px 2px 0 #242424,
      3px 3px 0 #222222,
      4px 4px 0 #202020,
      5px 5px 0 #1e1e1e,
      6px 6px 0 #1c1c1c,
      7px 7px 0 #1a1a1a,
      8px 8px 0 #181818,
      9px 9px 0 #161616,
      10px 10px 0 #141414,
      11px 11px 0 #121212,
      12px 12px 0 #101010,
      13px 13px 0 #0e0e0e,
      14px 14px 0 #0c0c0c,
      0 20px 24px rgba(0, 0, 0, 0.38),
      6px 24px 30px rgba(0, 0, 0, 0.22);
  }

  /* Option D: Option B with styled 3D blue period */
  .opt-d {
    color: #ffffff;
    text-shadow:
      -1px 0 0 rgba(0, 0, 0, 0.16),
      0 -1px 0 rgba(0, 0, 0, 0.14),
      -1px -1px 0 rgba(0, 0, 0, 0.1),
      1px 1px 0 #262626,
      2px 2px 0 #242424,
      3px 3px 0 #222222,
      4px 4px 0 #202020,
      5px 5px 0 #1e1e1e,
      6px 6px 0 #1c1c1c,
      7px 7px 0 #1a1a1a,
      8px 8px 0 #181818,
      9px 9px 0 #161616,
      10px 10px 0 #141414,
      11px 11px 0 #121212,
      12px 12px 0 #101010,
      13px 13px 0 #0e0e0e,
      14px 14px 0 #0c0c0c,
      0 20px 24px rgba(0, 0, 0, 0.38),
      6px 24px 30px rgba(0, 0, 0, 0.22);
  }

  .dot-3d {
    color: #2563eb;
    display: inline-block;
    text-shadow:
      1px 1px 0 #1d4ed8,
      2px 2px 0 #1e40af,
      3px 3px 0 #1e3a8a,
      4px 4px 0 #172554,
      5px 5px 0 #0f172a,
      6px 6px 0 #020617,
      7px 7px 0 #000000,
      8px 8px 0 #000000,
      9px 9px 0 #000000,
      10px 10px 0 #000000,
      11px 11px 0 #000000,
      12px 12px 0 #000000,
      13px 13px 0 #000000,
      14px 14px 0 #000000,
      0 20px 24px rgba(37, 99, 235, 0.4),
      6px 24px 30px rgba(0, 0, 0, 0.3);
  }
</style>
</head>
<body>
  <div class="box">
    <h3>Option A: Pure White Face + Solid 3D Extrusion + Floor Shadow</h3>
    <div class="title-base opt-a">LET'S<br>CONNECT.</div>
  </div>

  <div class="box">
    <h3>Option B: White Face with Subtle Hairline Edge (Maintains Readability of L & E)</h3>
    <div class="title-base opt-b">LET'S<br>CONNECT.</div>
  </div>

  <div class="box">
    <h3>Option C: Bevel Facet + 3D Extrusion</h3>
    <div class="title-base opt-c">LET'S<br>CONNECT.</div>
  </div>

  <div class="box">
    <h3>Option D: Option B with 3D Extruded Cobalt Blue Period</h3>
    <div class="title-base opt-d">LET'S<br>CONNECT<span class="dot-3d">.</span></div>
  </div>
</body>
</html>
`

const htmlPath = path.join(ARTIFACTS_DIR, 'scratch', 'test_fine_tune.html')
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
    const outShot = path.join(ARTIFACTS_DIR, 'qa_fine_tune_psd.png')
    fs.writeFileSync(outShot, Buffer.from(shot.data, 'base64'))
    console.log('Saved qa_fine_tune_psd.png')

    ws.close()
  } catch (err) {
    console.error('Error:', err)
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run()

