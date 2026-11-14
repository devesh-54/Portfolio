import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9299
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_contact_font_test')

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
    await sleep(2000)
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

    await send('Page.navigate', { url: 'http://localhost:5174/#contact' })
    await sleep(2500)

    // Option 1: Nippo font with current 3D text-shadow & weight 900
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const title = document.querySelector('.contact-hero-title');
          if (title) title.style.fontFamily = "var(--font-display, inherit)";
          document.querySelectorAll('.contact-profile-name').forEach(el => el.style.fontFamily = "var(--font-display, inherit)");
          document.querySelectorAll('.contact-profile-role, .contact-avail-text, .contact-action-btn, .contact-link-label, .contact-link-val').forEach(el => el.style.fontFamily = "var(--font-sans)");
        })()
      `
    })
    await sleep(500)
    let shot = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_contact_font_nippo_w900.png'), Buffer.from(shot.data, 'base64'))
    console.log('Saved qa_contact_font_nippo_w900.png')

    // Option 2: Nippo font with weight 300 / normal (like Achievements/Projects)
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const title = document.querySelector('.contact-hero-title');
          if (title) {
            title.style.fontWeight = "300";
            title.style.letterSpacing = "0.01em";
          }
        })()
      `
    })
    await sleep(500)
    shot = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_contact_font_nippo_w300.png'), Buffer.from(shot.data, 'base64'))
    console.log('Saved qa_contact_font_nippo_w300.png')

    // Option 3: Clean flat black Nippo title (no 3D text shadow, exactly like Projects / Skills / Achievements title)
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const title = document.querySelector('.contact-hero-title');
          if (title) {
            title.style.color = "#000000";
            title.style.textShadow = "none";
            title.style.fontWeight = "300";
            title.style.letterSpacing = "0.01em";
          }
        })()
      `
    })
    await sleep(500)
    shot = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_contact_font_nippo_flat_black.png'), Buffer.from(shot.data, 'base64'))
    console.log('Saved qa_contact_font_nippo_flat_black.png')

    ws.close()
  } finally {
    chromeProc.kill('SIGKILL')
  }
}

run().catch(console.error)

