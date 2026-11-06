import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { heroProgress } from './heroProgress'
import { FLIGHT_CONFIG } from '../Projects/flightConfig'

function hash3(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
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
    const P_HANDOVER = FLIGHT_CONFIG.HANDOVER_P
    const P_START = Math.max(0.01, P_HANDOVER - 0.10)
    const P_END = P_HANDOVER + 0.10

    // Colors in ABGR (0xAABBGGRR) format for direct 32-bit write
    const COLOR_WHITE = 0xFFFFFFFF       // #ffffff (revealed project background)
    const COLOR_DARK_VOID = 0xFF0A0503   // #03050a (Welcome void background)
    const COLOR_DARK_NAVY = 0xFF50120F   // #0f1250 (Dark navy from Welcome palette)
    const COLOR_INK_BLUE  = 0xFF911A10   // #101a91 (Ink blue)
    const COLOR_CYAN_GLOW = 0xFFFFD02F   // #2fd0ff (Cyber cyan accent at wave crest)
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
      const easedT = easeInOutCubic(t)

      // Cell size: ~28px square retro pixels
      const cell = Math.max(20, Math.min(38, Math.round(H / 28)))
      const cols = Math.ceil(W / cell)
      const rows = Math.ceil(H / cell)

      if (offscreen.width !== cols || offscreen.height !== rows) {
        offscreen.width = cols
        offscreen.height = rows
      }

      const imgData = offCtx.createImageData(cols, rows)
      const buf32 = new Uint32Array(imgData.data.buffer)

      // Wave band geometry (width ~6 cells)
      const bandCols = 6
      const edgeBase = easedT * (cols + bandCols + 4) - 2
      const flicker = Math.floor(t * 120)

      for (let r = 0; r < rows; r++) {
        // Deterministic edge jitter per row
        const jitter = (hash3(r, 11, flicker) - 0.5) * 2.2
        const edgeR = edgeBase + jitter

        const rowOffset = r * cols

        for (let c = 0; c < cols; c++) {
          const idx = rowOffset + c

          if (c < edgeR - bandCols) {
            // 1. BEHIND THE WAVE (left side):
            // Swept clean to pure WHITE (#ffffff) project background
            buf32[idx] = COLOR_WHITE

          } else if (c <= edgeR) {
            // 2. INSIDE THE PIXEL WAVE BAND:
            // Moving wave made of dark Welcome-colored pixels with glowing leading edge
            const bandT = (c - (edgeR - bandCols)) / bandCols // 0 at rear, 1 at front
            const h = hash3(c, r, flicker)
            const hColor = hash3(r, c, flicker + 37)

            if (bandT > 0.82 && h < 0.40) {
              // Leading edge glowing cyan / white hot crest
              buf32[idx] = hColor < 0.5 ? COLOR_CYAN_GLOW : COLOR_WHITE
            } else if (h < 0.90) {
              // Dark Welcome page colors
              if (hColor < 0.45) buf32[idx] = COLOR_DARK_VOID
              else if (hColor < 0.75) buf32[idx] = COLOR_DARK_NAVY
              else buf32[idx] = COLOR_INK_BLUE
            } else {
              buf32[idx] = COLOR_WHITE
            }

          } else if (c < edgeR + 2) {
            // 3. SPARKS JUST AHEAD OF THE WAVE:
            const h = hash3(c, r, flicker)
            if (h < 0.18) {
              buf32[idx] = COLOR_DARK_VOID
            } else {
              buf32[idx] = COLOR_TRANSPARENT
            }

          } else {
            // 4. AHEAD OF THE WAVE (right side):
            // Transparent (shows dark Welcome 3D scene underneath)
            buf32[idx] = COLOR_TRANSPARENT
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0)

      // Draw nearest-neighbor scaled up to main crisp canvas
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(offscreen, 0, 0, cols, rows, 0, 0, W, H)

      // Draw glow canvas (blurred)
      glowCtx.imageSmoothingEnabled = false
      glowCtx.clearRect(0, 0, W, H)
      glowCtx.drawImage(offscreen, 0, 0, cols, rows, 0, 0, W, H)

      canvas.style.opacity = '1'
      glow.style.opacity = '0.6'
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
