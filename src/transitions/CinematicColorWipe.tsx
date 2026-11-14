import { useRef } from 'react'
import './CinematicColorWipe.css'

export interface CinematicColorWipeProps {
  progress?: number
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Synchronously drives the Cinematic Layered Colour-Wipe Transition:
 * - Pure portfolio palette: Pure White (#FFFFFF), Deep Black (#090D18 / #050811),
 *   Electric Cyan (#2FD0FF), Deep Navy (#101A91).
 * - Multi-panel staggered vertical wipes from alternating sides with overlapping boundaries.
 * - Hardware-accelerated viewport-relative clip-path: inset(...) providing letter-perfect
 *   dual-tone color splits when boundaries cross typography.
 * - Transforms "ABOUT ME" into centered "SKILLS", finishing in 100% clean Pure White.
 */
export function applyCinematicColorWipeProgress(
  containerEl: HTMLElement | null,
  progress: number
): void {
  if (!containerEl) return
  const W = clamp01(progress)
  containerEl.dataset.wipeP = W.toFixed(4)

  const panelNavy = containerEl.querySelector<HTMLElement>('.ccw-panel--navy')
  const panelBlack = containerEl.querySelector<HTMLElement>('.ccw-panel--black')
  const panelCyan = containerEl.querySelector<HTMLElement>('.ccw-panel--cyan')
  const panelWhite = containerEl.querySelector<HTMLElement>('.ccw-panel--white')
  const leadStrip = containerEl.querySelector<HTMLElement>('.ccw-lead-strip')
  const seamCyan = containerEl.querySelector<HTMLElement>('.ccw-seam--cyan')
  const seamNavy = containerEl.querySelector<HTMLElement>('.ccw-seam--navy')
  const seamWhite = containerEl.querySelector<HTMLElement>('.ccw-seam--white')

  // Text nodes that morph from "ABOUT ME" / "GET TO KNOW ME" to "SKILLS" / "TECHNICAL ARSENAL"
  const kickerNavy = panelNavy?.querySelector<HTMLElement>('.ccw-kicker')
  const titleNavy = panelNavy?.querySelector<HTMLElement>('.ccw-title')
  const kickerBase = containerEl.querySelector<HTMLElement>('.ccw-panel--base .ccw-kicker')

  // Overall visibility & container fade
  const active = W > 0.001
  containerEl.style.visibility = active ? 'visible' : 'hidden'
  containerEl.style.opacity = active ? '1' : '0'

  if (!active) return

  // Synchronize kickers & titles across layers for letter-perfect dual-tone splitting
  if (W < 0.32) {
    if (kickerBase) kickerBase.textContent = 'GET TO KNOW ME'
    if (kickerNavy) kickerNavy.textContent = 'GET TO KNOW ME'
    if (titleNavy) titleNavy.textContent = 'ABOUT ME'
  } else {
    if (kickerBase) kickerBase.textContent = 'TECHNICAL ARSENAL'
    if (kickerNavy) kickerNavy.textContent = 'TECHNICAL ARSENAL'
    if (titleNavy) titleNavy.textContent = 'SKILLS'
  }

  // 1. Initial Thin Leading Strip (Electric Cyan) sliding from Left
  // Active during W = 0.01 .. 0.42
  if (leadStrip) {
    const leadT = smoothstep(0.01, 0.40, W)
    const leadX = lerp(-2, 86, leadT)
    const leadOp = W >= 0.01 && W <= 0.48 ? smoothstep(0.01, 0.08, W) * (1 - smoothstep(0.38, 0.48, W)) : 0
    leadStrip.style.left = `${leadX.toFixed(2)}vw`
    leadStrip.style.opacity = leadOp.toFixed(3)
  }

  // 2. Layer 1: Deep Navy Primary Panel (Left-to-Right sweep)
  // W = 0.05 .. 0.44 -> sweeps 0vw to 84vw
  let navyRight = 0
  if (panelNavy) {
    const navyT = smoothstep(0.05, 0.44, W)
    navyRight = lerp(0, 84, navyT)
    panelNavy.style.clipPath = `inset(0 calc(100% - ${navyRight.toFixed(2)}vw) 0 0)`
    ;(panelNavy.style as any).webkitClipPath = `inset(0 calc(100% - ${navyRight.toFixed(2)}vw) 0 0)`
  }

  // 3. Layer 2: Deep Black Contrast Panel (Staggered Left-to-Right sweep)
  // W = 0.14 .. 0.52 -> sweeps 0vw to 54vw
  // Staggered narrower than Navy, leaving a visible vertical slice of Navy between 54vw and 84vw
  let blackRight = 0
  if (panelBlack) {
    const blackT = smoothstep(0.14, 0.52, W)
    blackRight = lerp(0, 54, blackT)
    panelBlack.style.clipPath = `inset(0 calc(100% - ${blackRight.toFixed(2)}vw) 0 0)`
    ;(panelBlack.style as any).webkitClipPath = `inset(0 calc(100% - ${blackRight.toFixed(2)}vw) 0 0)`
  }

  // 4. Layer 3: Electric Cyan Alternating Panel (Right-to-Left sweep from right edge!)
  // W = 0.34 .. 0.72 -> sweeps from 100vw leftwards to 26vw
  let cyanLeft = 100
  if (panelCyan) {
    const cyanT = smoothstep(0.34, 0.72, W)
    cyanLeft = lerp(100, 26, cyanT)
    panelCyan.style.clipPath = `inset(0 0 0 ${cyanLeft.toFixed(2)}vw)`
    ;(panelCyan.style as any).webkitClipPath = `inset(0 0 0 ${cyanLeft.toFixed(2)}vw)`
  }

  // 5. Layer 4: Final Pure White Master Reveal Panel
  // W = 0.58 .. 0.94 -> sweeps from 0vw across full screen to 100vw!
  let whiteRight = 0
  if (panelWhite) {
    const whiteT = smoothstep(0.58, 0.94, W)
    whiteRight = lerp(0, 100, whiteT)
    panelWhite.style.clipPath = `inset(0 calc(100% - ${whiteRight.toFixed(2)}vw) 0 0)`
    ;(panelWhite.style as any).webkitClipPath = `inset(0 calc(100% - ${whiteRight.toFixed(2)}vw) 0 0)`
  }

  // 6. Razor-sharp accent divider seam lines
  if (seamCyan) {
    const show = W > 0.06 && W < 0.62 && navyRight > 1
    seamCyan.style.left = `${navyRight.toFixed(2)}vw`
    seamCyan.style.opacity = show ? '1' : '0'
  }

  if (seamNavy) {
    const show = W > 0.35 && W < 0.76 && cyanLeft < 99
    seamNavy.style.left = `${cyanLeft.toFixed(2)}vw`
    seamNavy.style.opacity = show ? '1' : '0'
  }

  if (seamWhite) {
    const show = W > 0.59 && W < 0.96 && whiteRight > 1 && whiteRight < 99.5
    seamWhite.style.left = `${whiteRight.toFixed(2)}vw`
    seamWhite.style.opacity = show ? '1' : '0'
  }
}

export function CinematicColorWipe({ progress = 0 }: CinematicColorWipeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  return (
    <div
      ref={containerRef}
      className="ccw-stage"
      aria-hidden="true"
      data-wipe-p={progress.toFixed(4)}
    >
      {/* 0. Base Dark Layer (Deep Black background, White "ABOUT ME" text) */}
      <div className="ccw-panel ccw-panel--base">
        <div className="ccw-text-wrap">
          <span className="ccw-kicker">GET TO KNOW ME</span>
          <h1 className="ccw-title">ABOUT ME</h1>
        </div>
      </div>

      {/* 1. Leading Electric Cyan Vertical Strip */}
      <div className="ccw-lead-strip" />

      {/* 2. Layer 1: Deep Navy Primary Sweep */}
      <div className="ccw-panel ccw-panel--navy">
        <div className="ccw-text-wrap">
          <span className="ccw-kicker">GET TO KNOW ME</span>
          <h1 className="ccw-title">ABOUT ME</h1>
        </div>
      </div>

      {/* 3. Layer 2: Deep Black Contrast Sweep */}
      <div className="ccw-panel ccw-panel--black">
        <div className="ccw-text-wrap">
          <span className="ccw-kicker">TECHNICAL ARSENAL</span>
          <h1 className="ccw-title">SKILLS</h1>
        </div>
      </div>

      {/* 4. Layer 3: Electric Cyan Alternating Sweep (Enters from Right) */}
      <div className="ccw-panel ccw-panel--cyan">
        <div className="ccw-text-wrap">
          <span className="ccw-kicker">TECHNICAL ARSENAL</span>
          <h1 className="ccw-title">SKILLS</h1>
        </div>
      </div>

      {/* 5. Layer 4: Final Pure White Master Sweep (Reveals centered "SKILLS") */}
      <div className="ccw-panel ccw-panel--white">
        <div className="ccw-text-wrap">
          <span className="ccw-kicker">TECHNICAL ARSENAL</span>
          <h1 className="ccw-title">SKILLS</h1>
        </div>
      </div>

      {/* Vertical divider seam lines */}
      <div className="ccw-seam ccw-seam--cyan" />
      <div className="ccw-seam ccw-seam--navy" />
      <div className="ccw-seam ccw-seam--white" />
    </div>
  )
}

