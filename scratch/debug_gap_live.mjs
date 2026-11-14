import { spawn } from 'node:child_process'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9297
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_qa_debug_gap')

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

    await send('Page.navigate', { url: 'http://localhost:5174/' })
    await sleep(3500)

    const STAGE_TOTAL_VH = 2010
    const debug = await send('Runtime.evaluate', {
      expression: `(() => {
        const STAGE_TOTAL_VH = ${STAGE_TOTAL_VH};
        const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
        const targetY = ((1300 * window.innerHeight) / (STAGE_TOTAL_VH * window.innerHeight)) * totalScroll;
        window.scrollTo(0, targetY);

        const container = document.querySelector('.pe-stage');
        const timeline = document.querySelector('.pe-timeline');
        const spine = document.querySelector('.pe-spine-fill');
        const bot = document.querySelector('.pe-bot');

        return {
          scrollY: window.scrollY,
          containerRevealP: container?.dataset?.revealP,
          containerStreamP: container?.dataset?.streamP,
          timelineH: timeline?.clientHeight,
          timelineW: timeline?.clientWidth,
          spineStyle: spine ? {
            top: spine.style.top,
            height: spine.style.height,
            transform: spine.style.transform,
            opacity: spine.style.opacity
          } : null,
          botStyle: bot ? {
            top: bot.style.top,
            transform: bot.style.transform,
            opacity: bot.style.opacity
          } : null,
          spineRect: spine?.getBoundingClientRect(),
          botRect: bot?.getBoundingClientRect()
        };
      })()`,
      returnByValue: true,
    })

    console.log('DEBUG 1300vh:', JSON.stringify(debug.result.value, null, 2))
  } catch (err) {
    console.error(err)
  } finally {
    chromeProc.kill()
  }
}

run()

