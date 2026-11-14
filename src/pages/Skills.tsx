import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { PageShell } from '../ui/PageShell'
import { groups, getSkillsCounts, type SkillGroup } from '../config/skills'
import { projects } from '../config/projects'
import { STAGE_SEGMENTS, STAGE_TOTAL_VH } from '../sections/stageConfig'
import './Skills.css'

export interface SkillsProps {
  embedded?: boolean
  active?: boolean
  instantComplete?: boolean
  showHeading?: boolean
  stageMode?: boolean
}

const REAL_GROUP_ORDER = ['ai', 'languages', 'tools', 'web', 'mobile', 'backend'] as const

interface DepthKey {
  d: number
  xVw: number
  yVh: number
  zPx: number
  rx: number
  ry: number
  rz: number
  scale: number
  opacity: number
  blur: number
}

interface SlotPose {
  xVw: number
  yVh: number
  zPx: number
  rx: number
  ry: number
  rz: number
  scale: number
}

// 3D Camera Flythrough curve indexed by relative depth distance `d = phase - cardIndex`
// Diagonal depth corridor:
//   d < -1.72 : hidden offstage in upper-left background depth
//   d = -1.0  : upper-left background card (peeking behind top-left of focused card, blurred)
//   d =  0.0  : hero focus card (+15deg Y-rotation so left edge is closer/taller, crisp 0px blur)
//   d = +1.0  : lower-right foreground card passing close & cropped off bottom-right (blurred)
//   d > +1.65 : exited past lower-right foreground
const FLYTHROUGH_KEYS: readonly DepthKey[] = [
  { d: -1.72, xVw: -58.0, yVh: -2.0,  zPx: -340, rx: 3.2,  ry: 22, rz: -2.2, scale: 0.78, opacity: 0.0,  blur: 9.0 },
  { d: -1.0,  xVw: -35.5, yVh:  2.5,  zPx:  -75, rx: 1.8,  ry: 18, rz: -1.3, scale: 0.97, opacity: 0.94, blur: 4.6 },
  { d:  0.0,  xVw: -1.5,  yVh: -1.0,  zPx:   36, rx: 1.2,  ry: 15, rz: -0.8, scale: 1.02, opacity: 1.0,  blur: 0.0 },
  { d:  1.0,  xVw:  43.5, yVh:  7.5,  zPx:  185, rx: -1.5, ry: 18, rz:  1.1, scale: 1.12, opacity: 0.94, blur: 5.8 },
  { d:  1.65, xVw:  68.0, yVh: 14.0,  zPx:  320, rx: -3.5, ry: 22, rz:  2.4, scale: 1.24, opacity: 0.0,  blur: 10.0 },
]

// Left-3 / Right-3 asymmetric perimeter constellation (rendered at native 1:1 scale for tack-sharp borders & text)
//   Left  3: Slot 0 (Upper-left: 01 AI), Slot 2 (Mid-left: 03 Tools), Slot 4 (Lower-left: 05 Mobile)
//   Right 3: Slot 1 (Upper-right: 02 Languages), Slot 3 (Mid-right: 04 Web), Slot 5 (Lower-right: 06 Backend)
const DESKTOP_SLOTS: readonly SlotPose[] = [
  // Slot 0: Upper-left
  { xVw: -30.5, yVh: -25.0, zPx: 0, rx: 0, ry: 0, rz: -3.4, scale: 1.0 },
  // Slot 1: Upper-right
  { xVw:  30.5, yVh: -23.5, zPx: 0, rx: 0, ry: 0, rz:  3.0, scale: 1.0 },
  // Slot 2: Middle-left
  { xVw: -34.5, yVh:   2.0, zPx: 0, rx: 0, ry: 0, rz: -4.0, scale: 1.0 },
  // Slot 3: Middle-right
  { xVw:  34.5, yVh:   2.8, zPx: 0, rx: 0, ry: 0, rz:  3.2, scale: 1.0 },
  // Slot 4: Lower-left
  { xVw: -25.5, yVh:  29.0, zPx: 0, rx: 0, ry: 0, rz:  2.2, scale: 1.0 },
  // Slot 5: Lower-right
  { xVw:  25.5, yVh:  28.5, zPx: 0, rx: 0, ry: 0, rz: -2.6, scale: 1.0 },
]

