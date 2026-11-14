import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 5173
const CDP_PORT = 9280
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_pure_dark_qa')
const TOTAL_VH = 1960

const CHECKPOINTS = [
  { name: 'ach_dark_shadow_01_fused_with_shadow_dividers', vh: 1820, desc: 'Fused dark box with outer border, elevation shadow, and dark shadow groove dividers' },
  { name: 'ach_dark_shadow_02_shadow_dissolving', vh: 1836, desc: 'Same shadow effect in reverse: elevation shadow, border, and grooves dissolving into void' },
  { name: 'ach_dark_shadow_03_black_screen', vh: 1848, desc: 'Box completely gone (hidden), clean black screen' },
  { name: 'ach_dark_shadow_04_contact', vh: 1885, desc: 'Contact page shows up on black screen' },
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

  const evalJS = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'JS error')
    }
    return r.result?.value
  }

  return { send, evalJS, consoleErrors, close: () => ws.close() }
}

async function main() {
  console.log('=== Verifying Pure Dark Joining, Box Disappearance & Black Screen Contact Entrance ===')
  if (fs.existsSync(USER_DATA_DIR)) {
    try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }) } catch {}
  }
  fs.mkdirSync(USER_DATA_DIR, { recursive: true })

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--window-size=1440,900',
    `http://localhost:${PORT}/`,
  ])

  try {
    const cdp = await connectCDP(CDP_PORT)
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
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
        const stage3d = document.querySelector('.ach-3d-stage');
        const cut1 = document.querySelector('.ach-cut-line--1');
        const cut2 = document.querySelector('.ach-cut-line--2');
        const b0 = document.querySelector('.ach-card-slot--0 .ach-card-face--back');
        const b1 = document.querySelector('.ach-card-slot--1 .ach-card-face--back');
        const b2 = document.querySelector('.ach-card-slot--2 .ach-card-face--back');
        const contactScreen = document.querySelector('#contact');

        // Check text child opacity inside b1
        const b1Title = b1?.querySelector('.ach-back-title');

        return {
          gap: stage3d?.style.getPropertyValue('--ach-gap'),
          stage3dOpacity: stage3d?.style.opacity,
          stage3dVisibility: stage3d?.style.visibility,
          cut1Opacity: cut1?.style.opacity,
          cut2Opacity: cut2?.style.opacity,
          b0BorderRight: b0?.style.borderRight,
          b1BorderLeft: b1?.style.borderLeft,
          b1BorderRight: b1?.style.borderRight,
          b2BorderLeft: b2?.style.borderLeft,
          cardTextOpacity: b1Title ? getComputedStyle(b1Title).opacity : null,
          contactVisibility: contactScreen?.style.visibility,
          contactOpacity: contactScreen?.style.opacity,
          contactTransform: contactScreen?.style.transform
        };
      })()`)

      console.log(`[${cp.name}] (${cp.desc}):`, JSON.stringify(state, null, 2))

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(path.join(ARTIFACTS_DIR, `${cp.name}.png`), Buffer.from(shot.data, 'base64'))
    }

    console.log('--- ALL CHECKS COMPLETED ---')
    console.log('Console errors:', cdp.consoleErrors.length)
    cdp.close()
  } finally {
    chromeProc.kill()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

