import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const CDP_PORT = 9299
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_qa_projects_gap')

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

    // 1. Verify Fullscreen Button on First Page (Hero scene)
    const fsStyles = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.fullscreen-toggle-btn');
        if (!btn) return { found: false };
        const cs = window.getComputedStyle(btn);
        return {
          found: true,
          opacity: cs.opacity,
          display: cs.display,
          background: cs.backgroundColor,
          border: cs.border,
          boxShadow: cs.boxShadow,
          text: btn.innerText.trim()
        };
      })()`,
      returnByValue: true,
    })
    console.log('First Page Fullscreen Button styles:', fsStyles.result.value)

    const shot1 = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_fullscreen_first_page.png'), Buffer.from(shot1.data, 'base64'))
    console.log('Saved qa_fullscreen_first_page.png')

    // 2. Verify Fullscreen Button Hiding on Scroll
    await send('Runtime.evaluate', {
      expression: `window.scrollTo(0, 400); window.dispatchEvent(new Event('scroll'));`,
    })
    await sleep(600)

    const fsStylesScrolled = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.fullscreen-toggle-btn');
        if (!btn) return { found: false };
        const cs = window.getComputedStyle(btn);
        return {
          opacity: cs.opacity,
          visibility: cs.visibility,
          classList: Array.from(btn.classList)
        };
      })()`,
      returnByValue: true,
    })
    console.log('Scrolled Fullscreen Button styles:', fsStylesScrolled.result.value)

    const shot2 = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_fullscreen_hidden_on_scroll.png'), Buffer.from(shot2.data, 'base64'))
    console.log('Saved qa_fullscreen_hidden_on_scroll.png')

    // 3. Verify Projects section (vh = 1250, 1310, 1370)
    const STAGE_TOTAL_VH = 2010
    const testPoints = [
      { vh: 1250, name: 'qa_projects_initial_density.png' },
      { vh: 1310, name: 'qa_projects_card1_collected_archive_stamp.png' },
      { vh: 1370, name: 'qa_projects_mid_continuous_flow.png' },
    ]

    for (const pt of testPoints) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const STAGE_TOTAL_VH = ${STAGE_TOTAL_VH};
          const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
          const targetY = ((${pt.vh} * window.innerHeight) / (STAGE_TOTAL_VH * window.innerHeight)) * totalScroll;
          window.scrollTo(0, targetY);
        })()`,
      })
      await sleep(1000)

      const shot = await send('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(path.join(ARTIFACTS_DIR, pt.name), Buffer.from(shot.data, 'base64'))
      console.log(`Saved ${pt.name}`)
    }

    console.log('Verification finished successfully.')
  } catch (err) {
    console.error('Error in QA script:', err)
  } finally {
    chromeProc.kill()
  }
}

run()

