import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { heroProgress } from './heroProgress'
import { FLIGHT_CONFIG } from '../Projects/flightConfig'

function hash3(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
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

    const P_HANDOVER = FLIGHT_CONFIG.HANDOVER_P
    const P_SPAN = P_HANDOVER * 0.70
    const P_START = Math.max(0.01, P_HANDOVER - P_SPAN)
    const P_END = P_HANDOVER + P_SPAN

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

      const tau = (p - P_START) / (P_END - P_START)
      // Triangle wave 0 -> 1 -> 0
      const rawIntensity = 1.0 - Math.abs(2.0 * tau - 1.0)
      const intensity = smoothstep(0.0, 1.0, rawIntensity)

      const W = canvas.width
      const H = canvas.height

      // Cell size steps up from 8px to 44px as intensity rises
      const cell = Math.max(8, Math.min(44, Math.round(8 + 36 * intensity)))
      const cols = Math.ceil(W / cell)
      const rows = Math.ceil(H / cell)

      if (offscreen.width !== cols || offscreen.height !== rows) {
        offscreen.width = cols
        offscreen.height = rows
      }

      const imgData = offCtx.createImageData(cols, rows)
      const buf32 = new Uint32Array(imgData.data.buffer)
      buf32.fill(0) // Transparent black

      // Reversible flicker step
      const flicker = Math.floor(tau * 120)

      // Color palette in ABGR (0xAABBGGRR) format for direct 32-bit pixel buffer write
      // #ffffff -> 0xFFFFFFFF
      // #2fd0ff -> 0xFFFFD02F
      // #8fc4ff -> 0xFFFFC48F
      // #4d73d9 -> 0xFFD9734D
      // #ff7a3d -> 0xFF3D7AFF
      // #03050a -> 0xFF0A0503
      const colorsABGR = [
        0xFFFFFFFF,
        0xFFFFD02F,
        0xFFFFC48F,
        0xFFD9734D,
        0xFF3D7AFF,
      ]

      const halfC = cols / 2
      const halfR = rows / 2

      for (let r = 0; r < rows; r++) {
        const dy = (r - halfR) / halfR
        for (let c = 0; c < cols; c++) {
          const dx = (c - halfC) / halfC
          const dist = Math.sqrt(dx * dx + dy * dy)

          const h1 = hash3(c, r, flicker)
          const h2 = hash3(r, c, flicker + 37)

          // Probability of cell being active rises with intensity and center focus
          const threshold = intensity * (1.15 - 0.35 * Math.min(1.0, dist))

          if (h1 < threshold) {
            let colorIdx = 0
            if (h2 < 0.35) colorIdx = 0      // White core
            else if (h2 < 0.65) colorIdx = 1 // Cyan
            else if (h2 < 0.85) colorIdx = 2 // Electric blue
            else if (h2 < 0.95) colorIdx = 3 // Deep blue
            else colorIdx = 4                // Orange spark

            buf32[r * cols + c] = colorsABGR[colorIdx]
          } else if (h1 < threshold + 0.15 * intensity) {
            // Dark void matrix background block with alpha
            buf32[r * cols + c] = 0xAA0A0503
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0)

      // Draw nearest-neighbor scaled up to main crisp canvas
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(offscreen, 0, 0, cols, rows, 0, 0, W, H)

      // Draw to glow canvas
      glowCtx.imageSmoothingEnabled = false
      glowCtx.clearRect(0, 0, W, H)
      glowCtx.drawImage(offscreen, 0, 0, cols, rows, 0, 0, W, H)

      const op = (intensity * 0.95).toFixed(3)
      canvas.style.opacity = op
      glow.style.opacity = (intensity * 0.75).toFixed(3)
    }

    gsap.ticker.add(render)

    return () => {
      window.removeEventListener('resize', resize)
      gsap.ticker.remove(render)
    }
  }, [])

  return (
    <>
      {/* Crisp Digital Mosaic Layer */}
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
          opacity: 0,
        }}
      />
      {/* Glowing Bloom Mosaic Layer */}
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
          opacity: 0,
          filter: 'blur(8px) brightness(1.35)',
        }}
      />
    </>
  )
}

export default PixelateTransitionOverlay
