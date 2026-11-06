import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { About } from '../pages/About'
import { Skills } from '../pages/Skills'
import { Contact } from '../pages/Contact'
import { PixelScanEngine } from '../transitions/pixelScan'
import { voidBg } from '../config/theme'
import './PixelStage.css'

gsap.registerPlugin(ScrollTrigger)

// Sequence cumulative vh values
// Trans 0 (void -> about): 100vh  -> [0, 100]
// Hold about:              70vh   -> [100, 170], mid = 135
// Trans 1 (about -> skills): 100vh -> [170, 270]
// Hold skills:             70vh   -> [270, 340], mid = 305
// Trans 2 (skills -> contact): 100vh -> [340, 440]
// Hold contact:            70vh   -> [440, 510], mid = 475
export const STAGE_TOTAL_VH = 510

export const STAGE_HOLD_PROGRESS = {
  about: 135 / STAGE_TOTAL_VH,
  skills: 305 / STAGE_TOTAL_VH,
  contact: 475 / STAGE_TOTAL_VH,
} as const

// Normalized segment boundaries
const TRANS_0 = { start: 0 / STAGE_TOTAL_VH, end: 100 / STAGE_TOTAL_VH }
const TRANS_1 = { start: 170 / STAGE_TOTAL_VH, end: 270 / STAGE_TOTAL_VH }
const TRANS_2 = { start: 340 / STAGE_TOTAL_VH, end: 440 / STAGE_TOTAL_VH }

export interface PixelStageProps {
  onStageTriggerCreated?: (trigger: ScrollTrigger) => void
  onCanvasPauseChange?: (paused: boolean) => void
}

