import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { About, applyAboutStageVars } from '../pages/About'
import { Skills, applySkillsStageVars } from '../pages/Skills'
import { Hackathons, applyHackathonTransitionVars } from '../pages/Hackathons'
import { ProjectsEditorial, applyProjectsStageVars } from '../pages/ProjectsEditorial'
import { Achievements, applyAchievementsStageVars } from '../pages/Achievements'
import { Contact } from '../pages/Contact'
import { siteTheme } from '../config/theme'
import { PIXEL_SCAN_CONFIG } from '../config/pixelScan'
import type { ProjectItem } from '../config/projects'
import { PixelScanEngine } from '../transitions/pixelScan'
import { PixelBlockWipeEngine } from '../transitions/PixelBlockWipeEngine'
import { renderFallingCardsBridge } from '../transitions/FallingCardsBridge'
import {
  CinematicColorWipe,
} from '../transitions/CinematicColorWipe'
import type { SectionId } from '../ui/SectionOrderNav'
import { STAGE_TOTAL_VH, STAGE_SEGMENTS, STAGE_HOLD_PROGRESS } from './stageConfig'
import './PixelStage.css'

gsap.registerPlugin(ScrollTrigger)

if (typeof window !== 'undefined') {
  ;(window as any).ScrollTrigger = ScrollTrigger
}

export { STAGE_TOTAL_VH, STAGE_HOLD_PROGRESS }

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

// Normalized segment boundaries derived from STAGE_SEGMENTS
const ABOUT_REVEAL_END = STAGE_SEGMENTS.ABOUT_REVEAL_END_VH / STAGE_TOTAL_VH
const ABOUT_EXIT_START = STAGE_SEGMENTS.ABOUT_EXIT_START_VH / STAGE_TOTAL_VH
const ABOUT_EXIT_END = STAGE_SEGMENTS.ABOUT_EXIT_END_VH / STAGE_TOTAL_VH

const SKILLS_SPLIT_ENTER = STAGE_SEGMENTS.SKILLS_SPLIT_ENTER_VH / STAGE_TOTAL_VH
const SKILLS_SPLIT_HOLD_START = STAGE_SEGMENTS.SKILLS_SPLIT_HOLD_START_VH / STAGE_TOTAL_VH
const SKILLS_SPLIT_HOLD_END = STAGE_SEGMENTS.SKILLS_SPLIT_HOLD_END_VH / STAGE_TOTAL_VH
const SKILLS_SPLIT_TILT_END = STAGE_SEGMENTS.SKILLS_SPLIT_TILT_END_VH / STAGE_TOTAL_VH
const SKILLS_SPLIT_WIPE_END = STAGE_SEGMENTS.SKILLS_SPLIT_WIPE_END_VH / STAGE_TOTAL_VH

const SKILLS_START = STAGE_SEGMENTS.SKILLS_START_VH / STAGE_TOTAL_VH
const SKILLS_INTRO_START = STAGE_SEGMENTS.SKILLS_INTRO_START_VH / STAGE_TOTAL_VH
const SKILLS_INTRO_END = STAGE_SEGMENTS.SKILLS_INTRO_END_VH / STAGE_TOTAL_VH
const SKILLS_END = STAGE_SEGMENTS.SKILLS_END_VH / STAGE_TOTAL_VH

const TRANS_SKILLS_HACK = {
  start: STAGE_SEGMENTS.HACK_ENTRY_START_VH / STAGE_TOTAL_VH,
  end: STAGE_SEGMENTS.HACK_ENTRY_END_VH / STAGE_TOTAL_VH,
}

const TRANS_HACK_EXIT = {
  start: STAGE_SEGMENTS.HACK_EXIT_START_VH / STAGE_TOTAL_VH,
  end: STAGE_SEGMENTS.HACK_EXIT_END_VH / STAGE_TOTAL_VH,
}

const FALLING_CARDS_SEG = {
  start: STAGE_SEGMENTS.FALL_START_VH / STAGE_TOTAL_VH,
  end: STAGE_SEGMENTS.FALL_END_VH / STAGE_TOTAL_VH,
}

const PROJECTS_SEG = {
  start: STAGE_SEGMENTS.PROJECTS_START_VH / STAGE_TOTAL_VH,
  deployEnd: STAGE_SEGMENTS.PROJECTS_DEPLOY_END_VH / STAGE_TOTAL_VH,
  streamStart: STAGE_SEGMENTS.PROJECTS_STREAM_START_VH / STAGE_TOTAL_VH,
  streamEnd: STAGE_SEGMENTS.PROJECTS_STREAM_END_VH / STAGE_TOTAL_VH,
  end: STAGE_SEGMENTS.PROJECTS_END_VH / STAGE_TOTAL_VH,
}

const ACH_SEG = {
  start: STAGE_SEGMENTS.ACH_START_VH / STAGE_TOTAL_VH,
  titleDropEnd: STAGE_SEGMENTS.ACH_TITLE_DROP_END_VH / STAGE_TOTAL_VH,
  cardHoldEnd: STAGE_SEGMENTS.ACH_CARD_HOLD_VH / STAGE_TOTAL_VH,
  dividersEnd: STAGE_SEGMENTS.ACH_DIVIDERS_END_VH / STAGE_TOTAL_VH,
  separateEnd: STAGE_SEGMENTS.ACH_SEPARATE_END_VH / STAGE_TOTAL_VH,
  flipStart: STAGE_SEGMENTS.ACH_FLIP_START_VH / STAGE_TOTAL_VH,
  flipEnd: STAGE_SEGMENTS.ACH_FLIP_END_VH / STAGE_TOTAL_VH,
  hold: STAGE_SEGMENTS.ACH_HOLD_VH / STAGE_TOTAL_VH,
}

