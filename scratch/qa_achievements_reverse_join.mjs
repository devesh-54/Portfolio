import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\deves\\.gemini\\antigravity\\brain\\2de691e0-6755-4ad6-9db3-7953879536fc'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 5173
const CDP_PORT = 9277
const USER_DATA_DIR = path.join(ARTIFACTS_DIR, 'scratch', 'chrome_reverse_qa')
const TOTAL_VH = 1960

const CHECKPOINTS = [
  { name: 'ach_exit_01_holding_achievements', vh: 1750, desc: 'Holding in Achievements: 3 separated cards + title above' },
  { name: 'ach_exit_02_title_fades_cards_joining', vh: 1795, desc: 'Exit begins: Title glides up & fades out without coming to center; cards un-fan inward' },
  { name: 'ach_exit_03_cards_joined_cut_lines', vh: 1825, desc: 'Cards joined flush (gap 0px, 0 deg rotation) + 2 cut lines visible at seams' },
  { name: 'ach_exit_04_cuts_retract_to_center', vh: 1845, desc: 'Cut lines retract symmetrically to center, fusing the 3 cards into 1 single block' },
  { name: 'ach_exit_05_contact_entering', vh: 1860, desc: 'Fused dark box dissolves while Contact card fades in and rises into place' },
  { name: 'ach_exit_06_contact_settled', vh: 1885, desc: 'Contact section fully settled and interactive on dark void' },
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
  console.log('=== Starting Achievements Reversing Join to Contact Verification ===')
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
        const titleGroup = document.querySelector('.ach-main-title-group');
        const stage3d = document.querySelector('.ach-3d-stage');
        const cut1 = document.querySelector('.ach-cut-line--1');
        const cut2 = document.querySelector('.ach-cut-line--2');
        const s0 = document.querySelector('.ach-card-slot--0');
        const s1 = document.querySelector('.ach-card-slot--1');
        const s2 = document.querySelector('.ach-card-slot--2');
        const inner0 = s0?.querySelector('.ach-card-inner-3d');
        const inner2 = s2?.querySelector('.ach-card-inner-3d');
        const contactScreen = document.querySelector('#contact');
        const contactContent = contactScreen?.querySelector('.contact-rows-card');

        return {
          titleOpacity: titleGroup ? titleGroup.style.opacity : null,
          titleTransform: titleGroup ? titleGroup.style.transform : null,
          gap: stage3d ? stage3d.style.getPropertyValue('--ach-gap') : null,
          stage3dOpacity: stage3d ? stage3d.style.opacity : null,
          cut1ScaleY: cut1 ? cut1.style.transform : null,
          cut1Opacity: cut1 ? cut1.style.opacity : null,
          rot0: inner0 ? inner0.style.transform : null,
          rot2: inner2 ? inner2.style.transform : null,
          contactVisibility: contactScreen ? contactScreen.style.visibility : null,
          contactOpacity: contactScreen ? contactScreen.style.opacity : null,
          contactTransform: contactScreen ? contactScreen.style.transform : null,
        };
      })()`)

      console.log(`[${cp.name}] (${cp.desc}):`, state)

      const snap = await cdp.send('Page.captureScreenshot', { format: 'png' })
      const outPath = path.join(ARTIFACTS_DIR, `${cp.name}.png`)
      fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'))
    }

    console.log('--- ALL CHECKPOINTS VERIFIED ---')
    console.log('Console errors:', cdp.consoleErrors.length)
  } catch (err) {
    console.error('Test error:', err)
  } finally {
    if (chrome) chrome.kill('SIGTERM')
  }
}

main()
