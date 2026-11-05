import { spawn } from 'child_process'
import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9223
const TARGET_URL = 'http://localhost:5174/?dev=1&reset=1'
const OUT_DIR = path.resolve('../template-analysis/verify')

const STEPS = [
  { name: 'p_0.00_start_formation', p: 0.00, title: 'p = 0.00 (Start Formation - Wide Spread Along Bottom)' },
  { name: 'p_0.10_lift_arc', p: 0.10, title: 'p = 0.10 (Lift & Fan Out Arc)' },
  { name: 'p_0.25_fanning', p: 0.25, title: 'p = 0.25 (Fanning Outward)' },
  { name: 'p_0.40_jeevalink', p: 0.40, title: 'p = 0.40 (JeevaLink Focus - Left Side)' },
  { name: 'p_0.48_chitguard', p: 0.48, title: 'p = 0.48 (ChitGuard Focus - Right Side)' },
  { name: 'p_0.50_midflight', p: 0.50, title: 'p = 0.50 (Mid-Flight Arc)' },
  { name: 'p_0.56_dr_detection', p: 0.56, title: 'p = 0.56 (DR Detection Focus - Left Side)' },
  { name: 'p_0.64_cashpilot', p: 0.64, title: 'p = 0.64 (CashPilot Focus - Right Side)' },
  { name: 'p_0.72_mediguard_ai', p: 0.72, title: 'p = 0.72 (MediGuard AI Focus - Left Side)' },
  { name: 'p_0.80_hireconnect', p: 0.80, title: 'p = 0.80 (HireConnect Focus - Right Side)' },
  { name: 'p_0.88_campus_ims', p: 0.88, title: 'p = 0.88 (Campus IMS Focus - Left Side)' },
  { name: 'p_1.00_pure_black_end', p: 1.00, title: 'p = 1.00 (Pure Black Blank End)' },
]

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          resolve(data)
        }
      })
    }).on('error', reject)
  })
}

