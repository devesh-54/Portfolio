import { useEffect, useRef } from 'react'
import { projects, type ProjectItem } from '../config/projects'
import './ProjectsEditorial.css'

export interface ProjectsEditorialProps {
  embedded?: boolean
  onSelectProject?: (
    project: ProjectItem,
    rect?: { left: number; top: number; width: number; height: number }
  ) => void
}

// All featured ("Selected Projects") builds
const SELECTED_PROJECTS: ProjectItem[] = projects.filter((p) => p.featured)

// Spacing & Stations along center spine:
// Distance between stations is 0.32, bottom station at 0.74, robot docked at 0.85
// Spine line connects directly into the top antenna beacon of the robot (zero gap)
const STATION_DELTA_Y = 0.32
const BOT_STATION_Y = 0.74
const DOCK_Y = 0.85

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
 * Synchronously animates the Selected Projects timeline:
 * - Shows at most 3 projects in the viewport at any time.
 * - deployP (0 -> 1): Courier Bot & vertical centerline descend together, line connected directly to robot.
 * - streamP (0 -> 1): As user scrolls, each project reaches the bottom station where the robot collects it.
 *   Once collected, that project is removed, and the next project smoothly descends down to the robot.
 *   The vertical spine line remains connected directly to the robot throughout the entire timeline.
 */
