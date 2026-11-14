import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9260
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_measure_grid')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1920,1080',
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
    await send('DOM.enable')
    await send('Runtime.enable')

    console.log('Navigating to http://localhost:5174/#contact...')
    await send('Page.navigate', { url: 'http://localhost:5174/#contact' })
    await sleep(2500)

    const rects = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const grid = document.querySelector('.contact-main-grid');
          const title = document.querySelector('.contact-hero-title');
          const header = document.querySelector('.contact-hero-header');
          const poster = document.querySelector('.contact-poster');
          const gRect = grid.getBoundingClientRect();
          const tRect = title.getBoundingClientRect();
          const hRect = header.getBoundingClientRect();
          const pRect = poster.getBoundingClientRect();
          return {
            grid: { top: gRect.top, bottom: gRect.bottom, left: gRect.left, width: gRect.width, height: gRect.height },
            title: { top: tRect.top, bottom: tRect.bottom, left: tRect.left, width: tRect.width, height: tRect.height },
            header: { top: hRect.top, bottom: hRect.bottom, height: hRect.height },
            poster: { top: pRect.top, bottom: pRect.bottom, height: pRect.height }
          };
        })()
      `,
      returnByValue: true
    })

    console.log('Current measurements at 1920x1080:', JSON.stringify(rects.result.value, null, 2))
    ws.close()
  } catch (err) {
    console.error('Error:', err)
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run()