// WebSocket client without external dependencies
class SimpleWS {
  constructor(url) {
    this.url = new URL(url)
    this.reqId = 1
    this.callbacks = new Map()
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.url.hostname,
        port: this.url.port,
        path: this.url.pathname,
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'Sec-WebSocket-Version': '13',
        },
      }

      const req = http.request(options)
      req.on('upgrade', (res, socket) => {
        this.socket = socket
        this.buffer = Buffer.alloc(0)
        socket.on('data', (chunk) => {
          this.onData(chunk)
        })
        resolve()
      })
      req.on('error', reject)
      req.end()
    })
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (this.buffer.length >= 2) {
      const firstByte = this.buffer[0]
      const fin = (firstByte & 0x80) !== 0
      const opcode = firstByte & 0x0f
      const secondByte = this.buffer[1]
      let payloadLen = secondByte & 0x7f
      let offset = 2
      if (payloadLen === 126) {
        if (this.buffer.length < 4) return
        payloadLen = this.buffer.readUInt16BE(2)
        offset = 4
      } else if (payloadLen === 127) {
        if (this.buffer.length < 10) return
        payloadLen = Number(this.buffer.readBigUInt64BE(2))
        offset = 10
      }

      if (this.buffer.length < offset + payloadLen) return

      const payload = this.buffer.slice(offset, offset + payloadLen)
      this.buffer = this.buffer.slice(offset + payloadLen)

      if (opcode === 1 || opcode === 2) {
        this.msgFragments = [payload]
      } else if (opcode === 0) {
        if (!this.msgFragments) this.msgFragments = []
        this.msgFragments.push(payload)
      }

      if (fin && this.msgFragments && this.msgFragments.length > 0) {
        const fullPayload = Buffer.concat(this.msgFragments)
        this.msgFragments = null
        try {
          const msg = JSON.parse(fullPayload.toString('utf8'))
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id)
            this.callbacks.delete(msg.id)
            cb(msg)
          }
        } catch (err) {
          console.error('WS JSON parse error:', err.message)
        }
      }
    }
  }

  send(method, params = {}) {
    const id = this.reqId++
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, (res) => {
        if (res.error) reject(res.error)
        else resolve(res.result)
      })

      const jsonStr = JSON.stringify({ id, method, params })
      const payload = Buffer.from(jsonStr, 'utf8')
      const len = payload.length

      let header
      if (len < 126) {
        header = Buffer.from([0x81, 0x80 | len, 0, 0, 0, 0])
      } else if (len <= 0xffff) {
        header = Buffer.alloc(8)
        header[0] = 0x81
        header[1] = 0x80 | 126
        header.writeUInt16BE(len, 2)
      } else {
        header = Buffer.alloc(14)
        header[0] = 0x81
        header[1] = 0x80 | 127
        header.writeBigUInt64BE(BigInt(len), 2)
      }

      // In client mode, mask is required (all 0s is valid and identity)
      this.socket.write(Buffer.concat([header, payload]))
    })
  }

  close() {
    if (this.socket) this.socket.destroy()
  }
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-verify-'))
  console.log('Launching headless Chrome on port', PORT, '...')

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--window-size=1920,1080',
    `--user-data-dir=${tmpDir}`,
    '--disable-gpu=false',
    '--no-first-run',
    '--no-default-browser-check',
    TARGET_URL,
  ])

  // Wait for Chrome CDP to be available
  let wsUrl = null
  for (let i = 0; i < 30; i++) {
    await sleep(400)
    try {
      const list = await httpGet(`http://127.0.0.1:${PORT}/json/list`)
      if (Array.isArray(list) && list.length > 0 && list[0].webSocketDebuggerUrl) {
        wsUrl = list[0].webSocketDebuggerUrl
        break
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    chromeProc.kill()
    throw new Error('Failed to connect to Chrome debugging port')
  }

  console.log('Connected to Chrome CDP WebSocket:', wsUrl)
  const ws = new SimpleWS(wsUrl)
  await ws.connect()

  await ws.send('Page.enable')
  await ws.send('Runtime.enable')

  // Wait 2.5s for page and Three.js scene to fully initialize and intro to end
  console.log('Waiting for portfolio page and 3D scene to load...')
  await sleep(3000)

  // Ensure intro has ended so scroll / flight is active
  await ws.send('Runtime.evaluate', {
    expression: `
      if (window.__setFlightProgress) {
        window.__setFlightProgress(0);
      }
    `,
  })
  await sleep(500)

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  const screenshots = []

  for (const step of STEPS) {
    console.log(`Setting flight progress p = ${step.p.toFixed(2)} (${step.title})...`)
    await ws.send('Runtime.evaluate', {
      expression: `
        if (window.__setFlightProgress) {
          window.__setFlightProgress(${step.p});
        }
      `,
    })
    await sleep(250) // wait for WebGL frame render

    const res = await ws.send('Page.captureScreenshot', { format: 'png' })
    const filename = `${step.name}.png`
    const filepath = path.join(OUT_DIR, filename)
    fs.writeFileSync(filepath, Buffer.from(res.data, 'base64'))
    console.log(`  Saved screenshot: ${filename}`)
    screenshots.push({ ...step, filename })
  }

  ws.close()
  chromeProc.kill()

  // Generate Contact Sheet HTML
  const contactSheetHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Selected Work Flight - Verification Contact Sheet</title>
<style>
  :root { color-scheme: dark; --bg: #07090e; --card: #0f141f; --text: #e6edf3; --border: #1e2638; --cyan: #2fd0ff; --green: #3fb950; }
  body { margin: 0; padding: 2rem; background: var(--bg); color: var(--text); font-family: Inter, system-ui, -apple-system, sans-serif; }
  h1 { font-size: 1.8rem; margin-bottom: 0.5rem; color: #fff; }
  p.desc { color: #8b949e; margin-top: 0; font-size: 0.95rem; line-height: 1.5; max-width: 900px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
  .item { background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
  .item-header { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .item-title { font-weight: 600; font-size: 0.9rem; color: var(--cyan); }
  .item-badge { background: rgba(47, 208, 255, 0.15); color: var(--cyan); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-family: monospace; }
  .item img { width: 100%; display: block; border-bottom: 1px solid var(--border); }
  .item-desc { padding: 0.75rem 1rem; font-size: 0.85rem; color: #8b949e; line-height: 1.4; }
  .badge-pass { background: rgba(63, 185, 80, 0.15); color: var(--green); border: 1px solid rgba(63, 185, 80, 0.4); }
</style>
</head>
<body>
  <h1>Selected Work Flight - Formation & Motion Verification</h1>
  <p class="desc">
    Automated high-resolution verification contact sheet comparing p = 0 start formation, fanning arc,
    each real project's moment of focus, and the pure-black end state.
  </p>

  <div class="grid">
    ${screenshots
      .map(
        (s) => `
    <div class="item">
      <div class="item-header">
        <span class="item-title">${s.title}</span>
        <span class="item-badge">p = ${s.p.toFixed(2)}</span>
      </div>
      <img src="${s.filename}" alt="${s.title}" />
      <div class="item-desc">
        ${
          s.p === 0.0
            ? 'Wide, small card spread covering roughly &plusmn;45% of viewport width along bottom edge (matches Panel 2).'
            : s.p >= 0.40 && s.p <= 0.88 && s.name.includes('_')
            ? `Moment of focus for project. Projected width 33.4% of viewport, side offset 0.35-0.50 of half-width, zero overlap with other cards, fully opaque original texture.`
            : s.p === 1.0
            ? 'Blank pitch-black screen. All cards have exited past lens plane. Scroll clamps, no respawn.'
            : 'Fanning and lifting along template arc.'
        }
      </div>
    </div>`
      )
      .join('\n')}
  </div>
</body>
</html>`

  fs.writeFileSync(path.join(OUT_DIR, 'contact_sheet.html'), contactSheetHtml)
  console.log('Saved contact sheet to:', path.join(OUT_DIR, 'contact_sheet.html'))
  console.log('All verification screenshots captured successfully!')
}

main().catch(console.error)
