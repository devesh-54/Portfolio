import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 5173
const CDP_PORT = 9250
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_zoom_qa_clean')
const TOTAL_VH = 1860

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function connectCDP(port) {
  const start = Date.now()
  let wsUrl = null
  while (Date.now() - start < 15000) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`)
      const list = await res.json()
      const page = list.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break }
    } catch {}
    await sleep(250)
  }
  if (!wsUrl) throw new Error('No CDP target')
  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let nextId = 1
  const pending = new Map()
  const consoleErrors = []
  ws.onmessage = (evt) => {
    const msg = JSON.parse(evt.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    } else if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
      const txt = msg.params.args?.map((a) => a.value || a.description).join(' ')
      if (!txt?.includes('THREE.')) {
        consoleErrors.push(`[${msg.params.type}] ${txt}`)
      }
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  await send('Page.enable')
  await send('Runtime.enable')
  return {
    send,
    consoleErrors,
    evalJS: async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'JS error')
      }
      return r.result?.value
    }
  }
}

async function main() {
  console.log('=== Starting Clean Project Detail Zoom & Line QA ===')
  if (fs.existsSync(USER_DATA_DIR)) {
    try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }) } catch {}
  }
  fs.mkdirSync(USER_DATA_DIR, { recursive: true })

  let chrome = null
  try {
    chrome = spawn(CHROME_PATH, [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--headless=new',
      '--use-gl=angle',
      '--window-size=1366,768',
      `http://localhost:${PORT}/`
    ])

    const cdp = await connectCDP(CDP_PORT)
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false })
    await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/` })
    await sleep(1000)

    // Bypass welcome intro animation
    await cdp.evalJS(`try { sessionStorage.setItem('welcomeIntroPlayed', 'true'); } catch(e){}`)
    await cdp.send('Page.navigate', { url: `http://localhost:${PORT}/` })

    for (let i = 0; i < 80; i++) {
      const ready = await cdp.evalJS(`(() => {
        const nav = document.querySelector('.section-order-nav');
        const loader = document.querySelector('.loader, [class*="loader"]');
        const loaderGone = !loader || parseFloat(getComputedStyle(loader).opacity || '1') < 0.02;
        return Boolean(nav && loaderGone && window.__applyStage);
      })()`)
      if (ready) break
      await sleep(250)
    }
    await sleep(600)

    // Scroll to HOLD.projects: s = 1260 / 1860
    const sProjects = 1260 / TOTAL_VH
    await cdp.evalJS(`(() => {
      const st = window.ScrollTrigger?.getAll?.().find(t => t.trigger?.id === 'stage');
      if (st) {
        const y = st.start + ${sProjects} * (st.end - st.start);
        if (window.lenis) window.lenis.stop();
        window.scrollTo(0, y);
        st.scroll(y);
        window.ScrollTrigger.update();
      }
      window.__applyStage?.(${sProjects});
    })()`)

    for (let f = 0; f < 5; f++) {
      await cdp.evalJS(`new Promise(requestAnimationFrame)`)
    }
    await sleep(350)

    // 1. Verify header border line removed
    const headerBorder = await cdp.evalJS(`(() => {
      const h = document.querySelector('.pe-header')
      if (!h) return null
      const st = window.getComputedStyle(h)
      return {
        borderBottom: st.borderBottom,
        borderBottomWidth: st.borderBottomWidth,
        borderBottomStyle: st.borderBottomStyle,
        borderBottomColor: st.borderBottomColor,
      }
    })()`)
    console.log('1. Header border style:', headerBorder)

    // Capture screenshot of Projects section header & timeline
    const snapHeader = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_projects_line_removed.png'), Buffer.from(snapHeader.data, 'base64'))
    console.log('Saved qa_projects_line_removed.png')

    // 2. Detect cards in view
    const cardInfo = await cdp.evalJS(`(() => {
      const cards = Array.from(document.querySelectorAll('.pe-card'))
      return cards.map((c, i) => {
        const r = c.getBoundingClientRect()
        const media = c.querySelector('.pe-card-media')
        const mr = media?.getBoundingClientRect()
        const parentStation = c.closest('.pe-station')
        return {
          index: i,
          title: c.querySelector('.pe-name')?.textContent,
          stationClass: parentStation?.className,
          cardRect: { left: r.left, top: r.top, width: r.width, height: r.height },
          mediaRect: mr ? { left: mr.left, top: mr.top, width: mr.width, height: mr.height } : null
        }
      })
    })()`)
    console.log('2. Cards detected in projects view:', cardInfo)

    // 3. Test click on Card 01 (JeevaLink, on the left)
    console.log('3. Triggering click on Card 01 (JeevaLink)...')
    await cdp.evalJS(`(() => {
      const btn = document.querySelector('.pe-card .pe-view-more-btn')
      if (btn) btn.click()
      else document.querySelector('.pe-card')?.click()
    })()`)

    // Wait 120ms into opening animation
    await sleep(120)
    const midOpenMetrics = await cdp.evalJS(`(() => {
      const leftPanel = document.querySelector('.detail-left-panel')
      const dialog = document.querySelector('#project-detail-dialog')
      const r = leftPanel ? leftPanel.getBoundingClientRect() : null
      return {
        dialogOpen: dialog?.classList.contains('is-open'),
        dialogVisibility: dialog ? window.getComputedStyle(dialog).visibility : null,
        leftPanelRect: r ? { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } : null
      }
    })()`)
    console.log('3. Mid-opening animation metrics (t=120ms):', midOpenMetrics)

    const snapOpening = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_project_zoom_mid_open.png'), Buffer.from(snapOpening.data, 'base64'))
    console.log('Saved qa_project_zoom_mid_open.png')

    // Wait until animation completes (t=1200ms)
    await sleep(1100)
    const fullOpenMetrics = await cdp.evalJS(`(() => {
      const leftPanel = document.querySelector('.detail-left-panel')
      const title = document.querySelector('.detail-title')
      const r = leftPanel ? leftPanel.getBoundingClientRect() : null
      return {
        titleText: title?.textContent,
        leftPanelRect: r ? { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } : null
      }
    })()`)
    console.log('4. Full open state metrics:', fullOpenMetrics)

    const snapFull = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_project_modal_full_open.png'), Buffer.from(snapFull.data, 'base64'))
    console.log('Saved qa_project_modal_full_open.png')

    // 5. Test reverse closing animation
    console.log('5. Sending Escape key to trigger reverse close...')
    await cdp.evalJS(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
    await sleep(180)

    const midCloseMetrics = await cdp.evalJS(`(() => {
      const leftPanel = document.querySelector('.detail-left-panel')
      const r = leftPanel ? leftPanel.getBoundingClientRect() : null
      return {
        leftPanelRect: r ? { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } : null
      }
    })()`)
    console.log('5. Mid-close animation metrics (t=180ms):', midCloseMetrics)

    await sleep(1000)
    const closedMetrics = await cdp.evalJS(`(() => {
      const dialog = document.querySelector('#project-detail-dialog')
      return {
        dialogOpen: dialog?.classList.contains('is-open'),
        dialogVisibility: dialog ? window.getComputedStyle(dialog).visibility : null,
      }
    })()`)
    console.log('6. Closed state metrics:', closedMetrics)

    // 6. Test SafeChit (Card 02 on the right side) to verify right-origin zoom
    console.log('7. Triggering click on Card 02 (SafeChit, right side)...')
    await cdp.evalJS(`(() => {
      const cards = Array.from(document.querySelectorAll('.pe-card'))
      const safeChit = cards.find(c => c.querySelector('.pe-name')?.textContent?.includes('SafeChit'))
      const btn = safeChit?.querySelector('.pe-view-more-btn')
      if (btn) btn.click()
      else safeChit?.click()
    })()`)

    await sleep(120)
    const safeChitMidOpen = await cdp.evalJS(`(() => {
      const leftPanel = document.querySelector('.detail-left-panel')
      const r = leftPanel ? leftPanel.getBoundingClientRect() : null
      return {
        leftPanelRect: r ? { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } : null
      }
    })()`)
    console.log('7. SafeChit mid-opening animation metrics (originating from right card):', safeChitMidOpen)

    const snapSafeChit = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'qa_project_zoom_safechit_right.png'), Buffer.from(snapSafeChit.data, 'base64'))
    console.log('Saved qa_project_zoom_safechit_right.png')

    // Close SafeChit modal
    await sleep(1000)
    await cdp.evalJS(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
    await sleep(1000)

    console.log('Console errors:', cdp.consoleErrors)
  } finally {
    if (chrome) {
      try { chrome.kill() } catch {}
    }
  }
}

main().catch(console.error)