// Six independent outward/upward dispersal trajectories into Hackathons (during E = 0 -> 0.34)
const DISPERSE_TARGETS: readonly {
  xVw: number
  yVh: number
  zPx: number
  rx: number
  ry: number
  rz: number
  scale: number
  start: number
  end: number
}[] = [
  // Slot 0 (Upper-left) -> diagonal top-left corner, CCW
  { xVw: -66, yVh: -66, zPx: 150, rx: -8,  ry: 16,  rz: -34, scale: 1.06, start: 0.00, end: 0.25 },
  // Slot 1 (Upper-right) -> diagonal top-right corner, CW
  { xVw:  65, yVh: -62, zPx: 120, rx: -6,  ry: -18, rz:  31, scale: 1.04, start: 0.01, end: 0.27 },
  // Slot 2 (Middle-left) -> left edge & upward, CCW
  { xVw: -78, yVh: -28, zPx: 185, rx:  5,  ry: 20,  rz: -27, scale: 1.08, start: 0.02, end: 0.29 },
  // Slot 3 (Middle-right) -> right edge & upward, CW
  { xVw:  77, yVh: -33, zPx: 160, rx: -5,  ry: -18, rz:  24, scale: 1.08, start: 0.02, end: 0.28 },
  // Slot 4 (Lower-left) -> sweeping diagonal up-left past corner
  { xVw: -54, yVh: -70, zPx: 105, rx: 10,  ry: 14,  rz: -25, scale: 1.02, start: 0.04, end: 0.33 },
  // Slot 5 (Lower-right) -> sweeping diagonal up-right past corner
  { xVw:  56, yVh: -68, zPx: 130, rx: 8,   ry: -16, rz:  23, scale: 1.05, start: 0.05, end: 0.34 },
]

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function easeOutCubic(t: number): number {
  const c = clamp01(t)
  return 1 - Math.pow(1 - c, 3)
}

