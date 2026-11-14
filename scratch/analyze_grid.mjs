import { spawn } from 'node:child_process'
import fs from 'node:fs'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9285
const USER_DATA_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc\\scratch\\chrome_inspect_grid'

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

        // Frame 0 is in top-left: 3 cols x 3 rows of frames
        const frameW = img.width / 3;
        const frameH = img.height / 3;

        // Sample frame 0 colors
        const frame0Data = ctx.getImageData(0, 0, frameW, frameH).data;

        // Find primary purple color
        const colorCounts = {};
        for (let i = 0; i < frame0Data.length; i += 4) {
          const r = frame0Data[i];
          const g = frame0Data[i+1];
          const b = frame0Data[i+2];
          if (b > 150 && r < 80 && g < 80) { // bluish-purple
            const key = \`rgb(\${r},\${g},\${b})\`;
            colorCounts[key] = (colorCounts[key] || 0) + 1;
          }
        }
        const topPurple = Object.entries(colorCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);

        return {
          totalW: img.width,
          totalH: img.height,
          frameW,
          frameH,
          topPurple
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