export function applyProjectsStageVars(
  containerEl: HTMLElement | null,
  deployProgress: number,
  streamProgress = 0
): void {
  if (!containerEl) return
  const P = clamp01(deployProgress)
  const S_raw = clamp01(streamProgress)
  containerEl.dataset.revealP = P.toFixed(4)
  containerEl.dataset.streamP = S_raw.toFixed(4)

  const headerEl = containerEl.querySelector<HTMLElement>('.pe-header')
  const timelineEl = containerEl.querySelector<HTMLElement>('.pe-timeline')
  const spineEl = containerEl.querySelector<HTMLElement>('.pe-spine-fill')
  const botEl = containerEl.querySelector<HTMLElement>('.pe-bot')
  const botCountEl = containerEl.querySelector<HTMLElement>('.pe-bot-count')
  const rows = containerEl.querySelectorAll<HTMLElement>('.pe-station')

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const effP = isMobile ? 1 : P
  const effS = isMobile ? 0 : S_raw

  // 1. Header entrance (0..0.15) and exit at end of stream (0.88..0.98)
  if (headerEl) {
    const enterH = smoothstep(0.0, 0.15, effP)
    const exitH = effS > 0.001 ? 1 - smoothstep(0.88, 0.98, effS) : 1
    const hOp = enterH * exitH
    headerEl.style.opacity = hOp.toFixed(3)
    const hY = effS > 0.88 ? (1 - exitH) * -16 : (1 - enterH) * -16
    headerEl.style.transform = `translate3d(0, ${hY.toFixed(1)}px, 0)`
  }

  const timelineH = Math.max(260, timelineEl?.clientHeight || 560)
  const timelineW = Math.max(320, timelineEl?.clientWidth || 1040)
  const armLenPx = timelineW <= 960 ? 30 : 38

  let collectedCount = 0
  const isCollectingStream = effS > 0.001
  const totalCount = Math.max(1, rows.length)
  const streamStep = clamp01(effS / 0.88) * totalCount // across collection stream

  // 2. Center Vertical Spine & Autonomous Courier Bot
  const stageRect = containerEl.getBoundingClientRect?.()
  const timelineRect = timelineEl?.getBoundingClientRect?.()
  const topSpacePx = timelineRect && stageRect ? Math.max(0, timelineRect.top - stageRect.top) : 0
  const screenTopPx = -topSpacePx

  // Connect line directly with robot antenna beacon (-18px above bot center)
  const robotTargetPx = Math.max(0, DOCK_Y * timelineH - 18)
  const lastProjectU = streamStep - (totalCount - 1)
  const isLastProjectGone = isCollectingStream && lastProjectU >= 0.68
  const botDeployY = clamp01((effP - 0.04) / 0.86) * DOCK_Y

  let curBottomPx = robotTargetPx
  let curTopPx = screenTopPx

  if (!isCollectingStream) {
    // During deployment: line grows downwards attached directly to the robot
    const curBotPx = Math.max(0, botDeployY * timelineH - 18)
    curBottomPx = lerp(screenTopPx, curBotPx, clamp01((effP - 0.04) / 0.86))
    curTopPx = screenTopPx
  } else {
    // While projects are collecting, spine stays connected directly to the robot (zero gap)
    if (!isLastProjectGone) {
      curTopPx = screenTopPx
      curBottomPx = robotTargetPx
    } else {
      // ONLY AFTER last project enters the robot: line starts moving to the end
      const enterBotT = clamp01((lastProjectU - 0.68) / 0.14)
      curBottomPx = lerp(robotTargetPx, robotTargetPx + 10, enterBotT)
      const drainLineT = clamp01((lastProjectU - 0.72) / 0.22)
      curTopPx = lerp(screenTopPx, robotTargetPx + 10, drainLineT)
    }
  }

  if (spineEl) {
    const curHeight = Math.max(0, curBottomPx - curTopPx)
    spineEl.style.top = `${curTopPx.toFixed(1)}px`
    spineEl.style.height = `${curHeight.toFixed(1)}px`
    spineEl.style.transformOrigin = 'top center'
    spineEl.style.transform = 'translateX(-50%)'
    spineEl.style.opacity = curHeight > 2 ? '1' : '0'
  }

  // 3. Update each project station
  for (let i = 0; i < rows.length; i++) {
    const station = rows[i]
    const side = i % 2 === 0 ? -1 : 1 // -1 = Left, +1 = Right

    const nodeEl = station.querySelector<HTMLElement>('.pe-node')
    const armEl = station.querySelector<HTMLElement>('.pe-arm')
    const cardEl = station.querySelector<HTMLElement>('.pe-card')
    const cardBodyEl = station.querySelector<HTMLElement>('.pe-card-body')
    const pipeTracks = station.querySelectorAll<SVGPathElement>('.pe-pipe-track')
    const pipeTrackTop = station.querySelector<SVGPathElement>('.pe-pipe-track--top')
    const pipeTrackBot = station.querySelector<SVGPathElement>('.pe-pipe-track--bot')
    const pipePulseTop = station.querySelector<SVGPathElement>('.pe-pipe-pulse--top')
    const pipePulseBot = station.querySelector<SVGPathElement>('.pe-pipe-pulse--bot')

    if (!isCollectingStream) {
      // -------------------------------------------------------------
      // Initial Deploy & Browsing Mode (First 3 projects on screen)
      // -------------------------------------------------------------
      const initY = BOT_STATION_Y - i * STATION_DELTA_Y
      station.style.top = `${(initY * 100).toFixed(2)}%`

      if (i > 2) {
        // Projects 3, 4 are queued above screen
        station.style.opacity = '0'
        station.style.display = 'none'
        station.style.visibility = 'hidden'
        station.style.pointerEvents = 'none'
        if (cardEl) {
          cardEl.style.opacity = '0'
          cardEl.style.display = 'none'
          cardEl.style.visibility = 'hidden'
          cardEl.style.pointerEvents = 'none'
        }
        pipeTracks.forEach((t) => {
          t.style.opacity = '0'
          t.style.visibility = 'hidden'
        })
        if (pipePulseTop) {
          pipePulseTop.style.opacity = '0'
          pipePulseTop.style.visibility = 'hidden'
        }
        if (pipePulseBot) {
          pipePulseBot.style.opacity = '0'
          pipePulseBot.style.visibility = 'hidden'
        }
        continue
      }

      // Branch deployment triggered as Courier Bot passes station initY
      const branchStart = 0.04 + initY * 0.78
      const branchT = smoothstep(branchStart, branchStart + 0.16, effP)
      const cardSlide = smoothstep(0.18, 1.0, branchT)

      station.style.display = 'block'
      station.style.visibility = 'visible'
      station.style.opacity = '1'

      if (nodeEl) {
        nodeEl.style.visibility = 'visible'
        nodeEl.style.opacity = branchT.toFixed(3)
        nodeEl.style.transform = `translate(-50%, -50%) scale(${lerp(0.2, 1, branchT).toFixed(3)})`
      }
      if (armEl) {
        armEl.style.visibility = 'visible'
        const armScale = smoothstep(0.05, 0.65, branchT)
        armEl.style.opacity = branchT.toFixed(3)
        armEl.style.transform = `translateY(-50%) scaleX(${armScale.toFixed(3)})`
      }
      if (cardEl) {
        cardEl.style.display = 'block'
        cardEl.style.visibility = 'visible'
        cardEl.style.opacity = cardSlide.toFixed(3)
        cardEl.style.transform = `translate3d(${((1 - cardSlide) * side * -24).toFixed(1)}px, 0, 0) scale(${lerp(0.94, 1, cardSlide).toFixed(3)})`
        cardEl.style.pointerEvents = cardSlide > 0.45 ? 'auto' : 'none'
        cardEl.style.background = ''
        cardEl.style.borderColor = ''
        cardEl.style.boxShadow = ''
        cardEl.style.clipPath = ''
        cardEl.style.setProperty('--pe-notch-opacity', '1')
      }
      if (cardBodyEl) {
        cardBodyEl.style.opacity = '1'
        cardBodyEl.style.transform = 'none'
      }
      pipeTracks.forEach((t) => {
        t.style.opacity = '0'
        t.style.visibility = 'hidden'
      })
      if (pipePulseTop) {
        pipePulseTop.style.opacity = '0'
        pipePulseTop.style.visibility = 'hidden'
      }
      if (pipePulseBot) {
        pipePulseBot.style.opacity = '0'
        pipePulseBot.style.visibility = 'hidden'
      }
    } else {
      // -------------------------------------------------------------
      // Continuous Scroll Stream: card collects, next one descends
      // -------------------------------------------------------------
      const u = streamStep - i // How far past bottom station this project is

      if (u >= 1.0) {
        // Project i has already been collected into the robot: completely removed
        collectedCount += 1
        station.style.opacity = '0'
        station.style.display = 'none'
        station.style.visibility = 'hidden'
        station.style.pointerEvents = 'none'
        if (cardEl) {
          cardEl.style.opacity = '0'
          cardEl.style.display = 'none'
          cardEl.style.visibility = 'hidden'
          cardEl.style.pointerEvents = 'none'
        }
        pipeTracks.forEach((t) => {
          t.style.opacity = '0'
          t.style.visibility = 'hidden'
        })
        if (pipePulseTop) {
          pipePulseTop.style.opacity = '0'
          pipePulseTop.style.visibility = 'hidden'
        }
        if (pipePulseBot) {
          pipePulseBot.style.opacity = '0'
          pipePulseBot.style.visibility = 'hidden'
        }
      } else if (u >= 0) {
        // Project i is currently AT the bottom station and being collected into the robot
        station.style.top = `${(BOT_STATION_Y * 100).toFixed(2)}%`

        // Flow along pipe path: starts at u = 0.04, reaches robot at u = 0.68
        const flowProgress = clamp01((u - 0.04) / 0.64)

        if (flowProgress >= 1.0 || u >= 0.68) {
          // Lines have reached Courier Robot chassis: project collected
          collectedCount += 1
          station.style.opacity = '0'
          station.style.display = 'none'
          station.style.visibility = 'hidden'
          station.style.pointerEvents = 'none'
          if (cardEl) {
            cardEl.style.opacity = '0'
            cardEl.style.display = 'none'
            cardEl.style.visibility = 'hidden'
            cardEl.style.pointerEvents = 'none'
          }
          pipeTracks.forEach((t) => {
            t.style.opacity = '0'
            t.style.visibility = 'hidden'
          })
          if (pipePulseTop) {
            pipePulseTop.style.opacity = '0'
            pipePulseTop.style.visibility = 'hidden'
          }
          if (pipePulseBot) {
            pipePulseBot.style.opacity = '0'
            pipePulseBot.style.visibility = 'hidden'
          }
          if (armEl) {
            armEl.style.opacity = '0'
            armEl.style.visibility = 'hidden'
          }
          if (nodeEl) {
            nodeEl.style.opacity = '0'
            nodeEl.style.visibility = 'hidden'
          }
        } else {
          station.style.display = 'block'
          station.style.visibility = 'visible'
          station.style.opacity = '1'

          // Phase 1 (u: 0.0 .. 0.14): Text & content inside the box disappear
          const contentFade = 1 - smoothstep(0.0, 0.14, u)
          if (cardBodyEl) {
            cardBodyEl.style.opacity = contentFade.toFixed(3)
            const textSlideX = side * lerp(0, 16, smoothstep(0.0, 0.14, u))
            cardBodyEl.style.transform = `translate3d(${textSlideX.toFixed(1)}px, 0, 0)`
            cardBodyEl.style.pointerEvents = contentFade > 0.5 ? 'auto' : 'none'
          }

          // Card container dissolves by u = 0.18 as pulses flow
          const cardFade = 1 - smoothstep(0.0, 0.18, u)
          if (cardEl) {
            cardEl.style.opacity = cardFade.toFixed(3)
            if (cardFade <= 0.005) {
              cardEl.style.display = 'none'
              cardEl.style.visibility = 'hidden'
              cardEl.style.pointerEvents = 'none'
            } else {
              cardEl.style.display = 'block'
              cardEl.style.visibility = 'visible'
              cardEl.style.background = `linear-gradient(135deg, rgba(8, 18, 42, ${(0.96 * cardFade).toFixed(3)}) 0%, rgba(4, 10, 26, ${(0.98 * cardFade).toFixed(3)}) 100%)`
              cardEl.style.borderColor = `rgba(47, 208, 255, ${(0.5 * cardFade).toFixed(3)})`
              cardEl.style.boxShadow = `0 0 20px rgba(39, 0, 255, ${(0.3 * cardFade).toFixed(3)})`
              cardEl.style.pointerEvents = cardFade > 0.5 ? 'auto' : 'none'
              cardEl.style.clipPath = u > 0.05 ? 'none' : ''
              cardEl.style.setProperty('--pe-notch-opacity', cardFade.toFixed(3))
            }
          }

          // Measure exact card and robot geometry in station-relative coordinates:
          const stationRect = station.getBoundingClientRect()
          const nodeX = stationRect.left + stationRect.width * 0.5
          const nodeY = stationRect.top
          const cardRect = cardEl ? cardEl.getBoundingClientRect() : null
          const botRect = botEl ? botEl.getBoundingClientRect() : null

          const cardWidth = (cardEl && cardEl.clientWidth > 100) ? cardEl.clientWidth : 520
          const cardHeight = (cardEl && cardEl.clientHeight > 40) ? cardEl.clientHeight : 110
          const arm = armLenPx || 38
          const dropPx = botRect ? Math.max(30, botRect.top + botRect.height * 0.45 - nodeY) : Math.max(36, (DOCK_Y - BOT_STATION_Y) * timelineH)

          const hasValidRect = !!(cardRect && cardRect.width > 50 && cardRect.height > 20)

          let dTop = ''
          let dBot = ''

          if (side === -1) {
            // Left card: Card lies to the left of nodeX
            const xFar = hasValidRect ? (cardRect.left - nodeX + 8) : (-cardWidth - arm + 10)
            const xNear = hasValidRect ? (cardRect.right - nodeX) : (-arm)
            const yTop = hasValidRect ? (cardRect.top - nodeY) : (-cardHeight / 2)
            const yBot = hasValidRect ? (cardRect.bottom - nodeY) : (cardHeight / 2)

            // Top Pipe: Card top border -> corner -> card edge -> arm -> 90° down spine -> Courier Robot
            dTop = `M ${xFar.toFixed(1)} ${yTop.toFixed(1)} L ${(xNear - 12).toFixed(1)} ${yTop.toFixed(1)} Q ${xNear.toFixed(1)} ${yTop.toFixed(1)} ${xNear.toFixed(1)} ${(yTop + 12).toFixed(1)} L ${xNear.toFixed(1)} -10 Q ${xNear.toFixed(1)} 0 ${(xNear + 12).toFixed(1)} 0 L -8 0 Q 0 0 0 8 L 0 ${dropPx.toFixed(1)}`
            // Bottom Pipe: Card bottom border -> notch bevel -> card edge -> arm -> 90° down spine -> Courier Robot
            dBot = `M ${xFar.toFixed(1)} ${yBot.toFixed(1)} L ${(xNear - 22).toFixed(1)} ${yBot.toFixed(1)} L ${xNear.toFixed(1)} ${(yBot - 18).toFixed(1)} L ${xNear.toFixed(1)} 10 Q ${xNear.toFixed(1)} 0 ${(xNear + 12).toFixed(1)} 0 L -8 0 Q 0 0 0 8 L 0 ${dropPx.toFixed(1)}`
          } else {
            // Right card: Card lies to the right of nodeX
            const xFar = hasValidRect ? (cardRect.right - nodeX - 8) : (arm + cardWidth - 10)
            const xNear = hasValidRect ? (cardRect.left - nodeX) : (arm)
            const yTop = hasValidRect ? (cardRect.top - nodeY) : (-cardHeight / 2)
            const yBot = hasValidRect ? (cardRect.bottom - nodeY) : (cardHeight / 2)

            // Top Pipe: Card top border -> corner -> card edge -> arm -> 90° down spine -> Courier Robot
            dTop = `M ${xFar.toFixed(1)} ${yTop.toFixed(1)} L ${(xNear + 12).toFixed(1)} ${yTop.toFixed(1)} Q ${xNear.toFixed(1)} ${yTop.toFixed(1)} ${xNear.toFixed(1)} ${(yTop + 12).toFixed(1)} L ${xNear.toFixed(1)} -10 Q ${xNear.toFixed(1)} 0 ${(xNear - 12).toFixed(1)} 0 L 8 0 Q 0 0 0 8 L 0 ${dropPx.toFixed(1)}`
            // Bottom Pipe: Card bottom border -> corner/notch -> card edge -> arm -> 90° down spine -> Courier Robot
            dBot = `M ${xFar.toFixed(1)} ${yBot.toFixed(1)} L ${(xNear + 22).toFixed(1)} ${yBot.toFixed(1)} L ${xNear.toFixed(1)} ${(yBot - 18).toFixed(1)} L ${xNear.toFixed(1)} 10 Q ${xNear.toFixed(1)} 0 ${(xNear - 12).toFixed(1)} 0 L 8 0 Q 0 0 0 8 L 0 ${dropPx.toFixed(1)}`
          }

          if (pipeTrackTop && pipeTrackTop.getAttribute('d') !== dTop) pipeTrackTop.setAttribute('d', dTop)
          if (pipeTrackBot && pipeTrackBot.getAttribute('d') !== dBot) pipeTrackBot.setAttribute('d', dBot)
          if (pipePulseTop && pipePulseTop.getAttribute('d') !== dTop) pipePulseTop.setAttribute('d', dTop)
          if (pipePulseBot && pipePulseBot.getAttribute('d') !== dBot) pipePulseBot.setAttribute('d', dBot)

          // Fluid water-like line motion: small glowing lines travel along pipe tangents into Robot
          const trackOp = smoothstep(0.04, 0.12, u) * (1 - smoothstep(0.54, 0.68, u)) * 0.60
          pipeTracks.forEach((t) => {
            t.style.opacity = trackOp.toFixed(3)
            t.style.visibility = trackOp > 0.005 ? 'visible' : 'hidden'
          })

          const pulseLen = 58
          const gap = 80
          const pulseOp = smoothstep(0.04, 0.12, u) * (1 - smoothstep(0.56, 0.68, u))

          if (pipePulseTop) {
            const totalLen = pipePulseTop.getTotalLength ? pipePulseTop.getTotalLength() : 650
            pipePulseTop.style.strokeDasharray = `${pulseLen} ${gap} ${pulseLen} ${totalLen + 300}`
            const travelDist = totalLen + pulseLen
            pipePulseTop.style.strokeDashoffset = `${(-flowProgress * travelDist).toFixed(1)}px`
            pipePulseTop.style.opacity = pulseOp.toFixed(3)
            pipePulseTop.style.visibility = pulseOp > 0.005 ? 'visible' : 'hidden'
          }

          if (pipePulseBot) {
            const totalLen = pipePulseBot.getTotalLength ? pipePulseBot.getTotalLength() : 650
            pipePulseBot.style.strokeDasharray = `${pulseLen} ${gap} ${pulseLen} ${totalLen + 300}`
            const travelDist = totalLen + pulseLen
            pipePulseBot.style.strokeDashoffset = `${(-flowProgress * travelDist).toFixed(1)}px`
            pipePulseBot.style.opacity = pulseOp.toFixed(3)
            pipePulseBot.style.visibility = pulseOp > 0.005 ? 'visible' : 'hidden'
          }

          // Branch arm & station node retract along with card dissolve (no dangling empty node)
          if (armEl) {
            const armRemain = 1 - smoothstep(0.04, 0.18, u)
            armEl.style.opacity = armRemain.toFixed(3)
            armEl.style.transform = `translateY(-50%) scaleX(${armRemain.toFixed(3)})`
            armEl.style.visibility = armRemain > 0.005 ? 'visible' : 'hidden'
          }
          if (nodeEl) {
            const nodeRemain = 1 - smoothstep(0.06, 0.20, u)
            nodeEl.style.opacity = nodeRemain.toFixed(3)
            nodeEl.style.transform = `translate(-50%, -50%) scale(${nodeRemain.toFixed(3)})`
            nodeEl.style.visibility = nodeRemain > 0.005 ? 'visible' : 'hidden'
          }
        }
      } else {
        // Project i is moving DOWN towards the bottom station (u < 0) — "bring other one"
        const curY = BOT_STATION_Y - (i - streamStep) * STATION_DELTA_Y
        station.style.top = `${(curY * 100).toFixed(2)}%`
        station.style.display = 'block'
        station.style.visibility = 'visible'

        const entryFade = clamp01((curY - -0.05) / 0.18)
        station.style.opacity = entryFade.toFixed(3)

        if (nodeEl) {
          nodeEl.style.opacity = entryFade.toFixed(3)
          nodeEl.style.transform = 'translate(-50%, -50%) scale(1)'
          nodeEl.style.visibility = 'visible'
        }
        if (armEl) {
          armEl.style.opacity = entryFade.toFixed(3)
          armEl.style.transform = 'translateY(-50%) scaleX(1)'
          armEl.style.visibility = 'visible'
        }
        if (cardEl) {
          cardEl.style.display = 'block'
          cardEl.style.visibility = 'visible'
          cardEl.style.opacity = entryFade.toFixed(3)
          cardEl.style.transform = 'translate3d(0, 0, 0) scale(1)'
          cardEl.style.pointerEvents = entryFade > 0.6 ? 'auto' : 'none'
          cardEl.style.background = ''
          cardEl.style.borderColor = ''
          cardEl.style.boxShadow = ''
          cardEl.style.clipPath = ''
          cardEl.style.setProperty('--pe-notch-opacity', '1')
        }
        if (cardBodyEl) {
          cardBodyEl.style.opacity = '1'
          cardBodyEl.style.transform = 'none'
        }
        pipeTracks.forEach((t) => {
          t.style.opacity = '0'
          t.style.visibility = 'hidden'
        })
        if (pipePulseTop) {
          pipePulseTop.style.opacity = '0'
          pipePulseTop.style.visibility = 'hidden'
        }
        if (pipePulseBot) {
          pipePulseBot.style.opacity = '0'
          pipePulseBot.style.visibility = 'hidden'
        }
      }
    }
  }

  // 4. Update Autonomous Courier Bot position & collection effects
  if (botEl) {
    const enterBotOp = smoothstep(0.01, 0.08, effP)
    const exitBotOp = effS > 0.88 ? 1 - smoothstep(0.88, 0.99, effS) : 1
    const botOp = enterBotOp * exitBotOp
    const botDropPx = effS > 0.88 ? smoothstep(0.88, 1.0, effS) * 44 : 0
    const botY = isCollectingStream ? DOCK_Y : botDeployY

    botEl.style.top = `${(botY * 100).toFixed(2)}%`
    botEl.style.opacity = botOp.toFixed(3)
    botEl.style.transform = `translate3d(-50%, calc(-50% + ${botDropPx.toFixed(1)}px), 0)`

    // Robot actively collects during streamStep
    const curU = streamStep - Math.floor(streamStep)
    const isActivelyIngesting = isCollectingStream && curU >= 0.04 && curU <= 0.68
    botEl.dataset.collecting = isActivelyIngesting ? 'true' : 'false'

    if (botCountEl) {
      if (collectedCount > 0 && collectedCount <= totalCount) {
        botCountEl.textContent = `${collectedCount}/${totalCount}`
        botCountEl.style.opacity = '1'
      } else {
        botCountEl.style.opacity = '0'
      }
    }
  }
}