export function PixelStage({ onStageTriggerCreated, onCanvasPauseChange }: PixelStageProps) {
  const stageRef = useRef<HTMLElement | null>(null)
  const aboutScreenRef = useRef<HTMLDivElement | null>(null)
  const skillsScreenRef = useRef<HTMLDivElement | null>(null)
  const contactScreenRef = useRef<HTMLDivElement | null>(null)

  const crispCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const glowCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const engineRef = useRef<PixelScanEngine | null>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const triggerRef = useRef<ScrollTrigger | null>(null)

  // Initialize engine & offscreen canvas once
  if (!engineRef.current && typeof window !== 'undefined') {
    engineRef.current = new PixelScanEngine(window.innerWidth, window.innerHeight)
    offscreenCanvasRef.current = document.createElement('canvas')
    offscreenCanvasRef.current.width = engineRef.current.cols
    offscreenCanvasRef.current.height = engineRef.current.rows
  }

  const applyStage = useCallback((sRaw: number) => {
    const s = Math.max(0, Math.min(1, sRaw))
    const engine = engineRef.current
    if (!engine) return

    // 1. Calculate local progress for each transition
    let P0 = 0
    if (s > TRANS_0.start) {
      P0 = s >= TRANS_0.end ? 1 : (s - TRANS_0.start) / (TRANS_0.end - TRANS_0.start)
    }

    let P1 = 0
    if (s > TRANS_1.start) {
      P1 = s >= TRANS_1.end ? 1 : (s - TRANS_1.start) / (TRANS_1.end - TRANS_1.start)
    }

    let P2 = 0
    if (s > TRANS_2.start) {
      P2 = s >= TRANS_2.end ? 1 : (s - TRANS_2.start) / (TRANS_2.end - TRANS_2.start)
    }

    // 2. Determine active transition (at most one transition has 0 < P < 1)
    let activeK = -1
    if (P0 > 0 && P0 < 1) {
      activeK = 0
    } else if (P1 > 0 && P1 < 1) {
      activeK = 1
    } else if (P2 > 0 && P2 < 1) {
      activeK = 2
    }

    // 3. Update incoming screen 0 (About)
    const aboutEl = aboutScreenRef.current
    if (aboutEl) {
      if (P0 <= 0) {
        aboutEl.style.visibility = 'hidden'
        aboutEl.style.clipPath = 'none'
      } else if (P0 >= 0.999) {
        aboutEl.style.visibility = 'visible'
        aboutEl.style.clipPath = 'none'
      } else {
        const res = engine.computeScan(P0, 1, 'darkToLight')
        aboutEl.style.visibility = 'visible'
        aboutEl.style.clipPath = res.clip
        ;(aboutEl.style as any).webkitClipPath = res.clip
      }
    }

    // 4. Update incoming screen 1 (Skills)
    const skillsEl = skillsScreenRef.current
    if (skillsEl) {
      if (P1 <= 0) {
        skillsEl.style.visibility = 'hidden'
        skillsEl.style.clipPath = 'none'
      } else if (P1 >= 0.999) {
        skillsEl.style.visibility = 'visible'
        skillsEl.style.clipPath = 'none'
      } else {
        const res = engine.computeBurst(P1, 'lightToLight')
        skillsEl.style.visibility = 'visible'
        skillsEl.style.clipPath = res.clip
        ;(skillsEl.style as any).webkitClipPath = res.clip
      }
    }

    // 5. Update incoming screen 2 (Contact)
    const contactEl = contactScreenRef.current
    if (contactEl) {
      if (P2 <= 0) {
        contactEl.style.visibility = 'hidden'
        contactEl.style.clipPath = 'none'
      } else if (P2 >= 0.999) {
        contactEl.style.visibility = 'visible'
        contactEl.style.clipPath = 'none'
      } else {
        const res = engine.computeScan(P2, -1, 'lightToLight')
        contactEl.style.visibility = 'visible'
        contactEl.style.clipPath = res.clip
        ;(contactEl.style as any).webkitClipPath = res.clip
      }
    }

    // 6. Draw pixel canvases if transition is in progress
    const crisp = crispCanvasRef.current
    const glow = glowCanvasRef.current
    const offscreen = offscreenCanvasRef.current

    if (activeK !== -1 && crisp && glow && offscreen && engine.result.imageData) {
      const offCtx = offscreen.getContext('2d')
      const crispCtx = crisp.getContext('2d')
      const glowCtx = glow.getContext('2d')

      if (offCtx && crispCtx && glowCtx) {
        offCtx.putImageData(engine.result.imageData, 0, 0)

        // Draw offscreen scaled up to crisp canvas
        crispCtx.imageSmoothingEnabled = false
        crispCtx.clearRect(0, 0, crisp.width, crisp.height)
        crispCtx.drawImage(offscreen, 0, 0, engine.cols, engine.rows, 0, 0, crisp.width, crisp.height)

        // Draw offscreen scaled up to glow canvas
        glowCtx.imageSmoothingEnabled = false
        glowCtx.clearRect(0, 0, glow.width, glow.height)
        glowCtx.drawImage(offscreen, 0, 0, engine.cols, engine.rows, 0, 0, glow.width, glow.height)

        crisp.style.opacity = '1'
        glow.style.opacity = '1'
      }
    } else {
      if (crisp) crisp.style.opacity = '0'
      if (glow) glow.style.opacity = '0'
    }

    // 7. Pointer events: top-most screen with P >= 0.5
    if (contactEl && skillsEl && aboutEl) {
      if (P2 >= 0.5) {
        contactEl.style.pointerEvents = 'auto'
        skillsEl.style.pointerEvents = 'none'
        aboutEl.style.pointerEvents = 'none'
      } else if (P1 >= 0.5) {
        contactEl.style.pointerEvents = 'none'
        skillsEl.style.pointerEvents = 'auto'
        aboutEl.style.pointerEvents = 'none'
      } else if (P0 >= 0.5) {
        contactEl.style.pointerEvents = 'none'
        skillsEl.style.pointerEvents = 'none'
        aboutEl.style.pointerEvents = 'auto'
      } else {
        contactEl.style.pointerEvents = 'none'
        skillsEl.style.pointerEvents = 'none'
        aboutEl.style.pointerEvents = 'none'
      }
    }

    // 8. Header theme: dark while P0 < 0.5, light from then on (DOM write, no React state)
    const nextTheme = P0 < 0.5 ? 'dark' : 'light'
    const headerEl = document.getElementById('site-header')
    if (headerEl && headerEl.getAttribute('data-theme') !== nextTheme) {
      headerEl.setAttribute('data-theme', nextTheme)
    }

    // 9. Pause background WebGL canvas when About screen is revealed (P0 >= 0.5)
    onCanvasPauseChange?.(P0 >= 0.5)
  }, [onCanvasPauseChange])

  // Setup canvases and ScrollTrigger
  useEffect(() => {
    const stage = stageRef.current
    const crisp = crispCanvasRef.current
    const glow = glowCanvasRef.current
    const offscreen = offscreenCanvasRef.current
    const engine = engineRef.current

    if (!stage || !crisp || !glow || !offscreen || !engine) return

    const updateDimensions = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)

      engine.resize(W, H)

      offscreen.width = engine.cols
      offscreen.height = engine.rows

      crisp.width = Math.round(W * dpr)
      crisp.height = Math.round(H * dpr)
      crisp.style.width = `${W}px`
      crisp.style.height = `${H}px`

      glow.width = Math.round(W * dpr)
      glow.height = Math.round(H * dpr)
      glow.style.width = `${W}px`
      glow.style.height = `${H}px`

      // Dev-only (?dev=1): check viewport overflow
      if (typeof window !== 'undefined' && window.location.search.includes('dev=1')) {
        const screens = [
          { id: 'about', el: aboutScreenRef.current },
          { id: 'skills', el: skillsScreenRef.current },
          { id: 'contact', el: contactScreenRef.current },
        ]
        screens.forEach(({ id, el }) => {
          const content = el?.querySelector('.ps-screen-content')
          if (content && content.scrollHeight > content.clientHeight) {
            console.warn(
              `[PixelStage Dev Warning]: Screen #${id} scrollHeight (${content.scrollHeight}px) exceeds clientHeight (${content.clientHeight}px)`
            )
          }
        })
      }
    }

    updateDimensions()

    // Create ScrollTrigger pinning #stage
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: `+=${STAGE_TOTAL_VH}%`,
      pin: true,
      anticipatePin: 1,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => applyStage(self.progress),
      onRefresh: (self) => {
        updateDimensions()
        applyStage(self.progress)
      },
    })

    triggerRef.current = trigger
    onStageTriggerCreated?.(trigger)

    // Initial render at progress 0
    applyStage(trigger.progress || 0)

    const handleResize = () => {
      updateDimensions()
      ScrollTrigger.refresh()
      if (triggerRef.current) {
        applyStage(triggerRef.current.progress)
      }
    }

    window.addEventListener('resize', handleResize)

    // Late font and window load refresh (Phase 6 robustness)
    document.fonts?.ready?.then(() => {
      ScrollTrigger.refresh()
      if (triggerRef.current) {
        applyStage(triggerRef.current.progress)
      }
    })

    const handleWindowLoad = () => {
      ScrollTrigger.refresh()
      if (triggerRef.current) {
        applyStage(triggerRef.current.progress)
      }
    }
    window.addEventListener('load', handleWindowLoad, { once: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('load', handleWindowLoad)
      trigger.kill()
    }
  }, [applyStage, onStageTriggerCreated])

  return (
    <section id="stage" ref={stageRef} className="pixel-stage" data-theme="dark">
      {/* 1. Void Backdrop at z: 1 */}
      <div className="ps-screen ps-screen--void" style={{ background: voidBg }} />

      {/* 2. Screen About at z: 2 */}
      <div ref={aboutScreenRef} className="ps-screen" id="about" style={{ zIndex: 2 }}>
        <div className="ps-screen-content">
          <h2 className="section-heading">About</h2>
          <About embedded />
        </div>
      </div>

      {/* 3. Screen Skills at z: 3 */}
      <div ref={skillsScreenRef} className="ps-screen" id="skills" style={{ zIndex: 3 }}>
        <div className="ps-screen-content">
          <h2 className="section-heading">Skills</h2>
          <Skills embedded />
        </div>
      </div>

      {/* 4. Screen Contact at z: 4 */}
      <div ref={contactScreenRef} className="ps-screen" id="contact" style={{ zIndex: 4 }}>
        <div className="ps-screen-content">
          <h2 className="section-heading">Contact</h2>
          <Contact embedded />
        </div>
      </div>

      {/* 5. Hard square crisp overlay canvas at z: 10 */}
      <canvas ref={crispCanvasRef} className="ps-canvas ps-crisp" aria-hidden="true" />

      {/* 6. Soft glow overlay canvas at z: 10 */}
      <canvas ref={glowCanvasRef} className="ps-canvas ps-glow" aria-hidden="true" />
    </section>
  )
}

export default PixelStage
