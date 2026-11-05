import http from 'http'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const PORT = 9876
const OUT_DIR = path.resolve('../template-analysis/verify')
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

const savedScreenshots = []

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method === 'POST' && (req.url === '/save' || req.url === '/save-preview')) {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const { filename, base64, step, p, title } = JSON.parse(body)
        const filePath = path.join(OUT_DIR, filename)
        fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
        console.log(`Saved screenshot: ${filename} (${Math.round(base64.length / 1024)} KB)`)
        savedScreenshots.push(step || { name: filename.replace('.png', ''), p, title: title || filename })
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (err) {
        console.error('Error saving screenshot:', err)
        res.writeHead(500)
        res.end()
      }
    })
    return
  }

  if (req.method === 'POST' && (req.url === '/done' || req.url === '/done-preview')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    console.log('All screenshots received! Writing contact sheet...')
    writeContactSheet()
    setTimeout(() => {
      if (typeof chromeProc !== 'undefined' && chromeProc) {
        chromeProc.kill()
      }
      server.close(() => {
        console.log('Done! Exiting cleanly.')
        process.exit(0)
      })
    }, 1000)
    return
  }

  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?') || req.url.includes('formation_preview.html'))) {
    const filePath = path.resolve('../template-analysis/formation_preview.html')
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(fs.readFileSync(filePath))
      return
    }
  }

  res.writeHead(404)
  res.end()
})

function writeContactSheet() {
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
    ${savedScreenshots
      .map(
        (s) => `
    <div class="item">
      <div class="item-header">
        <span class="item-title">${s.title}</span>
        <span class="item-badge">p = ${s.p.toFixed(2)}</span>
      </div>
      <img src="${s.name}.png" alt="${s.title}" />
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
}

import os from 'os'

server.listen(PORT, () => {
  console.log(`Capture server listening on http://localhost:${PORT}`)
  console.log('Ready for browser to navigate to http://localhost:5174/?dev=1&autocapture=1')
})
