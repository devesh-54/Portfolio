import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const PROJECT_DIR = 'C:\\Users\\deves\\OneDrive\\project_main\\Portfolio\\devesh-portfolio'
const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 5173
const CDP_PORT = 9255
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_ach_3d_qa')
const TOTAL_VH = 1960

const CHECKPOINTS = [
  { name: 'ach_01_white_screen_start', vh: 1522, desc: 'Pure white page as Projects exits' },
  { name: 'ach_02_title_at_center_no_box', vh: 1560, desc: 'Title drops from top and sits at center on clean white background (no box yet)' },
  { name: 'ach_03_box_forms_around_title', vh: 1585, desc: 'Box forms around the centered title with solid perimeter border' },
  { name: 'ach_04_cuts_expand_from_center', vh: 1600, desc: 'Two cut lines expand symmetrically from vertical center outward (top and bottom)' },
  { name: 'ach_04b_cuts_full_height', vh: 1610, desc: 'Cut lines reach full height dividing the box into 3 pieces' },
  { name: 'ach_05_break_title_moves_upper', vh: 1650, desc: 'Box breaks into 3 parts & title glides upper above the cards' },
  { name: 'ach_06a_mid_flip_no_white_center', vh: 1695, desc: 'Cards at 90° flip: verify no white streak in center, no mirrored text' },
  { name: 'ach_06_cards_flip_dark_void', vh: 1735, desc: 'Cards 180° flip: black void + white title above + B&W milestone cards' }
]

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
  console.log('=== Starting Achievements Title-First & Move-Upper Verification ===')
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

    const results = []

    for (const cp of CHECKPOINTS) {
      const s = cp.vh / TOTAL_VH
      await cdp.evalJS(`(() => {
        const st = window.ScrollTrigger?.getAll?.().find(t => t.trigger?.id === 'stage');
        if (st) {
          const y = st.start + ${s} * (st.end - st.start);
          if (window.lenis) window.lenis.stop();
          window.scrollTo(0, y);
          st.scroll(y);
          window.ScrollTrigger.update();
        }
        window.__applyStage?.(${s});
      })()`)

      for (let f = 0; f < 5; f++) {
        await cdp.evalJS(`new Promise(requestAnimationFrame)`)
      }
      await sleep(200)

      const state = await cdp.evalJS(`(() => {
        const stageEl = document.querySelector('.ach-stage');
        const titleGroup = document.querySelector('.ach-main-title-group');
        const titleEl = document.querySelector('.ach-main-title');
        const eyebrowEl = document.querySelector('.ach-main-eyebrow');
        const siteHeader = document.getElementById('site-header');
        const cut1 = document.querySelector('.ach-cut-line--1');
        const cut2 = document.querySelector('.ach-cut-line--2');
        const stage3d = document.querySelector('.ach-3d-stage');
        const slot0 = document.querySelector('.ach-card-slot--0');
        const slot1 = document.querySelector('.ach-card-slot--1');
        const slot2 = document.querySelector('.ach-card-slot--2');
        const face0 = slot0?.querySelector('.ach-card-face--front');
        const face1 = slot1?.querySelector('.ach-card-face--front');
        const face2 = slot2?.querySelector('.ach-card-face--front');
        const inner0 = slot0?.querySelector('.ach-card-inner-3d');
        const inner1 = slot1?.querySelector('.ach-card-inner-3d');
        const inner2 = slot2?.querySelector('.ach-card-inner-3d');

        const titleGroupR = titleGroup?.getBoundingClientRect();
        const stage3dR = stage3d?.getBoundingClientRect();
        const s0R = slot0?.getBoundingClientRect();
        const s1R = slot1?.getBoundingClientRect();
        const s2R = slot2?.getBoundingClientRect();

        return {
          bgColor: stageEl ? window.getComputedStyle(stageEl).backgroundColor : null,
          headerTheme: siteHeader?.getAttribute('data-theme'),
          titleTransform: titleGroup ? titleGroup.style.transform : null,
          titleOpacity: titleGroup ? titleGroup.style.opacity : null,
          titleColor: titleEl ? window.getComputedStyle(titleEl).color : null,
          titleTop: titleGroupR ? titleGroupR.top : null,
          stage3dTop: stage3dR ? stage3dR.top : null,
          stage3dOpacity: stage3d ? stage3d.style.opacity : null,
          stage3dBorder: face0 ? face0.style.borderColor : null,
          gap: stage3d ? stage3d.style.getPropertyValue('--ach-gap') : null,
          cut1ScaleY: cut1 ? cut1.style.transform : null,
          cut1Opacity: cut1 ? cut1.style.opacity : null,
          slot0Transform: inner0 ? inner0.style.transform : null,
          slot1Transform: inner1 ? inner1.style.transform : null,
          slot2Transform: inner2 ? inner2.style.transform : null,
          slot0Left: s0R ? s0R.left : null,
          slot1Left: s1R ? s1R.left : null,
          slot2Left: s2R ? s2R.left : null
        }
      })()`)

      console.log(`[${cp.name}] (${cp.desc}):`, state)
      results.push({ checkpoint: cp.name, state })

      const snap = await cdp.send('Page.captureScreenshot', { format: 'png' })
      const outPath = path.join(ARTIFACTS_DIR, `${cp.name}.png`)
      fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'))
      console.log(`Saved screenshot to ${outPath}`)
    }

    console.log('--- TEST SUMMARY ---')
    console.log(`Total checkpoints verified: ${results.length}`)
    console.log(`Console errors: ${cdp.consoleErrors.length}`)
    if (cdp.consoleErrors.length > 0) {
      console.log('Errors:', cdp.consoleErrors)
    }
  } finally {
    if (chrome) {
      try { chrome.kill() } catch {}
    }
  }
}

main().catch(console.error)
