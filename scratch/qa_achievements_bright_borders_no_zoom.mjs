import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 5173
const CDP_PORT = 9279
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_bright_borders_qa')
const TOTAL_VH = 1960

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
  console.log('=== Verifying Bright Card Borders & No Zoom Interaction ===')
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

    // Scroll to Achievements hold stage (1750vh)
    const s = 1750 / TOTAL_VH
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
    await sleep(300)

    // Check 1: Resting state with bright borders on all 3 cards
    const restingCheck = await cdp.evalJS(`(() => {
      const backs = document.querySelectorAll('.ach-card-face--back');
      const info = [];
      backs.forEach((b, idx) => {
        const cs = getComputedStyle(b);
        info.push({
          card: idx,
          border: cs.border,
          borderColor: cs.borderColor,
          borderWidth: cs.borderWidth,
          boxShadow: cs.boxShadow,
          transform: cs.transform
        });
      });
      return { count: backs.length, info };
    })()`)
    console.log('[Check 1 - Resting State Bright Borders]:', JSON.stringify(restingCheck, null, 2))

    let shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'ach_bright_borders_resting.png'), Buffer.from(shot.data, 'base64'))

    // Check 2: Mouse move over Card 1 (Center card) — tilt without zoom
    const c1 = await cdp.evalJS(`(() => {
      const slot1 = document.querySelector('.ach-card-slot--1');
      if (!slot1) return null;
      const rect = slot1.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    })()`)

    if (c1) {
      const targetX = c1.left + c1.width * 0.75
      const targetY = c1.top + c1.height * 0.25

      await cdp.evalJS(`(() => {
        const slot1 = document.querySelector('.ach-card-slot--1');
        const evtEnter = new MouseEvent('mouseenter', { bubbles: true, clientX: ${targetX}, clientY: ${targetY} });
        slot1.dispatchEvent(evtEnter);
        const evtMove = new MouseEvent('mousemove', { bubbles: true, clientX: ${targetX}, clientY: ${targetY} });
        slot1.dispatchEvent(evtMove);
      })()`)
      await sleep(350)

      const hover1Check = await cdp.evalJS(`(() => {
        const slot0 = document.querySelector('.ach-card-slot--0');
        const slot1 = document.querySelector('.ach-card-slot--1');
        const slot2 = document.querySelector('.ach-card-slot--2');
        const b1 = slot1.querySelector('.ach-card-face--back');
        const cs1 = getComputedStyle(b1);
        const cs0 = getComputedStyle(slot0);
        const cs2 = getComputedStyle(slot2);

        return {
          card1TiltX: slot1.style.getPropertyValue('--card-tilt-x'),
          card1TiltY: slot1.style.getPropertyValue('--card-tilt-y'),
          card1BorderColor: cs1.borderColor,
          card1Transform: cs1.transform,
          slot0Opacity: cs0.opacity,
          slot2Opacity: cs2.opacity,
          hasActiveZoom: b1.style.transform.includes('scale')
        };
      })()`)
      console.log('[Check 2 - Card 1 Hovered]:', JSON.stringify(hover1Check, null, 2))

      shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'ach_bright_borders_hover_card1.png'), Buffer.from(shot.data, 'base64'))
    }

    // Check 3: Mouse move over Card 0 (Left card)
    const c0 = await cdp.evalJS(`(() => {
      const slot0 = document.querySelector('.ach-card-slot--0');
      if (!slot0) return null;
      const rect = slot0.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    })()`)

    if (c0) {
      const targetX = c0.left + c0.width * 0.3
      const targetY = c0.top + c0.height * 0.7

      await cdp.evalJS(`(() => {
        const slot1 = document.querySelector('.ach-card-slot--1');
        const evtLeave = new MouseEvent('mouseleave', { bubbles: true });
        slot1.dispatchEvent(evtLeave);

        const slot0 = document.querySelector('.ach-card-slot--0');
        const evtEnter = new MouseEvent('mouseenter', { bubbles: true, clientX: ${targetX}, clientY: ${targetY} });
        slot0.dispatchEvent(evtEnter);
        const evtMove = new MouseEvent('mousemove', { bubbles: true, clientX: ${targetX}, clientY: ${targetY} });
        slot0.dispatchEvent(evtMove);
      })()`)
      await sleep(350)

      const hover0Check = await cdp.evalJS(`(() => {
        const slot0 = document.querySelector('.ach-card-slot--0');
        const slot1 = document.querySelector('.ach-card-slot--1');
        const b0 = slot0.querySelector('.ach-card-face--back');
        const cs0 = getComputedStyle(b0);

        return {
          card0TiltX: slot0.style.getPropertyValue('--card-tilt-x'),
          card0TiltY: slot0.style.getPropertyValue('--card-tilt-y'),
          card0BorderColor: cs0.borderColor,
          slot1Opacity: getComputedStyle(slot1).opacity
        };
      })()`)
      console.log('[Check 3 - Card 0 Hovered]:', JSON.stringify(hover0Check, null, 2))

      shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'ach_bright_borders_hover_card0.png'), Buffer.from(shot.data, 'base64'))
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
