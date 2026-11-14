import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9298
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_qa_final')

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
          const data = JSON.parse(event.data)
          if (data.id === msgId) {
            ws.removeEventListener('message', handler)
            resolve(data.result)
          }
        }
        ws.addEventListener('message', handler)
        ws.send(JSON.stringify({ id: msgId, method, params }))
      })
    }

    await send('Page.enable')
    await send('Runtime.enable')

    console.log('Navigating to http://localhost:5174/ ...')
    await send('Page.navigate', { url: 'http://localhost:5174/' })
    await sleep(3500)

    // Capture First Page with Fullscreen button
    const shotHero = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_final_first_page_fullscreen.png'), Buffer.from(shotHero.data, 'base64'))
    console.log('Saved qa_final_first_page_fullscreen.png')

    // Inspect geometry of spine and robot in Projects section
    const STAGE_TOTAL_VH = 2010
    const scrollTargets = [
      { vh: 1240, label: 'qa_final_projects_stream_start.png' },
      { vh: 1300, label: 'qa_final_projects_stream_mid1.png' },
      { vh: 1360, label: 'qa_final_projects_stream_mid2.png' },
      { vh: 1420, label: 'qa_final_projects_stream_late.png' },
    ]

    for (const target of scrollTargets) {
      const geo = await send('Runtime.evaluate', {
        expression: `(() => {
          const STAGE_TOTAL_VH = ${STAGE_TOTAL_VH};
          const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
          const targetY = ((${target.vh} * window.innerHeight) / (STAGE_TOTAL_VH * window.innerHeight)) * totalScroll;
          window.scrollTo(0, targetY);
          
          const spine = document.querySelector('.pe-spine-fill');
          const bot = document.querySelector('.pe-bot');
          const fsBtn = document.querySelector('.fullscreen-toggle-btn');
          
          const sRect = spine ? spine.getBoundingClientRect() : null;
          const bRect = bot ? bot.getBoundingClientRect() : null;
          const fsOpacity = fsBtn ? window.getComputedStyle(fsBtn).opacity : null;

          return {
            vh: ${target.vh},
            scrollY: window.scrollY,
            spineBottom: sRect ? sRect.bottom : null,
            botTop: bRect ? bRect.top : null,
            gapPx: (sRect && bRect) ? (bRect.top - sRect.bottom) : null,
            fullscreenBtnOpacity: fsOpacity,
            visibleCards: Array.from(document.querySelectorAll('.pe-card'))
              .filter(c => window.getComputedStyle(c).display !== 'none' && window.getComputedStyle(c).opacity > 0.05)
              .map(c => c.querySelector('.pe-card-title')?.innerText || 'card')
          };
        })()`,
        returnByValue: true,
      })

      console.log(`Target ${target.vh}vh:`, geo.result.value)
      await sleep(600)
      const shot = await send('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(path.join(ARTIFACTS_DIR, target.label), Buffer.from(shot.data, 'base64'))
      console.log(`Saved ${target.label}`)
    }

  } catch (err) {
    console.error('Error during QA execution:', err)
  } finally {
    chromeProc.kill()
  }
}

run()

