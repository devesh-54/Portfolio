import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9290
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_verify_email')

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
    await send('Runtime.enable')

    console.log('Navigating to http://localhost:5174/#contact...')
    await send('Page.navigate', { url: 'http://localhost:5174/#contact' })
    await sleep(2000)

    const result = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const emailLink = document.querySelector('a[href^="mailto:"]');
          const emailVal = emailLink ? emailLink.querySelector('.contact-link-val')?.textContent : null;
          const href = emailLink ? emailLink.getAttribute('href') : null;
          const copyBtn = document.querySelector('.contact-action-btn--copy');
          return {
            displayedText: emailVal,
            href: href,
            copyBtnText: copyBtn ? copyBtn.textContent : null
          };
        })()
      `,
      returnByValue: true
    })

    console.log('Verification result:', JSON.stringify(result.result.value, null, 2))

    const shot = await send('Page.captureScreenshot', { format: 'png' })
    const outShot = path.join(ARTIFACTS_DIR, 'qa_email_updated.png')
    fs.writeFileSync(outShot, Buffer.from(shot.data, 'base64'))
    console.log('Saved qa_email_updated.png')

    ws.close()
  } catch (err) {
    console.error('Error:', err)
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run()

