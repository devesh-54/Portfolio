import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9295
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_qa_about2')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1440,900',
    'about:blank',
  ])

  try {
    await sleep(2500)
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
    await send('Runtime.enable')

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    console.log('Navigating to http://localhost:5174/#about...')
    await send('Page.navigate', { url: 'http://localhost:5174/#about' })
    await sleep(3500)

    // Check if .about-stage exists and make sure it's visible
    const checkRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const stageEl = document.querySelector('.about-stage');
          const img = document.querySelector('.about-portrait-img');
          const canvas = document.querySelector('.about-portrait-canvas');
          return {
            hasStage: Boolean(stageEl),
            hasImg: Boolean(img),
            imgComplete: img ? img.complete : false,
            natW: img ? img.naturalWidth : 0,
            hasCanvas: Boolean(canvas),
            canvasW: canvas ? canvas.width : 0,
            hasFn: Boolean(window.__applyAboutStageVars)
          };
        })()
      `,
      returnByValue: true,
    })
    console.log('DOM check:', checkRes.result.value)

    const steps = [
      { p: 0.20, name: 'qa_about_particles_020.png' },
      { p: 0.40, name: 'qa_about_particles_040.png' },
      { p: 0.65, name: 'qa_about_particles_065.png' },
      { p: 0.90, name: 'qa_about_particles_090.png' },
      { p: 1.00, name: 'qa_about_particles_100.png' },
    ]

    for (const step of steps) {
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const stageEl = document.querySelector('.about-stage');
            if (stageEl) {
              stageEl.style.opacity = '1';
              stageEl.style.transform = 'none';
              stageEl.style.visibility = 'visible';
              stageEl.style.zIndex = '9999';

              // If parent has opacity 0 or transform, ensure it is visible
              let p = stageEl.parentElement;
              while (p && p !== document.body) {
                p.style.opacity = '1';
                p.style.visibility = 'visible';
                p = p.parentElement;
              }

              if (window.__applyAboutStageVars) {
                window.__applyAboutStageVars(stageEl, ${step.p}, 0);
              }
            }
          })()
        `,
      })
      await sleep(500)
      const snap = await send('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(ARTIFACTS_DIR, step.name)
      fs.writeFileSync(filePath, Buffer.from(snap.data, 'base64'))
      console.log('Saved', step.name, 'size:', fs.statSync(filePath).size)
    }

    console.log('All screenshots captured successfully!')
    ws.close()
  } catch (err) {
    console.error('Error in capture script:', err)
  } finally {
    chromeProc.kill()
  }
}

run()
