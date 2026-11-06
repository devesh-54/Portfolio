import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { heroProgress } from './heroProgress'
import { FLIGHT_CONFIG } from '../Projects/flightConfig'

function hash3(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function PixelateTransitionOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const glowCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const glow = glowCanvasRef.current
    if (!canvas || !glow) return

    const offscreen = document.createElement('canvas')
    offscreenRef.current = offscreen

    const ctx = canvas.getContext('2d')
    const glowCtx = glow.getContext('2d')
    const offCtx = offscreen.getContext('2d')
    if (!ctx || !glowCtx || !offCtx) return

    let lastActive = false

    const resize = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      canvas.width = W
      canvas.height = H
      glow.width = W
      glow.height = H
    }
    resize()
    window.addEventListener('resize', resize)

    // Handover window: wave sweeps from left to right as user scrolls from Welcome to Projects
    // Starts right as scroll begins and finishes exactly at P_HANDOVER
    const P_HANDOVER = FLIGHT_CONFIG.HANDOVER_P
    const P_START = 0.005
    const P_END = P_HANDOVER

    // Colors in ABGR (0xAABBGGRR) format for direct 32-bit write
    const COLOR_WHITE = 0xFFFFFFFF       // #ffffff (revealed project background)
    const COLOR_TRANSPARENT = 0x00000000 // Shows underlying dark Welcome 3D scene

    const render = () => {
      const p = heroProgress.get()

      if (p < P_START || p > P_END) {
        if (lastActive) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          glowCtx.clearRect(0, 0, glow.width, glow.height)
          canvas.style.display = 'none'
          glow.style.display = 'none'
          lastActive = false
        }
        return
      }

      if (!lastActive) {
        canvas.style.display = 'block'
        glow.style.display = 'block'
        lastActive = true
      }

      const W = canvas.width
      const H = canvas.height

      // Normalized progress 0.0 -> 1.0
      const t = Math.max(0, Math.min(1, (p - P_START) / (P_END - P_START)))
      // Constant linear velocity: ensures 1:1 smooth movement matching scroll without acceleration surge at 50%
      const easedT = t

      // Cell size: chunky & crisp square blocks (~26 rows across monitor height, matching projects)
      const cell = Math.max(20, Math.round(H / 26))
      const cols = Math.ceil(W / cell)
      const rows = Math.ceil(H / cell)

      if (offscreen.width !== cols || offscreen.height !== rows) {
        offscreen.width = cols
        offscreen.height = rows
      }

      const imgData = offCtx.createImageData(cols, rows)
      const buf32 = new Uint32Array(imgData.data.buffer)

      // Total travel distance in cells: from -5 to cols + 5
      const edgeBase = easedT * (cols + 10) - 5
      const flicker = Math.floor(t * 80)

      for (let r = 0; r < rows; r++) {
        // Row-by-row jitter for the wavy stair-step edge (calibrated for half cell size)
        const rowJitter = (hash3(r, 7, flicker) - 0.5) * 3.5
        const rowOffset = r * cols

        for (let c = 0; c < cols; c++) {
          const idx = rowOffset + c

          // Distance from the jagged edge in cell units
          const dist = c - (edgeBase + rowJitter)

          // Cell-level scatter noise matching Graham Mast After Effects wipe
          const noise = (hash3(c, r, flicker + 13) - 0.5) * 2.5
          const val = dist + noise

          if (val <= 0) {
            // BEHIND THE WAVE: Revealed pure clean solid WHITE (#ffffff)
            buf32[idx] = COLOR_WHITE
          } else {
            // AHEAD OF THE WAVE: Transparent, showing dark Welcome scene underneath
            buf32[idx] = COLOR_TRANSPARENT
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0)

      // Draw nearest-neighbor scaled up to main crisp canvas
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(offscreen, 0, 0, cols, rows, 0, 0, W, H)

      canvas.style.opacity = '1'
    }

    gsap.ticker.add(render)

    return () => {
      window.removeEventListener('resize', resize)
      gsap.ticker.remove(render)
    }
  }, [])

  return (
    <>
      {/* Crisp Pixel Wave Layer (wipes from left to right, revealing white) */}
      <canvas
        ref={canvasRef}
        id="pixelate-crisp-canvas"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 8,
          display: 'none',
        }}
      />
      {/* Soft Glow Layer */}
      <canvas
        ref={glowCanvasRef}
        id="pixelate-glow-canvas"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 7,
          display: 'none',
          filter: 'blur(6px) brightness(1.2)',
        }}
      />
    </>
  )
}

export default PixelateTransitionOverlay