const TRANS_ACH_CONTACT = {
  start: STAGE_SEGMENTS.CONTACT_TRANS_START_VH / STAGE_TOTAL_VH,
  end: STAGE_SEGMENTS.CONTACT_TRANS_END_VH / STAGE_TOTAL_VH,
}

export interface PixelStageProps {
  onStageTriggerCreated?: (trigger: ScrollTrigger) => void
  onStageActiveChange?: (active: boolean) => void
  onActiveSectionChange?: (section: SectionId) => void
  onHeaderThemeChange?: (theme: 'dark' | 'light') => void
  onSelectProject?: (
    project: ProjectItem,
    rect?: { left: number; top: number; width: number; height: number }
  ) => void
}

export function PixelStage({
  onStageTriggerCreated,
  onStageActiveChange,
  onActiveSectionChange,
  onHeaderThemeChange,
  onSelectProject,
}: PixelStageProps) {
  const stageRef = useRef<HTMLElement | null>(null)
  const voidScreenRef = useRef<HTMLDivElement | null>(null)
  const skillsScreenRef = useRef<HTMLDivElement | null>(null)
  const splitLineSvgRef = useRef<SVGSVGElement | null>(null)
  const splitLineRef = useRef<SVGLineElement | null>(null)
  const aboutScreenRef = useRef<HTMLDivElement | null>(null)
  const colorWipeRef = useRef<HTMLDivElement | null>(null)
  const hackScreenRef = useRef<HTMLDivElement | null>(null)
  const fallingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const projectsScreenRef = useRef<HTMLDivElement | null>(null)
  const achievementsScreenRef = useRef<HTMLDivElement | null>(null)
  const contactScreenRef = useRef<HTMLDivElement | null>(null)

  const crispCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const glowCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const blockWipeCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const engineRef = useRef<PixelScanEngine | null>(null)
  const blockWipeEngineRef = useRef<PixelBlockWipeEngine | null>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const triggerRef = useRef<ScrollTrigger | null>(null)

  const [skillsActive, setSkillsActive] = useState(false)
  const [skillsInstantComplete, setSkillsInstantComplete] = useState(false)
  const [hackActive, setHackActive] = useState(false)
  const [hackForceOverview, setHackForceOverview] = useState(false)
  const skillsActiveRef = useRef(false)
  const skillsInstantRef = useRef(false)
  const hackActiveRef = useRef(false)
  const hackForceOverviewRef = useRef(false)
  const isRefreshingRef = useRef(false)
  const pendingInitialHashRef = useRef<string | null>(null)
  const activeStageSectionRef = useRef<SectionId | null>(null)
  const aboutManualOverrideRef = useRef<number | null>(null)
  const onStageTriggerCreatedRef = useRef(onStageTriggerCreated)
  onStageTriggerCreatedRef.current = onStageTriggerCreated
  const onStageActiveChangeRef = useRef(onStageActiveChange)
  onStageActiveChangeRef.current = onStageActiveChange
  const onActiveSectionChangeRef = useRef(onActiveSectionChange)
  onActiveSectionChangeRef.current = onActiveSectionChange
  const onHeaderThemeChangeRef = useRef(onHeaderThemeChange)
  onHeaderThemeChangeRef.current = onHeaderThemeChange

  // Initialize engine & offscreen canvas once
  if (!engineRef.current && typeof window !== 'undefined') {
    engineRef.current = new PixelScanEngine(window.innerWidth, window.innerHeight)
    offscreenCanvasRef.current = document.createElement('canvas')
    offscreenCanvasRef.current.width = engineRef.current.cols
    offscreenCanvasRef.current.height = engineRef.current.rows
  }

  if (!blockWipeEngineRef.current && typeof window !== 'undefined') {
    blockWipeEngineRef.current = new PixelBlockWipeEngine(window.innerWidth, window.innerHeight)
  }

  const applyStage = useCallback((sRaw: number) => {
    const s = clamp01(sRaw)
    const engine = engineRef.current
    if (!engine) return

    if (
      s >= SKILLS_START &&
      pendingInitialHashRef.current &&
      triggerRef.current &&
      triggerRef.current.start > 0 &&
      typeof window !== 'undefined' &&
      window.scrollY >= triggerRef.current.start
    ) {
      pendingInitialHashRef.current = null
    }

    // 1. Segment progress values
    const introSkillsP = clamp01((s - SKILLS_INTRO_START) / (SKILLS_INTRO_END - SKILLS_INTRO_START))
    const dockP = clamp01((s - SKILLS_INTRO_END) / (SKILLS_END - SKILLS_INTRO_END))
    const E = clamp01(
      (s - TRANS_SKILLS_HACK.start) / (TRANS_SKILLS_HACK.end - TRANS_SKILLS_HACK.start)
    )
    const X = clamp01((s - TRANS_HACK_EXIT.start) / (TRANS_HACK_EXIT.end - TRANS_HACK_EXIT.start))
    const F = clamp01(
      (s - FALLING_CARDS_SEG.start) / (FALLING_CARDS_SEG.end - FALLING_CARDS_SEG.start)
    )
    const P_projDeploy = clamp01(
      (s - PROJECTS_SEG.start) / (PROJECTS_SEG.deployEnd - PROJECTS_SEG.start)
    )
    const P_projStream = clamp01(
      (s - PROJECTS_SEG.streamStart) / (PROJECTS_SEG.streamEnd - PROJECTS_SEG.streamStart)
    )
    // Achievements 3D Single-to-Three Card Split & Flip Transition:
    const P_achTotal = clamp01((s - ACH_SEG.start) / (ACH_SEG.flipEnd - ACH_SEG.start))
    const P_achTitleDrop = clamp01((s - ACH_SEG.start) / (ACH_SEG.titleDropEnd - ACH_SEG.start))
    const P_achCardHold = clamp01((s - ACH_SEG.titleDropEnd) / (ACH_SEG.cardHoldEnd - ACH_SEG.titleDropEnd))
    const P_achDividers = clamp01((s - ACH_SEG.cardHoldEnd) / (ACH_SEG.dividersEnd - ACH_SEG.cardHoldEnd))
    const P_achSeparate = clamp01((s - ACH_SEG.dividersEnd) / (ACH_SEG.separateEnd - ACH_SEG.dividersEnd))
    const P_achFlip = clamp01((s - ACH_SEG.flipStart) / (ACH_SEG.flipEnd - ACH_SEG.flipStart))
    const P_achDarken = P_achFlip // Background turns dark as the cards flip!
    const P_contact = clamp01(
      (s - TRANS_ACH_CONTACT.start) / (TRANS_ACH_CONTACT.end - TRANS_ACH_CONTACT.start)
    )

    const triggerReallyActive = Boolean(triggerRef.current?.isActive && triggerRef.current.start > 20)
    const stageEngaged =
      aboutManualOverrideRef.current !== null ||
      s > 0.0005 ||
      triggerReallyActive ||
      Boolean(pendingInitialHashRef.current)

    // 2. Skills & Hackathons interaction scoping
    const shouldActivateSkills =
      (s >= SKILLS_START || pendingInitialHashRef.current === '#skills') && E < 0.25
    if (shouldActivateSkills !== skillsActiveRef.current) {
      skillsActiveRef.current = shouldActivateSkills
      setSkillsActive(shouldActivateSkills)
    }

    const shouldSnapSkills = E >= 1
    if (shouldSnapSkills && !skillsInstantRef.current) {
      skillsInstantRef.current = true
      setSkillsInstantComplete(true)
    } else if (!shouldActivateSkills && skillsInstantRef.current) {
      skillsInstantRef.current = false
      setSkillsInstantComplete(false)
    }

    const shouldActivateHack = E >= 0.9 && X < 0.2
    if (shouldActivateHack !== hackActiveRef.current) {
      hackActiveRef.current = shouldActivateHack
      setHackActive(shouldActivateHack)
    }

    const shouldForceHackOverview = X > 0.002
    if (shouldForceHackOverview !== hackForceOverviewRef.current) {
      hackForceOverviewRef.current = shouldForceHackOverview
      setHackForceOverview(shouldForceHackOverview)
    }

    // 2b. Void Backdrop at z: 1 (seamless dark void for Welcome/About/Kinetic Split -> pure white for Skills)
    const voidEl = voidScreenRef.current
    if (voidEl) {
      if (s < SKILLS_SPLIT_WIPE_END) {
        voidEl.style.background = '#000000'
      } else if (E > 0.05) {
        voidEl.style.background = '#000000'
      } else {
        voidEl.style.background = '#ffffff'
      }
    }

    // 3. Screen About at z: 4 (settled view at 158vh; reverse particle disintegration into black void 175..220vh)
    const aboutEl = aboutScreenRef.current
    if (aboutEl) {
      const aboutStageEl = aboutEl.querySelector('.about-stage') as HTMLElement | null
      aboutEl.style.clipPath = 'none'
      ;(aboutEl.style as any).webkitClipPath = 'none'
      aboutEl.style.transform = 'none'
      aboutEl.style.filter = 'none'

      if (aboutManualOverrideRef.current !== null) {
        aboutEl.style.visibility = 'visible'
        aboutEl.style.opacity = '1'
        if (aboutStageEl) {
          aboutStageEl.style.transform = 'none'
          aboutStageEl.style.opacity = '1'
          aboutStageEl.style.boxShadow = 'none'
          aboutStageEl.style.borderColor = 'transparent'
        }
        applyAboutStageVars(aboutStageEl, aboutManualOverrideRef.current)
      } else if (!stageEngaged) {
        aboutEl.style.visibility = 'hidden'
        aboutEl.style.opacity = '0'
        if (aboutStageEl) {
          aboutStageEl.style.transform = 'none'
          aboutStageEl.style.opacity = '0'
          aboutStageEl.style.boxShadow = 'none'
          aboutStageEl.style.borderColor = 'transparent'
        }
        applyAboutStageVars(aboutStageEl, 0)
      } else if (s > ABOUT_EXIT_END + 0.002) {
        aboutEl.style.visibility = 'hidden'
        aboutEl.style.opacity = '0'
        if (aboutStageEl) {
          aboutStageEl.style.transform = 'none'
          aboutStageEl.style.opacity = '0'
          aboutStageEl.style.boxShadow = 'none'
          aboutStageEl.style.borderColor = 'transparent'
        }
        applyAboutStageVars(aboutStageEl, 1, 1)
      } else {
        aboutEl.style.visibility = 'visible'
        aboutEl.style.opacity = '1'
        if (aboutStageEl) {
          aboutStageEl.style.transform = 'none'
          aboutStageEl.style.opacity = '1'
          aboutStageEl.style.boxShadow = 'none'
          aboutStageEl.style.borderColor = 'transparent'
        }

        if (s <= ABOUT_EXIT_START) {
          const enterP = clamp01(s / ABOUT_REVEAL_END)
          applyAboutStageVars(aboutStageEl, enterP, 0)
        } else {
          // Reverse transition of small parts: photo and details blow away into black void (just as they appear)
          const exitP = clamp01((s - ABOUT_EXIT_START) / (ABOUT_EXIT_END - ABOUT_EXIT_START))
          applyAboutStageVars(aboutStageEl, 1, exitP)
        }
      }
    }

    // 4. Color Wipe: hidden/disabled (superseded by Kinetic Split-Wipe)
    const colorWipeEl = colorWipeRef.current
    if (colorWipeEl) {
      colorWipeEl.style.visibility = 'hidden'
      colorWipeEl.style.display = 'none'
    }

    // 5. Screen Skills at z: 2 + Dynamic Kinetic Seam Line at z: 3
    const skillsEl = skillsScreenRef.current
    const splitSvg = splitLineSvgRef.current
    const splitLine = splitLineRef.current

    if (skillsEl) {
      const showSkills = s >= SKILLS_SPLIT_ENTER && E < 0.67
      skillsEl.style.transform = 'none'
      skillsEl.style.filter = 'none'

      if (showSkills) {
        skillsEl.style.visibility = 'visible'
        skillsEl.style.opacity = '1'

        const skillsContainerEl = skillsEl.querySelector('.skills-container') as HTMLElement | null

        if (s < SKILLS_SPLIT_WIPE_END) {
          // ─── Kinetic Split-Wipe Transition ───
          // Stage A (220..255vh): White sweep moves from left (0%) to center (50%)
          // Stage B (255..275vh): Hold at center (50% / 50%) - half white, half black, title on white side only
          // Stage C (275..310vh): Clockwise Rotation around center (50%, 50%) into diagonal incline
          // Stage D (310..350vh): Once rotation finishes, move inclined line to right side until full white shows
          let lineOp = 1

          if (s < SKILLS_SPLIT_HOLD_START) {
            // Stage A: White sweep moves from left (0%) to center (50%)
            const p = clamp01((s - SKILLS_SPLIT_ENTER) / (SKILLS_SPLIT_HOLD_START - SKILLS_SPLIT_ENTER))
            const t = p * p * (3 - 2 * p) // smoothstep
            const x = t * 50
            lineOp = smoothstep(0.04, 0.20, p)
            const clipPoly = `polygon(0 0, ${x.toFixed(2)}% 0, ${x.toFixed(2)}% 100%, 0 100%)`
            skillsEl.style.clipPath = clipPoly
            ;(skillsEl.style as any).webkitClipPath = clipPoly

            if (splitSvg && splitLine) {
              splitSvg.style.opacity = lineOp.toFixed(3)
              splitLine.setAttribute('x1', `${x.toFixed(2)}%`)
              splitLine.setAttribute('y1', '0%')
              splitLine.setAttribute('x2', `${x.toFixed(2)}%`)
              splitLine.setAttribute('y2', '100%')
            }
          } else if (s <= SKILLS_SPLIT_HOLD_END) {
            // Stage B: Hold at center (50% / 50%) - half white, half black, title on white side only
            const clipPoly = 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
            skillsEl.style.clipPath = clipPoly
            ;(skillsEl.style as any).webkitClipPath = clipPoly

            if (splitSvg && splitLine) {
              splitSvg.style.opacity = '1'
              splitLine.setAttribute('x1', '50%')
              splitLine.setAttribute('y1', '0%')
              splitLine.setAttribute('x2', '50%')
              splitLine.setAttribute('y2', '100%')
            }
          } else if (s < SKILLS_SPLIT_TILT_END) {
            // Stage C: Clockwise Rotation around center (50%, 50%) into diagonal incline
            // Top point rotates clockwise: 50% -> 100%
            // Bottom point rotates clockwise: 50% -> 0%
            const p = clamp01((s - SKILLS_SPLIT_HOLD_END) / (SKILLS_SPLIT_TILT_END - SKILLS_SPLIT_HOLD_END))
            const t = p * p * (3 - 2 * p)
            const xTop = 50 + t * 50 // 50% -> 100%
            const xBot = 50 - t * 50 // 50% -> 0%
            const clipPoly = `polygon(0 0, ${xTop.toFixed(2)}% 0, ${xBot.toFixed(2)}% 100%, 0 100%)`
            skillsEl.style.clipPath = clipPoly
            ;(skillsEl.style as any).webkitClipPath = clipPoly

            if (splitSvg && splitLine) {
              splitSvg.style.opacity = '1'
              splitLine.setAttribute('x1', `${xTop.toFixed(2)}%`)
              splitLine.setAttribute('y1', '0%')
              splitLine.setAttribute('x2', `${xBot.toFixed(2)}%`)
              splitLine.setAttribute('y2', '100%')
            }
          } else {
            // Stage D: Once rotation finishes, move inclined line to right side until full white shows
            const p = clamp01((s - SKILLS_SPLIT_TILT_END) / (SKILLS_SPLIT_WIPE_END - SKILLS_SPLIT_TILT_END))
            const t = p * p * (3 - 2 * p)
            const xBot = t * 100 // 0% -> 100% along bottom edge
            const yRight = t * 100 // 0% -> 100% along right edge
            lineOp = 1 - smoothstep(0.72, 0.98, p)

            const clipPoly = `polygon(0 0, 100% 0, 100% ${yRight.toFixed(2)}%, ${xBot.toFixed(2)}% 100%, 0 100%)`
            skillsEl.style.clipPath = clipPoly
            ;(skillsEl.style as any).webkitClipPath = clipPoly

            if (splitSvg && splitLine) {
              splitSvg.style.opacity = lineOp.toFixed(3)
              splitLine.setAttribute('x1', '100%')
              splitLine.setAttribute('y1', `${yRight.toFixed(2)}%`)
              splitLine.setAttribute('x2', `${xBot.toFixed(2)}%`)
              splitLine.setAttribute('y2', '100%')
            }
          }

          // During split wipe: Title is at dead center, cards are held below screen
          applySkillsStageVars(skillsContainerEl, 0, 0, 0, 1)
        } else {
          // ─── Post-Wipe: Full White Canvas, Title Ascends, Cards Fly In ───
          skillsEl.style.clipPath = 'none'
          ;(skillsEl.style as any).webkitClipPath = 'none'

          if (splitSvg) {
            splitSvg.style.opacity = '0'
          }

          applySkillsStageVars(skillsContainerEl, dockP, E, introSkillsP, 1)
        }
      } else {
        skillsEl.style.visibility = 'hidden'
        skillsEl.style.opacity = '0'
        skillsEl.style.clipPath = 'none'
        ;(skillsEl.style as any).webkitClipPath = 'none'
        if (splitSvg) {
          splitSvg.style.opacity = '0'
        }
      }
    }

    // 5. Screen Hackathons at z: 4
    const hackEl = hackScreenRef.current
    if (hackEl) {
      if (E <= 0.42 || X >= 0.999) {
        hackEl.style.visibility = 'hidden'
      } else {
        hackEl.style.visibility = 'visible'
      }
      const hackStageEl = hackEl.querySelector('.hack-stage') as HTMLElement | null
      applyHackathonTransitionVars(hackStageEl, E, X)
    }

    // 6. Falling Cards Bridge canvas at z: 5 (Hackathons Exit black -> falling black/grey/white 3D cards -> 100% pure white)
    const fallingCanvas = fallingCanvasRef.current
    if (fallingCanvas) {
      const showFalling =
        s >= TRANS_HACK_EXIT.end - 6 / STAGE_TOTAL_VH && s < PROJECTS_SEG.start + 6 / STAGE_TOTAL_VH
      if (showFalling) {
        fallingCanvas.style.visibility = 'visible'
        renderFallingCardsBridge(fallingCanvas, F)
      } else {
        fallingCanvas.style.visibility = 'hidden'
      }
    }

    // 7. Screen Selected Projects (Vertical spine + alternating 6 branches -> box gather into Bot) at z: 6
    const projectsEl = projectsScreenRef.current
    if (projectsEl) {
      const showProjects = s >= PROJECTS_SEG.start && s < ACH_SEG.titleDropEnd + 0.005
      projectsEl.style.visibility = showProjects ? 'visible' : 'hidden'
      projectsEl.style.display = showProjects ? 'block' : 'none'
      projectsEl.style.clipPath = 'none'
      const projStageEl = projectsEl.querySelector('.pe-stage') as HTMLElement | null
      applyProjectsStageVars(projStageEl, P_projDeploy, P_projStream)
    }

    // 8. Screen Achievements (3D Single-to-Three Card Split & 180° Flip: White Page -> Split -> Dark Void Flip) at z: 7
    const achEl = achievementsScreenRef.current
    if (achEl) {
      const showAch = s >= ACH_SEG.start && P_contact < 0.999
      achEl.style.visibility = showAch ? 'visible' : 'hidden'
      achEl.style.display = showAch ? 'block' : 'none'
      achEl.style.clipPath = 'none'
      ;(achEl.style as any).webkitClipPath = 'none'

      const achStageEl = achEl.querySelector('.ach-stage') as HTMLElement | null
      applyAchievementsStageVars(
        achStageEl,
        P_achTotal,
        P_achTitleDrop,
        P_achCardHold,
        P_achDividers,
        P_achSeparate,
        P_achFlip,
        P_achDarken,
        P_contact
      )
    }

    // 9. Full-Screen Pixel Block Wipe Transition (Achievements -> Contact)
    // Primary electric purple (#2700FF) against dark background (#03050a)
    const blockWipeEl = blockWipeCanvasRef.current
    const blockWipeEngine = blockWipeEngineRef.current

    // Wipe progress phases:
    // P_contact 0.00..0.34: cards join flush into fused dark box
    // P_contact 0.34..0.54: fused box and its shadow dissolve into pure dark void (#03050a)
    // P_contact 0.54..0.60: dark void hold
    // P_contact 0.60..0.78: Phase 1 & 2 - scattered electric-purple blocks appear and expand into connected mosaic
    // P_contact 0.78..0.82: Phase 3 - 100% solid electric-purple screen hold
    // P_contact 0.82..0.98: Phase 4 - purple blocks retract in staggered digital order to reveal Contact underneath
    // P_contact >= 0.98: Contact fully uncovered & interactive

    const pWipeCover = clamp01((P_contact - 0.60) / 0.18)
    const pWipeReveal = clamp01((P_contact - 0.82) / 0.16)

    if (blockWipeEl && blockWipeEngine) {
      if (P_contact >= 0.58 && P_contact < 0.99) {
        blockWipeEl.style.display = 'block'
        blockWipeEl.style.visibility = 'visible'
        const wipeCtx = blockWipeEl.getContext('2d')
        if (wipeCtx) {
          const dpr = Math.min(2, window.devicePixelRatio || 1)
          blockWipeEngine.render(wipeCtx, pWipeCover, pWipeReveal, dpr)
        }
      } else {
        blockWipeEl.style.display = 'none'
        blockWipeEl.style.visibility = 'hidden'
      }
    }

    const contactEl = contactScreenRef.current
    if (contactEl) {
      if (P_contact < 0.78) {
        contactEl.style.visibility = 'hidden'
        contactEl.style.display = 'none'
        contactEl.style.opacity = '0'
        contactEl.style.clipPath = 'none'
      } else {
        contactEl.style.display = 'block'
        contactEl.style.visibility = 'visible'
        contactEl.style.opacity = '1'
        contactEl.style.transform = 'none'
        contactEl.style.clipPath = 'none'
        ;(contactEl.style as any).webkitClipPath = 'none'
      }
    }

    // 10. Pointer events: top-most interactive screen
    if (contactEl && achEl && projectsEl && hackEl && skillsEl && aboutEl) {
      contactEl.style.pointerEvents = P_contact >= 0.96 ? 'auto' : 'none'
      achEl.style.pointerEvents = s >= ACH_SEG.titleDropEnd && P_contact < 0.1 ? 'auto' : 'none'
      projectsEl.style.pointerEvents =
        s >= PROJECTS_SEG.start && s < ACH_SEG.titleDropEnd ? 'auto' : 'none'
      hackEl.style.pointerEvents = E >= 0.88 && X < 0.25 ? 'auto' : 'none'
      skillsEl.style.pointerEvents = s >= SKILLS_START && E < 0.25 ? 'auto' : 'none'
      aboutEl.style.pointerEvents = stageEngaged && s < ABOUT_EXIT_START ? 'auto' : 'none'
    }

    // 11. Synchronize top header theme across all 6 stage sections
    if (s > 0.0005 || triggerReallyActive) {
      const headerEl = document.getElementById('site-header')
      const inAboutZone = s < SKILLS_SPLIT_ENTER
      const inHackZone = E >= 0.14 && F < 0.68
      const inAchZone = s >= ACH_SEG.start && P_contact < 0.78
      const inAchDarkZone = inAchZone && P_achDarken >= 0.45
      const stageHeaderTheme: 'dark' | 'light' =
        inAboutZone || inHackZone || inAchDarkZone ? 'dark' : 'light'

      onHeaderThemeChangeRef.current?.(stageHeaderTheme)
      if (headerEl) {
        if (headerEl.getAttribute('data-theme') !== stageHeaderTheme) {
          headerEl.setAttribute('data-theme', stageHeaderTheme)
        }
        if (inHackZone) {
          headerEl.setAttribute('data-bw', 'true')
        } else {
          headerEl.removeAttribute('data-bw')
        }
      }
    }

    // 12. Notify active section inside #stage
    let nextSection: SectionId = 'about'
    if (P_contact >= 0.78) nextSection = 'contact'
    else if (s >= ACH_SEG.start + 0.005) nextSection = 'achievements'
    else if (F >= 0.72) nextSection = 'projects'
    else if (E >= 0.25) nextSection = 'hackathons'
    else if (s >= SKILLS_SPLIT_ENTER) nextSection = 'skills'

    if (s > 0.0005 || triggerReallyActive) {
      if (nextSection !== activeStageSectionRef.current) {
        activeStageSectionRef.current = nextSection
        onActiveSectionChangeRef.current?.(nextSection)
      }
    } else if (activeStageSectionRef.current !== null && s <= 0.0005) {
      activeStageSectionRef.current = null
    }
  }, [])

  // Expose global helper for QA test automation & instant jumps
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__applyStage = (sRaw: number, aboutOverrideP?: number) => {
        pendingInitialHashRef.current = null
        aboutManualOverrideRef.current =
          typeof aboutOverrideP === 'number' ? aboutOverrideP : null
        applyStage(sRaw)
        aboutManualOverrideRef.current = null

        const s = clamp01(sRaw)
        if (s > 0.0005) {
          onStageActiveChangeRef.current?.(true)
          const eVal = clamp01(
            (s - TRANS_SKILLS_HACK.start) / (TRANS_SKILLS_HACK.end - TRANS_SKILLS_HACK.start)
          )
          const fVal = clamp01(
            (s - FALLING_CARDS_SEG.start) / (FALLING_CARDS_SEG.end - FALLING_CARDS_SEG.start)
          )
          const cVal = clamp01(
            (s - TRANS_ACH_CONTACT.start) / (TRANS_ACH_CONTACT.end - TRANS_ACH_CONTACT.start)
          )
          let manualSec: SectionId = 'about'
          if (cVal >= 0.78) manualSec = 'contact'
          else if (s >= ACH_SEG.start + 0.005) manualSec = 'achievements'
          else if (fVal >= 0.72) manualSec = 'projects'
          else if (eVal >= 0.25) manualSec = 'hackathons'
          else if (s >= SKILLS_SPLIT_ENTER) manualSec = 'skills'
          activeStageSectionRef.current = manualSec
          onActiveSectionChangeRef.current?.(manualSec)
        } else {
          activeStageSectionRef.current = null
        }
      }
    }
    return () => {
      delete (window as any).__applyStage
    }
  }, [applyStage])

  // Setup canvases and ScrollTrigger
  useEffect(() => {
    const stage = stageRef.current
    const crisp = crispCanvasRef.current
    const glow = glowCanvasRef.current
    const falling = fallingCanvasRef.current
    const offscreen = offscreenCanvasRef.current
    const engine = engineRef.current

    if (!stage || !crisp || !glow || !falling || !offscreen || !engine) return

    const updateDimensions = () => {
      const W = window.innerWidth
      const H = window.innerHeight
      const dpr = 1.0
      const cardDpr = Math.min(2, window.devicePixelRatio || 1)

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

      falling.width = Math.round(W * cardDpr)
      falling.height = Math.round(H * cardDpr)
      falling.style.width = `${W}px`
      falling.style.height = `${H}px`

      if (blockWipeEngineRef.current) {
        blockWipeEngineRef.current.resize(W, H)
      }
      const blockWipe = blockWipeCanvasRef.current
      if (blockWipe) {
        const wipeDpr = Math.min(2, window.devicePixelRatio || 1)
        blockWipe.width = Math.round(W * wipeDpr)
        blockWipe.height = Math.round(H * wipeDpr)
        blockWipe.style.width = `${W}px`
        blockWipe.style.height = `${H}px`
      }
    }

    updateDimensions()

    const initialHash = typeof window !== 'undefined' ? window.location.hash : ''
    if (
      initialHash === '#about' ||
      initialHash === '#skills' ||
      initialHash === '#hackathons' ||
      initialHash === '#projects' ||
      initialHash === '#achievements' ||
      initialHash === '#contact'
    ) {
      pendingInitialHashRef.current = initialHash
    }

    const onRefreshInit = () => {
      isRefreshingRef.current = true
    }

    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: `+=${STAGE_TOTAL_VH}%`,
      pin: true,
      anticipatePin: 1,
      scrub: true,
      invalidateOnRefresh: true,
      refreshPriority: 1,
      onEnter: (self) => {
        if (self.start > 20) {
          onStageActiveChangeRef.current?.(true)
        }
        if (!isRefreshingRef.current) {
          applyStage(self.progress)
        }
      },
      onUpdate: (self) => {
        if (!isRefreshingRef.current) {
          applyStage(self.progress)
        }
      },
      onLeaveBack: () => {
        activeStageSectionRef.current = null
        onStageActiveChangeRef.current?.(false)
        applyStage(0)
        onActiveSectionChangeRef.current?.('welcome')
      },
      onRefresh: (self) => {
        updateDimensions()
        if (!isRefreshingRef.current) {
          applyStage(self.progress)
        }
      },
    })

    const onRefreshComplete = () => {
      isRefreshingRef.current = false
      if (triggerRef.current) {
        applyStage(triggerRef.current.progress)
      }
    }

    ScrollTrigger.addEventListener('refreshInit', onRefreshInit)
    ScrollTrigger.addEventListener('refresh', onRefreshComplete)

    triggerRef.current = trigger
    onStageTriggerCreatedRef.current?.(trigger)

    // Deep-link initial state
    let initialP = trigger.progress || 0
    if (initialHash === '#about') initialP = STAGE_HOLD_PROGRESS.about
    else if (initialHash === '#skills') initialP = STAGE_HOLD_PROGRESS.skills
    else if (initialHash === '#hackathons') initialP = STAGE_HOLD_PROGRESS.hackathons
    else if (initialHash === '#projects') initialP = STAGE_HOLD_PROGRESS.projects
    else if (initialHash === '#achievements') initialP = STAGE_HOLD_PROGRESS.achievements
    else if (initialHash === '#contact') initialP = STAGE_HOLD_PROGRESS.contact

    if (initialHash && initialP > 0 && trigger.start > 0) {
      const scrollPos = trigger.start + initialP * (trigger.end - trigger.start)
      window.scrollTo(0, scrollPos)
      if ((window as any).lenis) {
        ;(window as any).lenis.scrollTo(scrollPos, { immediate: true })
      }
      trigger.scroll(scrollPos)
    }

    applyStage(initialP)

    const handleHashChange = () => {
      const hash = window.location.hash
      let targetProgress: number | null = null
      if (hash === '#about') targetProgress = STAGE_HOLD_PROGRESS.about
      else if (hash === '#skills') targetProgress = STAGE_HOLD_PROGRESS.skills
      else if (hash === '#hackathons') targetProgress = STAGE_HOLD_PROGRESS.hackathons
      else if (hash === '#projects') targetProgress = STAGE_HOLD_PROGRESS.projects
      else if (hash === '#achievements') targetProgress = STAGE_HOLD_PROGRESS.achievements
      else if (hash === '#contact') targetProgress = STAGE_HOLD_PROGRESS.contact

      if (targetProgress !== null && triggerRef.current) {
        pendingInitialHashRef.current = null
        const tr = triggerRef.current
        const scrollPos = tr.start + targetProgress * (tr.end - tr.start)
        if ((window as any).lenis) {
          ;(window as any).lenis.scrollTo(scrollPos, { immediate: true })
        } else {
          window.scrollTo(0, scrollPos)
        }
        applyStage(targetProgress)
      }
    }
    window.addEventListener('hashchange', handleHashChange)

    const handleResize = () => {
      updateDimensions()
      ScrollTrigger.refresh()
    }

    window.addEventListener('resize', handleResize)

    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (!cancelled) {
        ScrollTrigger.refresh()
      }
    })

    const handleWindowLoad = () => {
      ScrollTrigger.refresh()
    }
    window.addEventListener('load', handleWindowLoad, { once: true })

    return () => {
      cancelled = true
      ScrollTrigger.removeEventListener('refreshInit', onRefreshInit)
      ScrollTrigger.removeEventListener('refresh', onRefreshComplete)
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('load', handleWindowLoad)
      trigger.kill()
    }
  }, [applyStage])

  return (
    <section
      id="stage"
      ref={stageRef}
      className="pixel-stage"
      data-theme={siteTheme}
      style={
        {
          ['--ps-glow-blur' as string]: `${PIXEL_SCAN_CONFIG.glowBlurPx}px`,
          ['--ps-glow-brightness' as string]: String(PIXEL_SCAN_CONFIG.glowBrightness),
        } as CSSProperties
      }
    >
      {/* 1. Seamless Backdrop at z: 1 (starts dark for Monitor/About -> stays solid dark void for kinetic split) */}
      <div ref={voidScreenRef} className="ps-screen ps-screen--void" style={{ background: '#000000' }} />

      {/* 2. Screen Skills at z: 2 */}
      <div
        ref={skillsScreenRef}
        className="ps-screen ps-screen--skills"
        id="skills"
        style={{ zIndex: 2 }}
      >
        <div className="ps-screen-content--skills">
          <Skills
            embedded
            stageMode
            active={skillsActive}
            instantComplete={skillsInstantComplete}
            showHeading
          />
        </div>
      </div>

      {/* 2b. Dynamic kinetic seam line between white wipe and black void at z: 3 */}
      <svg
        ref={splitLineSvgRef}
        className="ps-skills-split-svg"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 3,
          overflow: 'visible',
          opacity: 0,
        }}
      >
        <line
          ref={splitLineRef}
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
          stroke="#090d18"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      {/* 3. Screen About at z: 4 (starts seamlessly from Monitor dark void at s = 0) */}
      <div
        ref={aboutScreenRef}
        className="ps-screen ps-screen--about"
        id="about"
        data-theme="dark"
        style={{ zIndex: 4, background: 'transparent' }}
      >
        <div className="ps-screen-content--about">
          <About embedded stageMode />
        </div>
      </div>

      {/* 3b. Cinematic Layered Colour-Wipe Transition Bridge (About Me -> Skills) at z: 10 */}
      <div
        ref={colorWipeRef}
        className="ps-screen ps-screen--color-wipe"
        aria-hidden="true"
        style={{ zIndex: 10, visibility: 'hidden', display: 'none' }}
      >
        <CinematicColorWipe />
      </div>

      {/* 4. Screen Hackathons at z: 4 */}
      <div
        ref={hackScreenRef}
        className="ps-screen ps-screen--hackathons"
        id="hackathons"
        data-theme="dark"
        style={{ zIndex: 4 }}
      >
        <Hackathons
          embedded
          stageMode
          active={hackActive}
          forceOverview={hackForceOverview}
        />
      </div>

      {/* 5. Falling Cards Bridge Canvas at z: 5 (Hackathons Dark -> Falling Cards -> Pure White) */}
      <canvas
        id="falling-cards-canvas"
        ref={fallingCanvasRef}
        className="ps-falling-cards-canvas"
        style={{ zIndex: 5, visibility: 'hidden' }}
        aria-hidden="true"
      />

      {/* 6. Screen Projects (Text-Only Top-to-Down) at z: 6 */}
      <div
        ref={projectsScreenRef}
        className="ps-screen ps-screen--projects"
        id="projects"
        style={{ zIndex: 6, background: '#ffffff' }}
      >
        <div className="ps-screen-content--projects">
          <ProjectsEditorial embedded onSelectProject={onSelectProject} />
        </div>
      </div>

      {/* 7. Screen Achievements at z: 7 */}
      <div
        ref={achievementsScreenRef}
        className="ps-screen ps-screen--achievements"
        id="achievements"
        style={{ zIndex: 7 }}
      >
        <div className="ps-screen-content--achievements">
          <Achievements embedded revealProgress={1} />
        </div>
      </div>

      {/* 8. Screen Contact at z: 8 */}
      <div ref={contactScreenRef} className="ps-screen ps-screen--contact" id="contact" style={{ zIndex: 8 }}>
        <div className="ps-screen-content ps-screen-content--contact">
          <Contact embedded />
        </div>
      </div>

      {/* 9. Pixel Block Wipe Transition Canvas at z: 12 (Achievements -> Contact) */}
      <canvas
        ref={blockWipeCanvasRef}
        className="ps-block-wipe-canvas"
        aria-hidden="true"
      />

      {/* 10. PixelScan Overlay Canvases at z: 10 */}
      <canvas ref={crispCanvasRef} className="ps-canvas ps-crisp" aria-hidden="true" />
      <canvas ref={glowCanvasRef} className="ps-canvas ps-glow" aria-hidden="true" />
    </section>
  )
}

export default PixelStage