function easeInOutCubic(t: number): number {
  const c = clamp01(t)
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

function easeInQuad(t: number): number {
  const c = clamp01(t)
  return c * c
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Reassigns a dismissed inspected card to a lower perimeter slot NOT equal to its previous slot.
 */
function reassignDismissedSlot(prevMap: number[], cardIdx: number): number[] {
  const next = [...prevMap]
  const curSlot = next[cardIdx]

  if (curSlot === 0) {
    const midCard = next.findIndex((s) => s === 2)
    const botCard = next.findIndex((s) => s === 4)
    if (midCard !== -1) next[midCard] = 0
    if (botCard !== -1) next[botCard] = 2
    next[cardIdx] = 4
  } else if (curSlot === 2) {
    const botCard = next.findIndex((s) => s === 4)
    if (botCard !== -1) next[botCard] = 2
    next[cardIdx] = 4
  } else if (curSlot === 1) {
    const midCard = next.findIndex((s) => s === 3)
    const botCard = next.findIndex((s) => s === 5)
    if (midCard !== -1) next[midCard] = 1
    if (botCard !== -1) next[botCard] = 3
    next[cardIdx] = 5
  } else if (curSlot === 3) {
    const botCard = next.findIndex((s) => s === 5)
    if (botCard !== -1) next[botCard] = 3
    next[cardIdx] = 5
  } else if (curSlot === 4) {
    const rightBotCard = next.findIndex((s) => s === 5)
    if (rightBotCard !== -1) next[rightBotCard] = 4
    next[cardIdx] = 5
  } else if (curSlot === 5) {
    const leftBotCard = next.findIndex((s) => s === 4)
    if (leftBotCard !== -1) next[leftBotCard] = 5
    next[cardIdx] = 4
  }

  return next
}

function sampleFlythroughPose(d: number): DepthKey {
  if (d <= FLYTHROUGH_KEYS[0].d) return { ...FLYTHROUGH_KEYS[0], d }
  const last = FLYTHROUGH_KEYS[FLYTHROUGH_KEYS.length - 1]
  if (d >= last.d) return { ...last, d }

  for (let i = 0; i < FLYTHROUGH_KEYS.length - 1; i++) {
    const a = FLYTHROUGH_KEYS[i]
    const b = FLYTHROUGH_KEYS[i + 1]
    if (d >= a.d && d <= b.d) {
      const rawT = (d - a.d) / (b.d - a.d)
      const t = rawT * rawT * (3 - 2 * rawT)
      const blur =
        Math.abs(d) <= 0.14
          ? 0
          : d < 0
            ? smoothstep(0.14, 1.0, Math.abs(d)) * 4.8 + Math.max(0, Math.abs(d) - 1.0) * 5.5
            : smoothstep(0.14, 1.0, d) * 6.0 + Math.max(0, d - 1.0) * 6.8
      return {
        d,
        xVw: lerp(a.xVw, b.xVw, t),
        yVh: lerp(a.yVh, b.yVh, t),
        zPx: lerp(a.zPx, b.zPx, t),
        rx: lerp(a.rx, b.rx, t),
        ry: lerp(a.ry, b.ry, t),
        rz: lerp(a.rz, b.rz, t),
        scale: lerp(a.scale, b.scale, t),
        opacity: lerp(a.opacity, b.opacity, t),
        blur,
      }
    }
  }
  return { ...last, d }
}

/**
 * Computes continuous 3D camera flythrough phase from:
 * - flyProgress (`0..0.72`): white beat -> Card 01 glides in -> 01..06 flythrough -> Card 06 passes close foreground & exits
 */
export function computeFlyPhase(flyProgress: number, exitTransProgress: number): number {
  const D = clamp01(flyProgress)
  if (clamp01(exitTransProgress) > 0.0005 || D > 0.72) {
    return 6.8
  }

  // Smooth scroll progression across cards 01..06 starting at hero focus (phase = 0.0)
  if (D <= 0.64) {
    const u = clamp01(D / 0.64) * 5
    const k = Math.min(4, Math.floor(u))
    const f = u - k
    return k + (f - 0.095 * Math.sin(2 * Math.PI * f))
  }

  const exitT = easeInQuad((D - 0.64) / 0.08)
  return lerp(5.0, 6.72, exitT)
}

/**
 * Synchronously updates all 6 cards across:
 *   1) Flythrough (`D = 0..0.72`): 3D diagonal flythrough across cards 01..06
 *   2) Constellation (`D = 0.72..1.00`): all 6 cards dock Left-3 / Right-3 around centered "Skills" title
 *   3) Dispersal (`E = 0..1`): 6 cards scatter outward/upward into #000000 -> top white beam -> Hackathons
 */
export function applySkillsStageVars(
  containerEl: HTMLElement | null,
  flyProgress: number,
  exitTransProgress: number,
  introProgress = 1,
  headingRevealProgress = 1
): void {
  if (!containerEl) return

  const D = clamp01(flyProgress)
  const E = clamp01(exitTransProgress)
  const I = clamp01(introProgress)
  const H = clamp01(headingRevealProgress)

  containerEl.dataset.flyP = D.toFixed(4)
  containerEl.dataset.disperseP = E.toFixed(4)
  containerEl.dataset.introP = I.toFixed(4)
  containerEl.dataset.headingP = H.toFixed(4)

  const rawMap = (containerEl.dataset.slotMap || '0,1,2,3,4,5')
    .split(',')
    .map((n) => Number(n))
  const slotMap =
    rawMap.length === 6 && rawMap.every((n) => !Number.isNaN(n)) ? rawMap : [0, 1, 2, 3, 4, 5]

  const isMobileLayout =
    typeof window !== 'undefined' && window.innerWidth <= 768

  if (isMobileLayout) {
    return
  }

  const cardNodes = containerEl.querySelectorAll<HTMLElement>('.skills-motion-card')
  const isConstellationPhase = E <= 0.0005 && D > 0.72

  let activeIdx = 0
  let minAbsD = Infinity
  const phase = computeFlyPhase(D, E)

  cardNodes.forEach((cardEl) => {
    const idx = Number(cardEl.dataset.cardIndex ?? 0)
    const targetSlot = slotMap[idx] ?? idx
    const restPose = DESKTOP_SLOTS[targetSlot] ?? DESKTOP_SLOTS[idx]
    const disp = DISPERSE_TARGETS[targetSlot] ?? DISPERSE_TARGETS[idx]
    cardEl.dataset.slot = String(targetSlot)

    let xVw = 0
    let yVh = 0
    let zPx = 0
    let rx = 0
    let ry = 0
    let rz = 0
    let scale = 1
    let opacity = 1
    let blur = 0
    let zIndex = 10 + targetSlot
    let interactive = false
    let cardFocusStyle = true

    if (E > 0.0005) {
      // Phase 3: Six-card outward & upward dispersal from Left-3 / Right-3 into Hackathons
      const t = easeInOutCubic((E - disp.start) / (disp.end - disp.start))
      xVw = lerp(restPose.xVw, disp.xVw, t)
      yVh = lerp(restPose.yVh, disp.yVh, t)
      zPx = lerp(restPose.zPx, disp.zPx, t)
      rx = lerp(restPose.rx, disp.rx, t)
      ry = lerp(restPose.ry, disp.ry, t)
      rz = lerp(restPose.rz, disp.rz, t)
      scale = lerp(restPose.scale, disp.scale, t)
      opacity = 1 - smoothstep(0.68, 0.98, t)
      blur = 0
      zIndex = t > 0.02 ? 25 + idx : 10 + targetSlot
      interactive = false
      cardFocusStyle = true
    } else if (isConstellationPhase) {
      // Phase 2: All 6 cards assemble cleanly into Left-3 (0,2,4) & Right-3 (1,3,5)
      const pairIndex = Math.floor(targetSlot / 2) // 0=top, 1=mid, 2=bot
      const slotStart = 0.72 + pairIndex * 0.032
      const slotEnd = slotStart + 0.095
      const t = easeOutCubic((D - slotStart) / (slotEnd - slotStart))
      const isLeftCol = targetSlot % 2 === 0
      const entryX = restPose.xVw + (isLeftCol ? -32 : 32)
      const entryY = restPose.yVh + 4
      const entryZ = 0

      xVw = lerp(entryX, restPose.xVw, t)
      yVh = lerp(entryY, restPose.yVh, t)
      zPx = lerp(entryZ, restPose.zPx, t)
      rx = 0
      ry = 0
      rz = lerp(isLeftCol ? -11 : 11, restPose.rz, t)
      scale = lerp(0.90, restPose.scale, t)
      opacity = smoothstep(0.05, 0.55, t)
      blur = 0
      zIndex = 12 + targetSlot
      interactive = D >= 0.84
      cardFocusStyle = true
      activeIdx = 5
    } else {
      // Phase 1: 3D Camera Flythrough across Cards 01..06
      const d = phase - idx
      const pose = sampleFlythroughPose(d)
      const isHeroFocused = Math.abs(d) <= 0.24

      if (Math.abs(d) < minAbsD) {
        minAbsD = Math.abs(d)
        activeIdx = idx
      }

      xVw = pose.xVw
      yVh = pose.yVh
      zPx = pose.zPx
      rx = pose.rx
      ry = pose.ry
      rz = pose.rz
      scale = pose.scale
      opacity = pose.opacity
      blur = pose.blur
      zIndex = 24 + Math.round(d * 10)
      interactive = isHeroFocused
      cardFocusStyle = isHeroFocused

      // Intro flow: as Skills title ascends to header level, Card 01 simultaneously rises from below into center
      if (I < 0.999) {
        const cardRiseY = lerp(56, 0, smoothstep(0.06, 1.0, I))
        const cardRiseOp = smoothstep(0.12, 0.92, I)
        yVh += idx === 0 ? cardRiseY : cardRiseY * 0.75
        opacity *= idx === 0 ? cardRiseOp : cardRiseOp * smoothstep(0.35, 1.0, I)
        if (I < 0.85) interactive = false
      }
    }

    cardEl.dataset.centerFocused = cardFocusStyle ? 'true' : 'false'
    cardEl.dataset.constellation = isConstellationPhase || E > 0.0005 ? 'true' : 'false'
    cardEl.dataset.interactive = interactive ? 'true' : 'false'
    cardEl.style.setProperty('--tx', `${xVw.toFixed(2)}vw`)
    cardEl.style.setProperty('--ty', `${yVh.toFixed(2)}vh`)
    cardEl.style.setProperty('--tz', `${zPx.toFixed(1)}px`)
    cardEl.style.setProperty('--rx', `${rx.toFixed(2)}deg`)
    cardEl.style.setProperty('--ry', `${ry.toFixed(2)}deg`)
    cardEl.style.setProperty('--rz', `${rz.toFixed(2)}deg`)
    cardEl.style.setProperty('--sc', scale.toFixed(4))
    cardEl.style.setProperty('--op', opacity.toFixed(4))
    cardEl.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : 'none'
    cardEl.style.setProperty('--zi', String(Math.max(1, zIndex)))
  })

  // Update minimal bottom HUD pill strictly without triggering React state churn per scroll frame
  const hudIndexEl = containerEl.querySelector<HTMLElement>('.skills-hud-index')
  const hudNameEl = containerEl.querySelector<HTMLElement>('.skills-hud-name')
  if (hudIndexEl) {
    hudIndexEl.textContent = `${String(activeIdx + 1).padStart(2, '0')} / 06`
  }
  if (hudNameEl) {
    const g = groups.find((grp) => grp.id === REAL_GROUP_ORDER[activeIdx])
    if (g) hudNameEl.textContent = g.title
  }
  const hudDots = containerEl.querySelectorAll<HTMLElement>('.skills-hud-dot')
  hudDots.forEach((dot, i) => {
    dot.classList.toggle('is-active', i === activeIdx)
  })

  // Backdrop dot matrix blooms immediately inside L-to-R whip handoff -> fades into dark veil on Hackathons entry
  const dotsOpacity = smoothstep(0.005, 0.05, D) * (1 - smoothstep(0.04, 0.22, E))
  const darkAlpha = smoothstep(0.04, 0.19, E)
  const titleWhiteMix = smoothstep(0.06, 0.13, E)
  const titleRgb = Math.round(titleWhiteMix * 255)
  const kickerRgb = Math.round(titleWhiteMix * 255)

  // Bottom flythrough HUD visible only during 3D flythrough cards 01..06
  const hudOpacity =
    smoothstep(0.06, 0.13, D) * (1 - smoothstep(0.68, 0.76, D)) * (1 - smoothstep(0, 0.05, E))

  // Section heading glides smoothly:
  // 1) Intro flow: starts at center hero (introCenterMix = 1) -> glides up to top band (0) as I: 0 -> 1
  // 2) Top band during flythrough (D = 0..0.72)
  // 3) Center hero in Left-3/Right-3 constellation (D = 0.73..0.86)
  // 4) Ascends off screen cleanly during E = 0.06..0.28 before white beam drops from top
  const introCenterMix = 1 - smoothstep(0.0, 1.0, I)
  const heroCenterMix = E > 0.0005 ? 1 : (I < 0.999 ? introCenterMix : smoothstep(0.73, 0.86, D))
  const titleAscend = smoothstep(0.06, 0.28, E)
  const titleTyVh = lerp(0, -30, titleAscend)
  const titleOut = 1 - smoothstep(0.18, 0.29, E)
  const titleOpacity = titleOut * H
  const introScale = lerp(1.0, 1.25, introCenterMix)
  const titleScale = E > 0.0005 ? lerp(1.0, 0.86, smoothstep(0.14, 0.29, E)) : introScale

  const subtitleOpacity =
    (I < 0.999 ? smoothstep(0.72, 1.0, I) : (E > 0.0005 ? 1 : smoothstep(0.79, 0.86, D))) *
    (1 - smoothstep(0.0, 0.14, E))
  const hintOpacity =
    (I < 0.999 ? smoothstep(0.78, 1.0, I) : (E > 0.0005 ? 1 : smoothstep(0.80, 0.87, D))) *
    (1 - smoothstep(0.0, 0.08, E))

  // White seam line comes down from TOP (0%) into center (50%, 50%) right after cards disperse (E = 0.24 -> 0.50)
  let seamOpacity = 0
  let seamTopPct = 0
  let seamHeightPct = 0
  if (E >= 0.24 && E <= 0.51) {
    const head = smoothstep(0.24, 0.42, E) * 50
    const tail = smoothstep(0.38, 0.50, E) * 50
    seamTopPct = tail
    seamHeightPct = Math.max(0, head - tail)
    seamOpacity = E < 0.45 ? smoothstep(0.24, 0.30, E) : 1 - smoothstep(0.45, 0.51, E)
  }

  containerEl.style.setProperty('--skills-dots-opacity', dotsOpacity.toFixed(4))
  containerEl.style.setProperty('--skills-dark-alpha', darkAlpha.toFixed(4))
  containerEl.style.setProperty('--skills-title-color', `rgb(${titleRgb}, ${titleRgb}, ${titleRgb})`)
  containerEl.style.setProperty('--skills-kicker-color', `rgba(${kickerRgb}, ${kickerRgb}, ${kickerRgb}, 0.68)`)
  containerEl.style.setProperty('--skills-hud-opacity', hudOpacity.toFixed(4))
  containerEl.style.setProperty('--skills-hero-center-mix', heroCenterMix.toFixed(4))
  containerEl.style.setProperty('--skills-title-opacity', titleOpacity.toFixed(4))
  containerEl.style.setProperty('--skills-title-scale', titleScale.toFixed(4))
  containerEl.style.setProperty('--skills-title-ty', `${titleTyVh.toFixed(2)}vh`)
  containerEl.style.setProperty('--skills-subtitle-opacity', subtitleOpacity.toFixed(4))
  containerEl.style.setProperty('--skills-hint-opacity', hintOpacity.toFixed(4))
  containerEl.style.setProperty('--skills-seam-opacity', seamOpacity.toFixed(4))
  containerEl.style.setProperty('--skills-seam-top', `${seamTopPct.toFixed(2)}%`)
  containerEl.style.setProperty('--skills-seam-height', `${seamHeightPct.toFixed(2)}%`)
}

export function Skills({
  embedded = false,
  active = true,
  instantComplete: _instantComplete = false,
  showHeading = true,
  stageMode = false,
}: SkillsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [slotMap, setSlotMap] = useState<number[]>([0, 1, 2, 3, 4, 5])
  const [inspectedCardIdx, setInspectedCardIdx] = useState<number | null>(null)
  const [hoveredSkillByCard, setHoveredSkillByCard] = useState<Record<number, string | null>>({})

  const { totalSkills, totalGroups } = getSkillsCounts()

  const realGroups: SkillGroup[] = REAL_GROUP_ORDER.map((id) =>
    groups.find((g) => g.id === id)
  ).filter(Boolean) as SkillGroup[]

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.dataset.slotMap = slotMap.join(',')
    const d = !stageMode ? 1 : Number(el.dataset.flyP ?? '0')
    const e = !stageMode ? 0 : Number(el.dataset.disperseP ?? '0')
    applySkillsStageVars(el, d, e)
  }, [slotMap, stageMode])

  useEffect(() => {
    if (!active) {
      setInspectedCardIdx(null)
      setHoveredSkillByCard({})
    }
  }, [active])

  const dismissInspection = useCallback(() => {
    setInspectedCardIdx((prev) => {
      if (prev === null) return null
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        setSlotMap((oldMap) => reassignDismissedSlot(oldMap, prev))
      }
      return null
    })
  }, [])

  useEffect(() => {
    if (inspectedCardIdx === null || typeof window === 'undefined') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissInspection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [inspectedCardIdx, dismissInspection])

  const handleCardSelect = useCallback(
    (cardIdx: number) => {
      if (typeof window === 'undefined') return
      const isDesktop = window.innerWidth > 768
      const el = containerRef.current
      // On desktop, allow center-popup inspection once Left-3/Right-3 constellation has assembled
      if (isDesktop && stageMode) {
        const d = Number(el?.dataset.flyP ?? '0')
        const e = Number(el?.dataset.disperseP ?? '0')
        if (d < 0.84 || e >= 0.04) return
      }

      if (inspectedCardIdx === cardIdx) {
        dismissInspection()
        return
      }
      if (inspectedCardIdx !== null && isDesktop) {
        const prevIdx = inspectedCardIdx
        setSlotMap((oldMap) => reassignDismissedSlot(oldMap, prevIdx))
      }
      setInspectedCardIdx(cardIdx)
    },
    [inspectedCardIdx, dismissInspection, stageMode]
  )

  const handleCardKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>, cardIdx: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleCardSelect(cardIdx)
      }
    },
    [handleCardSelect]
  )

  const handleProjectPillClick = (projectId: string, sourceEl: HTMLElement) => {
    try {
      const win = window as unknown as {
        openProject?: (id: string, sourceEl?: HTMLElement | null) => void
        lenis?: {
          scrollTo?: (target: string | number, options?: { immediate?: boolean }) => void
        }
      }
      if (typeof win.openProject === 'function') {
        win.openProject(projectId, sourceEl)
        return
      }
      if (win.lenis && typeof win.lenis.scrollTo === 'function') {
        win.lenis.scrollTo('#projects', { immediate: false })
        return
      }
      document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
    } catch {
      // Never throw if modal or scroll helpers are unavailable
    }
  }

  const jumpToCard = useCallback((idx: number) => {
    try {
      const win = window as unknown as {
        ScrollTrigger?: { getAll?: () => Array<{ trigger?: HTMLElement | null; start: number; end: number }> }
        lenis?: { scrollTo?: (pos: number, opts?: { immediate?: boolean }) => void }
      }
      const st = win.ScrollTrigger?.getAll?.().find((t) => t.trigger?.id === 'stage')
      if (!st) return
      // Maps card 0..5 across flyP [0.11 .. 0.64] inside the Skills stage segment
      const flyP = 0.11 + (idx / 5) * 0.53
      const stageP =
        (STAGE_SEGMENTS.SKILLS_INTRO_END_VH + flyP * STAGE_SEGMENTS.SKILLS_DURATION_VH) /
        STAGE_TOTAL_VH
      const targetY = st.start + stageP * (st.end - st.start)
      if (win.lenis?.scrollTo) {
        win.lenis.scrollTo(targetY, { immediate: false })
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' })
      }
    } catch {
      // ignore
    }
  }, [])

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  const content = (
    <div
      ref={containerRef}
      data-slot-map={slotMap.join(',')}
      className={`skills-container ${embedded ? 'skills-container--embedded' : ''} ${
        inspectedCardIdx !== null ? 'has-inspected' : ''
      }`}
    >
      {/* Subtle dot matrix fading gently in after Projects white handoff */}
      <div className="skills-dot-backdrop" aria-hidden="true" />

      {/* Dark #000000 backdrop fading in smoothly after Left-3/Right-3 dispersal */}
      <div className="skills-dark-veil" aria-hidden="true" />

      {/* White vertical beam coming from top once cards disperse, feeding Hackathons circle formation */}
      <div className="skills-seam-origin-line" aria-hidden="true" />

      {/* Prominent Section Title ("Skills") gliding smoothly from top band -> center Left-3/Right-3 lockup */}
      {showHeading && (
        <div className="skills-center-hero">
          <span className="skills-hero-kicker">TECHNICAL ARSENAL</span>
          {embedded ? (
            <h2 className="skills-hero-title">Skills</h2>
          ) : (
            <h1 className="skills-hero-title">Skills</h1>
          )}
          <p className="skills-hero-subtitle">
            {totalSkills} skills across {totalGroups} core areas
          </p>
          <span className="skills-center-hint">
            Click any card to inspect · Scroll to continue
          </span>
        </div>
      )}

      {/* 3D Flythrough + Left-3 / Right-3 Perimeter Constellation Stage */}
      <div
        className="skills-constellation-stage"
        role="region"
        aria-label="Technical skills showcase"
      >
        {inspectedCardIdx !== null && (
          <div
            className="skills-inspect-backdrop"
            role="button"
            tabIndex={-1}
            aria-label="Close card preview"
            onClick={dismissInspection}
          />
        )}
        {realGroups.map((group, cardIdx) => {
          const isInspected = inspectedCardIdx === cardIdx
          const assignedSlot = slotMap[cardIdx] ?? cardIdx
          const headingId = `skills-group-${group.id}`
          const activeSkillId = hoveredSkillByCard[cardIdx] ?? null
          const activeHoveredSkill = activeSkillId
            ? group.skills.find((s) => s.id === activeSkillId) ?? null
            : null
          const activeUsedIds = activeHoveredSkill
            ? new Set(activeHoveredSkill.usedIn.filter((id) => id !== '*'))
            : null
          const activeHasWildcard = Boolean(activeHoveredSkill?.usedIn.includes('*'))

          const rawUsedSet = new Set(group.skills.flatMap((s) => s.usedIn))
          const hasAllProjects = rawUsedSet.has('*')
          const orderedUsedIds = projects
            .map((p) => p.id)
            .filter((id) => rawUsedSet.has(id))
          const visibleUsedIds = orderedUsedIds.slice(0, 4)
          const overflowUsedIds = orderedUsedIds.slice(4)
          const overflowTitles = overflowUsedIds
            .map((id) => projectMap.get(id)?.title)
            .filter(Boolean) as string[]
          const fallbackLabels = Array.from(
            new Set(
              group.skills
                .filter((s) => s.usedIn.length === 0)
                .map((s) => s.usedInText)
                .filter(Boolean)
            )
          ) as string[]
          const hasAnyPills = hasAllProjects || orderedUsedIds.length > 0

          return (
            <div
              key={group.id}
              data-card-index={cardIdx}
              data-slot={assignedSlot}
              data-center-focused={cardIdx === 0 || !stageMode ? 'true' : 'false'}
              role="button"
              tabIndex={0}
              aria-pressed={isInspected}
              aria-label={`${group.title} skill card`}
              className={`skills-motion-card ${isInspected ? 'is-inspected' : ''}`}
              onClick={() => handleCardSelect(cardIdx)}
              onKeyDown={(e) => handleCardKeyDown(e, cardIdx)}
            >
              <section
                className="skills-card skills-card--focused"
                aria-labelledby={headingId}
              >
                <div className="skills-card-head">
                  <span className="skills-card-section-tag">Skills</span>
                  <span className="skills-card-index">
                    {String(cardIdx + 1).padStart(2, '0')}
                  </span>
                  <h3 id={headingId} className="skills-card-title">
                    {group.title}
                  </h3>
                  <span className="skills-card-inspect-cue" aria-hidden="true">
                    {isInspected ? 'Dock' : 'Inspect'}
                  </span>
                </div>

                <ul
                  className="skills-tile-list"
                  data-group={group.id}
                  data-count={group.skills.length}
                >
                  {group.skills.map((skill) => {
                    const isSkillHovered = activeSkillId === skill.id
                    return (
                      <li
                        key={skill.id}
                        tabIndex={0}
                        className={`skills-tile ${isSkillHovered ? 'is-active' : ''}`}
                        onMouseEnter={() =>
                          setHoveredSkillByCard((prev) => ({ ...prev, [cardIdx]: skill.id }))
                        }
                        onMouseLeave={() =>
                          setHoveredSkillByCard((prev) =>
                            prev[cardIdx] === skill.id ? { ...prev, [cardIdx]: null } : prev
                          )
                        }
                        onFocus={() =>
                          setHoveredSkillByCard((prev) => ({ ...prev, [cardIdx]: skill.id }))
                        }
                        onBlur={() =>
                          setHoveredSkillByCard((prev) =>
                            prev[cardIdx] === skill.id ? { ...prev, [cardIdx]: null } : prev
                          )
                        }
                      >
                        {skill.icon ? (
                          skill.darkIcon ? (
                            <span className="skills-tile-icon-chip" aria-hidden="true">
                              <img
                                src={skill.icon}
                                alt=""
                                aria-hidden="true"
                                className="skills-tile-icon"
                                width={36}
                                height={36}
                              />
                            </span>
                          ) : (
                            <img
                              src={skill.icon}
                              alt=""
                              aria-hidden="true"
                              className="skills-tile-icon"
                              width={36}
                              height={36}
                            />
                          )
                        ) : (
                          <span className="skills-tile-monogram" aria-hidden="true">
                            {skill.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="skills-tile-name">{skill.name}</span>
                      </li>
                    )
                  })}
                </ul>

                {(hasAnyPills || fallbackLabels.length > 0) && (
                  <div className="skills-card-footer">
                    <span className="skills-used-in-label">Used in</span>
                    <div className="skills-used-in-list">
                      {hasAllProjects && (
                        <button
                          type="button"
                          className={`skills-used-pill ${
                            activeHoveredSkill !== null
                              ? activeHasWildcard
                                ? 'is-highlighted'
                                : 'is-dimmed'
                              : ''
                          }`}
                          data-project-id="*"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleProjectPillClick(
                              projects[0]?.id ?? 'jeevalink',
                              e.currentTarget
                            )
                          }}
                        >
                          All projects
                        </button>
                      )}
                      {visibleUsedIds.map((pid) => {
                        const proj = projectMap.get(pid)
                        if (!proj) return null
                        const pillStateClass =
                          activeHoveredSkill !== null
                            ? activeHasWildcard || activeUsedIds?.has(pid)
                              ? 'is-highlighted'
                              : 'is-dimmed'
                            : ''
                        return (
                          <button
                            key={pid}
                            type="button"
                            className={`skills-used-pill ${pillStateClass}`}
                            data-project-id={pid}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleProjectPillClick(pid, e.currentTarget)
                            }}
                          >
                            {proj.title}
                          </button>
                        )
                      })}
                      {overflowUsedIds.length > 0 && (
                        <button
                          type="button"
                          className={`skills-used-pill skills-used-pill--more ${
                            activeHoveredSkill !== null
                              ? activeHasWildcard ||
                                overflowUsedIds.some((id) => activeUsedIds?.has(id))
                                ? 'is-highlighted'
                                : 'is-dimmed'
                              : ''
                          }`}
                          title={overflowTitles.join(', ')}
                          aria-label={`More projects: ${overflowTitles.join(', ')}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleProjectPillClick(overflowUsedIds[0], e.currentTarget)
                          }}
                        >
                          +{overflowUsedIds.length}
                        </button>
                      )}
                      {fallbackLabels.map((label) => {
                        const isFallbackHighlighted =
                          activeHoveredSkill !== null &&
                          activeHoveredSkill.usedIn.length === 0 &&
                          activeHoveredSkill.usedInText === label
                        return (
                          <span
                            key={label}
                            className={`skills-used-fallback ${
                              isFallbackHighlighted ? 'is-highlighted-text' : ''
                            }`}
                          >
                            {label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )
        })}
      </div>

      {/* Minimal Bottom Progress Pill during desktop 3D flythrough */}
      <div className="skills-fly-hud" aria-label="Skills flythrough indicator">
        <span className="skills-hud-index">01 / 06</span>
        <span className="skills-hud-sep" aria-hidden="true">/</span>
        <span className="skills-hud-name">AI &amp; Deep Learning</span>
        <div className="skills-hud-dots" role="tablist" aria-label="Jump to skill category">
          {realGroups.map((g, i) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-label={`Jump to ${g.title}`}
              className={`skills-hud-dot ${i === 0 ? 'is-active' : ''}`}
              onClick={() => jumpToCard(i)}
            />
          ))}
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return content
  }

  return <PageShell title="Skills - Devesh">{content}</PageShell>
}

export default Skills
