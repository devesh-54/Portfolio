import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 5173
const CDP_PORT = 9266
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_mouse_qa')
const TOTAL_VH = 1960
const ACH_VH = 1735 // Flipped milestone cards in dark void

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
  console.log('=== Starting Achievements Interactive Mouse Effects QA ===')
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
    await sleep(1200)

    // Scroll directly to Achievements settled flipped state (ACH_VH)
    const s = ACH_VH / TOTAL_VH
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

    // Verify initial interactive state
    const initState = await cdp.evalJS(`(() => {
      const stage3d = document.querySelector('.ach-3d-stage');
      const cardsRow = document.querySelector('.ach-cards-row');
      const slots = document.querySelectorAll('.ach-card-slot');
      return {
        dataInteractive: stage3d?.getAttribute('data-interactive'),
        hasActive: cardsRow?.classList.contains('has-active'),
        slotsCount: slots.length,
      };
    })()`)
    console.log('Init state:', initState)

    // Step 1: Real Chrome CDP mouse move over Card 0 center
    const s0Rect = await cdp.evalJS(`(() => {
      const s0 = document.querySelector('.ach-card-slot--0');
      const r = s0?.getBoundingClientRect();
      return r ? { x: r.left + r.width * 0.5, y: r.top + r.height * 0.4 } : null;
    })()`)
    if (s0Rect) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(s0Rect.x), y: Math.round(s0Rect.y) })
    }
    await sleep(350)

    const hover0State = await cdp.evalJS(`(() => {
      const cardsRow = document.querySelector('.ach-cards-row');
      const s0 = document.querySelector('.ach-card-slot--0');
      const s1 = document.querySelector('.ach-card-slot--1');
      const s2 = document.querySelector('.ach-card-slot--2');
      const s0Face = s0?.querySelector('.ach-card-face--back');
      const s1Face = s1?.querySelector('.ach-card-face--back');
      return {
        hasActive: cardsRow?.classList.contains('has-active'),
        s0Active: s0?.classList.contains('is-active'),
        s1Active: s1?.classList.contains('is-active'),
        s0Opacity: s0 ? window.getComputedStyle(s0).opacity : null,
        s1Opacity: s1 ? window.getComputedStyle(s1).opacity : null,
        s0Border: s0Face ? window.getComputedStyle(s0Face).borderColor : null,
        s1Border: s1Face ? window.getComputedStyle(s1Face).borderColor : null,
        tiltX: s0?.style.getPropertyValue('--card-tilt-x'),
        tiltY: s0?.style.getPropertyValue('--card-tilt-y'),
        mouseX: s0?.style.getPropertyValue('--mouse-x'),
      };
    })()`)
    console.log('Hover Card 0 (via Input.dispatchMouseEvent):', hover0State)

    const snap1 = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'ach_07_mouse_hover_card_0.png'), Buffer.from(snap1.data, 'base64'))

    // Step 2: Real Chrome CDP mouse move over Card 1 (Center Card)
    const s1Rect = await cdp.evalJS(`(() => {
      const s1 = document.querySelector('.ach-card-slot--1');
      const r = s1?.getBoundingClientRect();
      return r ? { x: r.left + r.width * 0.5, y: r.top + r.height * 0.4 } : null;
    })()`)
    if (s1Rect) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(s1Rect.x), y: Math.round(s1Rect.y) })
    }
    await sleep(350)

    const hover1State = await cdp.evalJS(`(() => {
      const s0 = document.querySelector('.ach-card-slot--0');
      const s1 = document.querySelector('.ach-card-slot--1');
      const s2 = document.querySelector('.ach-card-slot--2');
      return {
        s0Active: s0?.classList.contains('is-active'),
        s1Active: s1?.classList.contains('is-active'),
        s0Opacity: s0 ? window.getComputedStyle(s0).opacity : null,
        s1Opacity: s1 ? window.getComputedStyle(s1).opacity : null,
        s2Opacity: s2 ? window.getComputedStyle(s2).opacity : null,
      };
    })()`)
    console.log('Hover Card 1:', hover1State)

    const snap2 = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'ach_08_mouse_hover_card_1.png'), Buffer.from(snap2.data, 'base64'))

    // Step 3: Click to Pin Card 1
    await cdp.evalJS(`(() => {
      const s1 = document.querySelector('.ach-card-slot--1');
      if (s1) {
        s1.click();
        // Move pointer away
        s1.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
      }
    })()`)
    await sleep(250)

    const pinnedState = await cdp.evalJS(`(() => {
      const s1 = document.querySelector('.ach-card-slot--1');
      const cue = s1?.querySelector('.ach-card-cue-text');
      return {
        isPinned: s1?.classList.contains('is-pinned'),
        isActive: s1?.classList.contains('is-active'),
        cueText: cue?.textContent,
      };
    })()`)
    console.log('Card 1 Pinned State:', pinnedState)

    const snap3 = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'ach_09_card_1_pinned.png'), Buffer.from(snap3.data, 'base64'))

    // Step 4: Press Escape key to unpin
    await cdp.evalJS(`(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    })()`)
    await sleep(250)

    const unpinnedState = await cdp.evalJS(`(() => {
      const cardsRow = document.querySelector('.ach-cards-row');
      const s0 = document.querySelector('.ach-card-slot--0');
      const s1 = document.querySelector('.ach-card-slot--1');
      return {
        hasActive: cardsRow?.classList.contains('has-active'),
        s1Pinned: s1?.classList.contains('is-pinned'),
        s0Opacity: s0 ? window.getComputedStyle(s0).opacity : null,
        s1Opacity: s1 ? window.getComputedStyle(s1).opacity : null,
      };
    })()`)
    console.log('Unpinned State:', unpinnedState)

    const snap4 = await cdp.send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'ach_10_unpinned_overview.png'), Buffer.from(snap4.data, 'base64'))

    console.log('--- TEST FINISHED ---')
    console.log('Console errors:', cdp.consoleErrors.length)
  } catch (err) {
    console.error('Test error:', err)
  } finally {
    if (chrome) chrome.kill('SIGTERM')
  }
}

main()
