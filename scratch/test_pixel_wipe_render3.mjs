import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9292
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_wipe_test3')

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

    const testScript = `
      window.initWipe = function(W, H) {
        // Grid sizing matching video reference
        const cols = Math.max(8, Math.round(W / 90));
        const cellSize = W / cols;
        const rows = Math.ceil(H / cellSize);

        function cellHash(c, r, seed = 0) {
          let h = (c * 374761393 + r * 668265263 + seed * 982451653) ^ 0x5bf03635;
          h = Math.imul(h ^ (h >>> 13), 1274126177);
          return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
        }

        const SEEDS = [
          { x: 0.10, y: 0.20, weight: 1.0, delay: 0.00 },
          { x: 0.50, y: 0.08, weight: 1.05, delay: 0.01 },
          { x: 0.85, y: 0.18, weight: 0.95, delay: 0.01 },
          { x: 0.32, y: 0.40, weight: 1.0, delay: 0.03 },
          { x: 0.88, y: 0.50, weight: 1.0, delay: 0.02 },
          { x: 0.18, y: 0.75, weight: 0.95, delay: 0.05 },
          { x: 0.65, y: 0.75, weight: 1.0, delay: 0.04 },
          { x: 0.42, y: 0.90, weight: 0.9, delay: 0.06 },
        ];

        const cells = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const nx = (c + 0.5) / cols;
            const ny = (r + 0.5) / rows;

            let minDist = 999;
            for (const s of SEEDS) {
              const d = (Math.abs(nx - s.x) * 1.05 + Math.abs(ny - s.y) * 0.95) * s.weight + s.delay;
              if (d < minDist) minDist = d;
            }

            const hash = cellHash(c, r, 101);
            const scoreCover = minDist * 0.66 + hash * 0.34;

            const hashRev = cellHash(c, r, 303);
            const dRev = (Math.abs(nx - 0.5) * 0.85 + Math.abs(ny - 0.5) * 1.0);
            const scoreReveal = dRev * 0.66 + hashRev * 0.34;

            cells.push({ c, r, nx, ny, hash, scoreCover, scoreReveal });
          }
        }

        // Rank cells for cover
        cells.sort((a, b) => a.scoreCover - b.scoreCover);
        cells.forEach((cell, idx) => {
          cell.coverThreshold = idx / cells.length;
        });

        // Rank cells for reveal
        cells.sort((a, b) => a.scoreReveal - b.scoreReveal);
        cells.forEach((cell, idx) => {
          cell.revealThreshold = idx / cells.length;
        });

        window._grid = { W, H, cols, rows, cellSize, cells };
      };

      window.drawWipe = function(coverP, revealP) {
        const { W, H, cols, rows, cellSize, cells } = window._grid;
        if (!window._canvas) {
          window._canvas = document.createElement('canvas');
          window._canvas.width = W;
          window._canvas.height = H;
          document.body.appendChild(window._canvas);
        }
        const cv = window._canvas;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = '#03050a';
        ctx.fillRect(0, 0, W, H);

        if (revealP > 0) {
          if (revealP >= 1.0) {
            ctx.clearRect(0, 0, W, H);
            return cv.toDataURL('image/png').split(',')[1];
          }

          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (revealP >= cell.revealThreshold) {
              // Cell has cleared to reveal Contact underneath
              continue;
            }

            const x0 = Math.round(cell.c * cellSize);
            const x1 = Math.round((cell.c + 1) * cellSize);
            const y0 = Math.round(cell.r * cellSize);
            const y1 = Math.round((cell.r + 1) * cellSize);

            // Cell remaining before retraction
            const isDarkTone = (cell.revealThreshold - revealP) < 0.08 && cell.hash > 0.5;
            ctx.fillStyle = isDarkTone ? '#180099' : '#2700FF';
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
          }
          return cv.toDataURL('image/png').split(',')[1];
        }

        // Cover phase
        if (coverP >= 1.0) {
          ctx.fillStyle = '#2700FF';
          ctx.fillRect(0, 0, W, H);
          return cv.toDataURL('image/png').split(',')[1];
        }

        if (coverP <= 0) {
          return cv.toDataURL('image/png').split(',')[1];
        }

        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          if (coverP < cell.coverThreshold) continue;

          const x0 = Math.round(cell.c * cellSize);
          const x1 = Math.round((cell.c + 1) * cellSize);
          const y0 = Math.round(cell.r * cellSize);
          const y1 = Math.round((cell.r + 1) * cellSize);

          // Early newly turned-on cells briefly show dark indigo before turning vivid electric purple
          const isFresh = (coverP - cell.coverThreshold) < 0.06 && cell.hash > 0.45;
          ctx.fillStyle = isFresh ? '#180099' : '#2700FF';
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
        return cv.toDataURL('image/png').split(',')[1];
      };
    `

    await send('Runtime.evaluate', { expression: testScript })
    await send('Runtime.evaluate', { expression: 'initWipe(1440, 900)' })

    const testCases = [
      { name: 'wipe_v3_cover_0.12', coverP: 0.12, revealP: 0 },
      { name: 'wipe_v3_cover_0.30', coverP: 0.30, revealP: 0 },
      { name: 'wipe_v3_cover_0.55', coverP: 0.55, revealP: 0 },
      { name: 'wipe_v3_cover_0.82', coverP: 0.82, revealP: 0 },
      { name: 'wipe_v3_cover_1.00', coverP: 1.00, revealP: 0 },
      { name: 'wipe_v3_reveal_0.35', coverP: 1.00, revealP: 0.35 },
      { name: 'wipe_v3_reveal_0.75', coverP: 1.00, revealP: 0.75 },
    ]

    for (const tc of testCases) {
      const r = await send('Runtime.evaluate', {
        expression: `drawWipe(${tc.coverP}, ${tc.revealP})`,
        returnByValue: true
      })
      if (r.result?.value) {
        fs.writeFileSync(path.join(ARTIFACTS_DIR, `${tc.name}.png`), Buffer.from(r.result.value, 'base64'))
      }
    }

    console.log('Saved v3 test frames successfully')
    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