export function ProjectsEditorial({
  embedded = false,
  onSelectProject,
}: ProjectsEditorialProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!embedded && rootRef.current) {
      applyProjectsStageVars(rootRef.current, 1, 0)
    }
  }, [embedded])

  const handleSelectWithRect = (
    e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
    proj: ProjectItem
  ) => {
    const cardEl =
      (e.currentTarget as HTMLElement).closest('.pe-card') || (e.currentTarget as HTMLElement)
    const r = cardEl.getBoundingClientRect()
    onSelectProject?.(proj, {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
    })
  }

  return (
    <div
      ref={rootRef}
      className={`pe-stage ${embedded ? 'pe-stage--embedded' : ''}`}
    >
      <div className="pe-container">
        <header className="pe-header">
          <div className="pe-header-left">
            <span className="pe-eyebrow">
              Featured Builds · {String(SELECTED_PROJECTS.length).padStart(2, '0')} Selected
            </span>
            <h2 className="pe-title">Selected Projects</h2>
          </div>
        </header>

        <div className="pe-timeline" role="list">
          {/* Vertical Spine connected directly into Courier Robot */}
          <div className="pe-spine-fill" aria-hidden="true" />

          {/* Autonomous Courier Bot leading the line down & collecting boxes at the dock */}
          <div className="pe-bot" aria-hidden="true" data-collecting="false">
            <span className="pe-bot-count" />
            <svg
              className="pe-bot-svg"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Antenna beacon */}
              <line x1="20" y1="2.5" x2="20" y2="7.5" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20" cy="2.5" r="2" fill="#2FD0FF" />
              {/* Main hexagonal/rounded drone chassis */}
              <rect
                x="7"
                y="8"
                width="26"
                height="20"
                rx="6"
                fill="#FFFFFF"
                stroke="#000000"
                strokeWidth="2.2"
              />
              {/* Dark visor bay */}
              <rect x="11" y="12.5" width="18" height="9" rx="3" fill="#090D18" />
              {/* Dual glowing cyan optics */}
              <rect x="14" y="15.2" width="4" height="3.6" rx="1.2" fill="#2FD0FF" />
              <rect x="22" y="15.2" width="4" height="3.6" rx="1.2" fill="#2FD0FF" />
              {/* Base cargo collector tray / thruster wheels */}
              <path
                d="M12 28H28L25.5 33.5H14.5L12 28Z"
                fill="#000000"
              />
              <circle cx="14.5" cy="35.5" r="2.2" fill="#090D18" />
              <circle cx="25.5" cy="35.5" r="2.2" fill="#090D18" />
            </svg>
          </div>

          {SELECTED_PROJECTS.map((proj, idx) => {
            const isLeft = idx % 2 === 0
            const initY = BOT_STATION_Y - idx * STATION_DELTA_Y

            return (
              <div
                key={proj.id}
                role="listitem"
                className={`pe-station ${isLeft ? 'pe-station--left' : 'pe-station--right'}`}
                style={{ top: `${(initY * 100).toFixed(2)}%` }}
              >
                <span className="pe-node" aria-hidden="true" />
                <span className="pe-arm" aria-hidden="true" />

                {/* Fluid SVG Pipe Circuit: Guided water-like line motion along card borders, arm & spine into Courier Robot */}
                <svg className="pe-pipe-svg" aria-hidden="true">
                  <path className="pe-pipe-track pe-pipe-track--top" />
                  <path className="pe-pipe-track pe-pipe-track--bot" />
                  <path className="pe-pipe-pulse pe-pipe-pulse--top" />
                  <path className="pe-pipe-pulse pe-pipe-pulse--bot" />
                </svg>

                {/* Rich Project Card with cyber box design (ribbon, diagonal image cut, tech pills, and right-side GitHub + Demo buttons) */}
                {(() => {
                  const repoLink = proj.links?.find((l) =>
                    l.label.toLowerCase().includes('repo') || l.label.toLowerCase().includes('github')
                  )
                  const demoLink = proj.links?.find((l) =>
                    l.label.toLowerCase().includes('demo') ||
                    l.label.toLowerCase().includes('live') ||
                    l.label.toLowerCase().includes('model')
                  )

                  return (
                    <div
                      className="pe-card"
                      onClick={(e) => handleSelectWithRect(e, proj)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleSelectWithRect(e, proj)
                        }
                      }}
                    >
                      {/* Card inner body: content fades & slices out early on retreat */}
                      <div className="pe-card-body">
                        {/* Left: Media container with blue ribbon badge & diagonal cut */}
                        <div className="pe-card-media-wrap">
                          <span className="pe-ribbon-badge">{String(idx + 1).padStart(2, '0')}</span>
                          <div className="pe-card-media">
                            <img
                              src={proj.image}
                              alt={proj.title}
                              className="pe-card-img"
                              loading="lazy"
                              style={{ objectPosition: proj.focus || '50% 50%' }}
                            />
                          </div>
                        </div>

                        {/* Middle: Title with external link icon, Description, Tech Stack Pills */}
                        <div className="pe-card-content">
                          <div className="pe-card-title-row">
                            <h3 className="pe-name">{proj.title}</h3>
                            <svg
                              className="pe-external-icon"
                              viewBox="0 0 24 24"
                              width="13"
                              height="13"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </div>

                          <p className="pe-card-desc">{proj.summary}</p>

                          <div className="pe-stack">
                            {proj.stack.slice(0, 3).map((tech) => (
                              <span key={tech} className="pe-chip">
                                {tech}
                              </span>
                            ))}
                          </div>

                          {/* Subtle short accent line under chips from reference box */}
                          <div className="pe-card-accent-line" aria-hidden="true" />
                        </div>

                        {/* Right: Vertical column of 2 circular icon buttons (GitHub + Live Demo) */}
                        <div className="pe-card-actions">
                          {/* GitHub Icon Button */}
                          {repoLink ? (
                            <a
                              href={repoLink.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pe-action-btn pe-action-btn--github"
                              title="GitHub Repository"
                              aria-label={`${proj.title} GitHub Repository`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                />
                              </svg>
                            </a>
                          ) : (
                            <span className="pe-action-btn pe-action-btn--disabled" title="No repository">
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                />
                              </svg>
                            </span>
                          )}

                          {/* Live Demo Icon Button */}
                          {demoLink ? (
                            <a
                              href={demoLink.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pe-action-btn pe-action-btn--demo"
                              title="Live Demo"
                              aria-label={`${proj.title} Live Demo`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                              </svg>
                            </a>
                          ) : (
                            <button
                              type="button"
                              className="pe-action-btn pe-action-btn--demo"
                              title="View Project Details"
                              aria-label={`View ${proj.title} Details`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectWithRect(e, proj)
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ProjectsEditorial
