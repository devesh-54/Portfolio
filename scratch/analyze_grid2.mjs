import { spawn } from 'node:child_process'
import fs from 'node:fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9286
const USER_DATA_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc\\scratch\\chrome_inspect_grid2'

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

    const imgPath = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc/.user_uploaded/media_1794560571784_d507bdd3.jpg'
    const imgBase64 = fs.readFileSync(imgPath).toString('base64')

    const result = await send('Runtime.evaluate', {
      expression: `(async () => {
        const img = new Image();
        img.src = 'data:image/jpeg;base64,${imgBase64}';
        await new Promise(r => img.onload = r);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Analyze Frame 0 boundaries and block dimensions
        // Find single solid block width in Frame 0
        const frameW = img.width / 3;
        const frameH = img.height / 3;
        const imgData = ctx.getImageData(0, 0, frameW, frameH);

        // Find connected components of purple pixels
        const w = Math.round(frameW);
        const h = Math.round(frameH);
        const isPurple = (x, y) => {
          if (x < 0 || x >= w || y < 0 || y >= h) return false;
          const idx = (y * w + x) * 4;
          const b = imgData.data[idx+2];
          const r = imgData.data[idx];
          return b > 180 && r < 80;
        };

        // Measure widths of horizontal purple runs
        const runs = [];
        for (let y = 30; y < h - 30; y += 4) {
          let run = 0;
          for (let x = 0; x < w; x++) {
            if (isPurple(x, y)) {
              run++;
            } else {
              if (run > 5) runs.push(run);
              run = 0;
            }
          }
          if (run > 5) runs.push(run);
        }

        // Count runs to find common block size
        const runCounts = {};
        runs.forEach(r => runCounts[r] = (runCounts[r] || 0) + 1);

        return {
          runs: Object.entries(runCounts).sort((a,b) => b[1] - a[1]).slice(0, 10),
          estimatedCols: frameW / 24,
          estimatedRows: frameH / 24
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    })

    console.log('Result:', result.result?.value)
    ws.close()
  } finally {
    chromeProc.kill()
  }
}

run().catch(console.error)

