import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9252
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_contact_mobile_only')

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=390,844',
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

    console.log('Navigating to http://localhost:5174/ (Mobile)...')
    await send('Page.navigate', { url: 'http://localhost:5174/' })
    await sleep(2500)

    console.log('Scrolling to contact and triggering ScrollTrigger...')
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const contact = document.getElementById('contact');
          if (contact) {
            contact.scrollIntoView({ block: 'start' });
            window.dispatchEvent(new Event('scroll'));
            if (window.ScrollTrigger) {
              window.ScrollTrigger.refresh();
              window.ScrollTrigger.update();
            }
          }
        })()
      `
    })
    await sleep(1500)

    const shotMobile = await send('Page.captureScreenshot', { format: 'png' })
    const outMobile = path.join(ARTIFACTS_DIR, 'qa_contact_mobile_real.png')
    fs.writeFileSync(outMobile, Buffer.from(shotMobile.data, 'base64'))
    console.log('Saved mobile screenshot:', outMobile)

    ws.close()
  } catch (err) {
    console.error('Error:', err)
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run()
