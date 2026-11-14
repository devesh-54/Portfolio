import { spawn } from 'child_process'

const c = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9248',
  '--headless=new',
  '--use-gl=angle',
  '--window-size=1280,720',
  'http://localhost:5173/'
])

setTimeout(async () => {
  try {
    const r = await fetch('http://127.0.0.1:9248/json')
    const list = await r.json()
    const p = list.find(x => x.type === 'page')
    const ws = new WebSocket(p.webSocketDebuggerUrl)
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const p = document.getElementById('projects')
            if (!p) return { found: false }
            p.scrollIntoView({ behavior: 'instant', block: 'start' })
            const cs = window.getComputedStyle(p)
            const r = p.getBoundingClientRect()
            return {
              found: true,
              rect: { left: r.left, top: r.top, width: r.width, height: r.height },
              display: cs.display,
              visibility: cs.visibility,
              opacity: cs.opacity,
              zIndex: cs.zIndex,
              background: cs.backgroundColor,
              cardCount: p.querySelectorAll('.pe-card').length,
              headerText: p.querySelector('.pe-title')?.textContent,
              // check what element is at (640, 360)
              elementFromPoint: document.elementFromPoint(640, 360)?.className
            }
          })()`,
          returnByValue: true
        }
      }))
    }
    ws.onmessage = (e) => {
      console.log('Result:', JSON.parse(e.data).result?.result?.value)
      c.kill()
      process.exit(0)
    }
  } catch (err) {
    console.error(err)
    c.kill()
    process.exit(1)
  }
}, 2500)

