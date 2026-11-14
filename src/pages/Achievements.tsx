import { useRef, useState, useCallback } from 'react'
import { achievements } from '../config/achievements'
import './Achievements.css'

export interface AchievementsProps {
  embedded?: boolean
  revealProgress?: number
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Interpolates between two hex colors (#ffffff to #03050a)
 */
function interpolateColor(c1: string, c2: string, t: number): string {
  const clampT = clamp01(t)
  const r1 = parseInt(c1.slice(1, 3), 16)
  const g1 = parseInt(c1.slice(3, 5), 16)
  const b1 = parseInt(c1.slice(5, 7), 16)

  const r2 = parseInt(c2.slice(1, 3), 16)
  const g2 = parseInt(c2.slice(3, 5), 16)
  const b2 = parseInt(c2.slice(5, 7), 16)

  const r = Math.round(lerp(r1, r2, clampT))
  const g = Math.round(lerp(g1, g2, clampT))
  const b = Math.round(lerp(b1, b2, clampT))

  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Synchronous DOM updater driving:
 * 1. Title "Achievements" drops from top and settles at center (clean white page, no box yet)
 * 2. Box forms around the title with soft edge elevation shadow (no harsh black outer border)
 * 3. Two soft shadow grooves slice down to divide the card into 3 pieces (shadow cleft instead of black line)
 * 4. Box breaks into 3 parts; as cards break, title smoothly moves upper above the cards
 * 5. 180° flip in place: screen background turns black, title turns white, revealing B&W milestone cards
 * 6. Constant card height and width throughout (NO resizing during flipping)
 */
export function applyAchievementsStageVars(
  containerEl: HTMLElement | null,
  _pTotal: number,
  pTitleDrop: number,
  pCardHold: number, // drives box formation
  pDividers: number,
  pSeparate: number,
  pFlip: number,
  pDarken: number,
  pExit: number = 0 // 0 when holding on achievements, 0 -> 1 when reversing to Contact!
): void {
  if (!containerEl) return

  const pDrop = clamp01(pTitleDrop)
  const pBox = clamp01(pCardHold)
  const pDiv = clamp01(pDividers)
  const pSep = clamp01(pSeparate)
  const pFl = clamp01(pFlip)
  const pDark = clamp01(pDarken)
  const pEx = clamp01(pExit)

  // 1. Stage background color: Pure white (#ffffff) -> Deep black (#03050a)
  const bgCol = interpolateColor('#ffffff', '#03050a', pDark)
  containerEl.style.backgroundColor = bgCol

  // 2. Title Group Choreography:
  // Phase 1 (pDrop 0->1): drops from -220px above into the center (Y = 0)
  // Phase 2 (pBox & pDiv): stays centered at Y = 0 as box forms and cut lines slice
  // Phase 3 (pSep 0->1): as cards break, title glides upward from Y = 0 to Y = -268px (above cards)
  // Phase Exit (pEx > 0): "without title this time" — title smoothly glides upward and fades out!
  const titleGroup = containerEl.querySelector<HTMLElement>('.ach-main-title-group')
  const titleEl = containerEl.querySelector<HTMLElement>('.ach-main-title')
  const eyebrowEl = containerEl.querySelector<HTMLElement>('.ach-main-eyebrow')

  if (titleGroup) {
    let titleY = 0
    let titleOp = 0
    let titleScale = 1 - pSep * 0.18

    if (pEx > 0.001) {
      // Reversing to Contact: title simply glides upward and fades out
      const pExitTitle = clamp01(pEx / 0.35)
      titleY = -268 - pExitTitle * 50
      titleOp = (1 - pExitTitle)
      titleScale = 0.82 - pExitTitle * 0.04
    } else if (pSep > 0.001) {
      // Moves upper above the cards as they break apart
      titleY = -pSep * 268
      titleOp = clamp01(pDrop * 1.5)
    } else {
      // Descends from top into center
      titleY = (1 - pDrop) * -220
      titleOp = clamp01(pDrop * 1.5)
    }

    titleGroup.style.transform = `translate3d(-50%, calc(-50% + ${titleY.toFixed(1)}px), 0) scale(${titleScale.toFixed(3)})`
    titleGroup.style.opacity = titleOp.toFixed(3)
  }

  // Title & Eyebrow Color Transition (Black on white -> White on black void)
  if (titleEl) {
    titleEl.style.color = interpolateColor('#000000', '#ffffff', pDark)
    if (pDark > 0.05 && pEx < 0.25) {
      titleEl.style.textShadow = `0 0 ${(pDark * 24).toFixed(1)}px rgba(255, 255, 255, ${(pDark * 0.25).toFixed(2)})`
    } else {
      titleEl.style.textShadow = 'none'
    }
  }

  if (eyebrowEl) {
    eyebrowEl.style.color = interpolateColor('#666666', '#a5b0c2', pDark)
  }

  // 3. 3D Stage & Box Formation / Exit Dissolve
  const stage3d = containerEl.querySelector<HTMLElement>('.ach-3d-stage')
  const pExitJoin = clamp01(pEx / 0.34) // Cards join flush by pEx = 0.34
  const effectiveSep = pSep * (1 - pExitJoin)
  const pExitDisappear = clamp01((pEx - 0.34) / 0.20) // Box disappears smoothly by pEx = 0.54

  let boxOp = pDrop < 0.9 ? 0 : pBox
  let boxScale = lerp(0.96, 1.0, boxOp)

  if (pEx > 0.001) {
    boxOp = 1 - pExitDisappear
    boxScale = 1.0 - pExitDisappear * 0.05
  }

  if (stage3d) {
    const gapPx = effectiveSep * 24
    stage3d.style.setProperty('--ach-gap', `${gapPx.toFixed(1)}px`)
    stage3d.style.opacity = boxOp.toFixed(3)
    stage3d.style.transform = `scale(${boxScale.toFixed(3)})`
    stage3d.style.visibility = boxOp < 0.005 ? 'hidden' : 'visible'

    // Outer perimeter border and elevation shadow:
    if (pDark > 0.5 && effectiveSep < 0.03 && pEx > 0.35 && boxOp > 0.01) {
      // Dark mode fused box: elevation shadow and border fade out dynamically with boxOp as the box disappears
      stage3d.style.boxShadow = `0 ${(24 * boxOp).toFixed(1)}px ${(60 * boxOp).toFixed(1)}px rgba(0, 0, 0, ${(0.95 * boxOp).toFixed(3)}), 0 ${(4 * boxOp).toFixed(1)}px ${(18 * boxOp).toFixed(1)}px rgba(0, 0, 0, ${(0.8 * boxOp).toFixed(3)})`
      stage3d.style.border = `1px solid rgba(255, 255, 255, ${(0.6 * boxOp).toFixed(3)})`
      stage3d.style.borderRadius = '16px'
    } else if (pSep < 0.03 && boxOp > 0.05 && pDark < 0.5) {
      // Light mode box formation at the beginning
      stage3d.style.boxShadow = `0 20px 50px rgba(0, 0, 0, ${(0.09 * boxOp).toFixed(3)}), 0 4px 16px rgba(0, 0, 0, ${(0.04 * boxOp).toFixed(3)})`
      stage3d.style.border = `1px solid rgba(0, 0, 0, ${(0.06 * boxOp).toFixed(3)})`
      stage3d.style.borderRadius = '16px'
    } else {
      stage3d.style.boxShadow = 'none'
      stage3d.style.border = 'none'
    }

    // Enable interactive mouse/hover behaviors ONLY when settled in dark void (disabled during transition to Contact)
    const isInteractive = pFl >= 0.85 && pEx < 0.04
    stage3d.setAttribute('data-interactive', isInteractive ? 'true' : 'false')
    if (!isInteractive) {
      stage3d.style.setProperty('--stage-tilt-x', '0deg')
      stage3d.style.setProperty('--stage-tilt-y', '0deg')
    }
  }

  // 4. Cut Lines:
  // When entering: expand outward from vertical center (scaleY 0 -> 1) with soft shadow groove
  // When exiting: subtle dark shadow grooves (shadow clefts), dissolving smoothly with boxOp
  const cut1 = containerEl.querySelector<HTMLElement>('.ach-cut-line--1')
  const cut2 = containerEl.querySelector<HTMLElement>('.ach-cut-line--2')

  if (pEx > 0.001) {
    // Dark mode shadow groove dividers: subtle dark shadow clefts between sections, fading out with boxOp
    const shadowDivOp = pExitJoin > 0.7 ? boxOp : 0
    if (cut1) {
      cut1.style.opacity = shadowDivOp.toFixed(3)
      cut1.style.transform = `scaleY(${boxOp.toFixed(4)})`
      cut1.style.background = 'rgba(0, 0, 0, 0.7)'
      cut1.style.boxShadow = '1px 0 3px rgba(0, 0, 0, 0.9), -1px 0 3px rgba(0, 0, 0, 0.9)'
    }
    if (cut2) {
      cut2.style.opacity = shadowDivOp.toFixed(3)
      cut2.style.transform = `scaleY(${boxOp.toFixed(4)})`
      cut2.style.background = 'rgba(0, 0, 0, 0.7)'
      cut2.style.boxShadow = '1px 0 3px rgba(0, 0, 0, 0.9), -1px 0 3px rgba(0, 0, 0, 0.9)'
    }
  } else {
    // Normal entry cut lines
    const cutOp = pDiv > 0.01 && pSep < 0.5 ? clamp01(pDiv / 0.25) * (1 - clamp01(pSep / 0.35)) : 0
    if (cut1) {
      cut1.style.opacity = cutOp.toFixed(3)
      cut1.style.transform = `scaleY(${pDiv.toFixed(4)})`
      cut1.style.background = 'rgba(0, 0, 0, 0.08)'
      cut1.style.boxShadow = '1px 0 2px rgba(0, 0, 0, 0.04), -1px 0 2px rgba(0, 0, 0, 0.04)'
    }
    if (cut2) {
      cut2.style.opacity = cutOp.toFixed(3)
      cut2.style.transform = `scaleY(${pDiv.toFixed(4)})`
      cut2.style.background = 'rgba(0, 0, 0, 0.08)'
      cut2.style.boxShadow = '1px 0 2px rgba(0, 0, 0, 0.04), -1px 0 2px rgba(0, 0, 0, 0.04)'
    }
  }

  // 5. Card Faces: Clean solid white front face; strictly toggle visibility during flip so NO white bleed or mirrored text can occur
  const slot0 = containerEl.querySelector<HTMLElement>('.ach-card-slot--0')
  const slot1 = containerEl.querySelector<HTMLElement>('.ach-card-slot--1')
  const slot2 = containerEl.querySelector<HTMLElement>('.ach-card-slot--2')

  const face0 = slot0?.querySelector<HTMLElement>('.ach-card-face--front')
  const face1 = slot1?.querySelector<HTMLElement>('.ach-card-face--front')
  const face2 = slot2?.querySelector<HTMLElement>('.ach-card-face--front')

  const back0 = slot0?.querySelector<HTMLElement>('.ach-card-face--back')
  const back1 = slot1?.querySelector<HTMLElement>('.ach-card-face--back')
  const back2 = slot2?.querySelector<HTMLElement>('.ach-card-face--back')

  const isFrontActive = pFl < 0.49
  const isBackActive = pFl >= 0.49

  const frontVisibility = isFrontActive ? 'visible' : 'hidden'
  const frontOpacity = isFrontActive ? '1' : '0'
  const backVisibility = isBackActive ? 'visible' : 'hidden'
  const backOpacity = isBackActive ? '1' : '0'

  const individualCardShadow = effectiveSep >= 0.03 ? '0 20px 48px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04)' : 'none'
  const individualCardBorder = effectiveSep >= 0.03 ? '1px solid rgba(0, 0, 0, 0.07)' : 'none'

  if (face0) {
    face0.style.border = individualCardBorder
    face0.style.boxShadow = individualCardShadow
    face0.style.borderRadius = effectiveSep < 0.03 ? '16px 0 0 16px' : '16px'
    face0.style.visibility = frontVisibility
    face0.style.opacity = frontOpacity
  }
  if (face1) {
    face1.style.border = individualCardBorder
    face1.style.boxShadow = individualCardShadow
    face1.style.borderRadius = effectiveSep < 0.03 ? '0' : '16px'
    face1.style.visibility = frontVisibility
    face1.style.opacity = frontOpacity
  }
  if (face2) {
    face2.style.border = individualCardBorder
    face2.style.boxShadow = individualCardShadow
    face2.style.borderRadius = effectiveSep < 0.03 ? '0 16px 16px 0' : '16px'
    face2.style.visibility = frontVisibility
    face2.style.opacity = frontOpacity
  }

  if (back0) {
    back0.style.visibility = backVisibility
    back0.style.opacity = backOpacity
    back0.style.borderRadius = effectiveSep < 0.03 ? '16px 0 0 16px' : '16px'
    if (pEx > 0.001) {
      // Remove inner right border during exit joining to eliminate white seam
      back0.style.borderRight = 'none'
    } else {
      back0.style.borderRight = ''
    }
  }
  if (back1) {
    back1.style.visibility = backVisibility
    back1.style.opacity = backOpacity
    back1.style.borderRadius = effectiveSep < 0.03 ? '0' : '16px'
    if (pEx > 0.001) {
      // Remove inner left and right borders during exit joining to eliminate white seams
      back1.style.borderLeft = 'none'
      back1.style.borderRight = 'none'
    } else {
      back1.style.borderLeft = ''
      back1.style.borderRight = ''
    }
  }
  if (back2) {
    back2.style.visibility = backVisibility
    back2.style.opacity = backOpacity
    back2.style.borderRadius = effectiveSep < 0.03 ? '0 16px 16px 0' : '16px'
    if (pEx > 0.001) {
      // Remove inner left border during exit joining to eliminate white seam
      back2.style.borderLeft = 'none'
    } else {
      back2.style.borderLeft = ''
    }
  }

  // Interior card text opacity:
  // "while joining remove white effect completely making the card dark and joining"
  // Fades out early so cards become pure solid dark blocks as they merge
  const cardBacks = containerEl.querySelectorAll<HTMLElement>('.ach-card-face--back')
  if (pEx > 0.001) {
    const textOp = 1 - clamp01(pEx / 0.24)
    cardBacks.forEach((b) => {
      const children = b.children
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement
        child.style.opacity = textOp.toFixed(3)
      }
    })
  } else {
    cardBacks.forEach((b) => {
      const children = b.children
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement
        child.style.opacity = '1'
      }
    })
  }

  // 6. 3D Gap offset & Depth Positioning (joining cards during exit)
  if (slot0) {
    const zOffset = -20 * effectiveSep
    slot0.style.transform = `translate3d(calc(-50% - 100% - var(--ach-gap, 0px)), -50%, ${zOffset.toFixed(1)}px)`
  }
  if (slot1) {
    const zOffset = 24 * effectiveSep
    slot1.style.transform = `translate3d(-50%, -50%, ${zOffset.toFixed(1)}px)`
  }
  if (slot2) {
    const zOffset = -20 * effectiveSep
    slot2.style.transform = `translate3d(calc(-50% + 100% + var(--ach-gap, 0px)), -50%, ${zOffset.toFixed(1)}px)`
  }

  // 7. 3D Card Rotations: Fanning outward as cards break, then 180° flip; during exit, un-fan flat
  const inner0 = slot0?.querySelector<HTMLElement>('.ach-card-inner-3d')
  const inner1 = slot1?.querySelector<HTMLElement>('.ach-card-inner-3d')
  const inner2 = slot2?.querySelector<HTMLElement>('.ach-card-inner-3d')

  if (inner0) {
    const rotY = 14 * effectiveSep + 180 * pFl
    const rotZ = -2 * effectiveSep * (1 - pFl * 0.4)
    inner0.style.transform = `rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`
  }
  if (inner1) {
    const rotY = 180 * pFl
    inner1.style.transform = `rotateY(${rotY.toFixed(2)}deg)`
  }
  if (inner2) {
    const rotY = -14 * effectiveSep + 180 * pFl
    const rotZ = 2 * effectiveSep * (1 - pFl * 0.4)
    inner2.style.transform = `rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`
  }
}

export function Achievements({
  embedded = false,
  revealProgress = 1,
}: AchievementsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const p = clamp01(revealProgress)

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Pointer move on individual card for 3D tilt moving effect & cursor spotlight (NO ZOOM)
  const handleCardPointerMove = useCallback((e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    const cardEl = e.currentTarget
    const rect = cardEl.getBoundingClientRect()
    const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    const tiltX = (py - 0.5) * 14
    const tiltY = (0.5 - px) * 14

    cardEl.style.setProperty('--card-tilt-x', `${tiltX.toFixed(2)}deg`)
    cardEl.style.setProperty('--card-tilt-y', `${tiltY.toFixed(2)}deg`)
  }, [])

  const handleCardPointerEnter = useCallback((id: string) => {
    setHoveredId(id)
  }, [])

  const handleCardPointerLeave = useCallback((e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    const cardEl = e.currentTarget
    cardEl.style.setProperty('--card-tilt-x', '0deg')
    cardEl.style.setProperty('--card-tilt-y', '0deg')
    setHoveredId(null)
  }, [])

  // Ambient stage parallax on mouse move across the dark void
  const handleStagePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const stage = rootRef.current?.querySelector<HTMLElement>('.ach-3d-stage')
    if (!stage || stage.getAttribute('data-interactive') !== 'true') return
    const rect = rootRef.current!.getBoundingClientRect()
    const normX = (e.clientX - rect.left) / rect.width - 0.5
    const normY = (e.clientY - rect.top) / rect.height - 0.5

    stage.style.setProperty('--stage-tilt-x', `${(-normY * 5).toFixed(2)}deg`)
    stage.style.setProperty('--stage-tilt-y', `${(normX * 6).toFixed(2)}deg`)
  }, [])

  const handleStagePointerLeave = useCallback(() => {
    const stage = rootRef.current?.querySelector<HTMLElement>('.ach-3d-stage')
    if (stage) {
      stage.style.setProperty('--stage-tilt-x', '0deg')
      stage.style.setProperty('--stage-tilt-y', '0deg')
    }
  }, [])

  // Default initial/static layout values
  const bgCol = p >= 0.7 ? '#03050a' : '#ffffff'

  return (
    <div
      ref={rootRef}
      className={`ach-stage ${embedded ? 'ach-stage--embedded' : ''}`}
      style={{ backgroundColor: bgCol }}
      onPointerMove={handleStagePointerMove}
      onPointerLeave={handleStagePointerLeave}
    >
      <div className="ach-container">
        {/* Main Title Group: drops from top to center, then glides upper above cards as they break */}
        <div className="ach-main-title-group" aria-label="Achievements">
          <span className="ach-main-eyebrow">Milestones · 03 Recognitions</span>
          <h2 className="ach-main-title">Achievements</h2>
        </div>

        {/* 3D Stage Container (Constant Height Throughout!) */}
        <div className="ach-3d-stage">
          {/* Soft Shadow Cut Dividers */}
          <div className="ach-cut-line ach-cut-line--1" aria-hidden="true" />
          <div className="ach-cut-line ach-cut-line--2" aria-hidden="true" />

          {/* Cards Row: forms into a box, then breaks into 3 separate 3D cards */}
          <div className="ach-cards-row">
            {achievements.map((item, idx) => {
              const isHovered = hoveredId === item.id

              return (
                <div
                  key={item.id}
                  tabIndex={0}
                  className={`ach-card-slot ach-card-slot--${idx} ${
                    isHovered ? 'is-active' : ''
                  }`}
                  aria-label={`${item.title} — ${item.category}`}
                  onPointerEnter={() => handleCardPointerEnter(item.id)}
                  onMouseEnter={() => handleCardPointerEnter(item.id)}
                  onPointerMove={handleCardPointerMove}
                  onMouseMove={handleCardPointerMove}
                  onPointerLeave={handleCardPointerLeave}
                  onMouseLeave={handleCardPointerLeave}
                >
                  <div className="ach-card-inner-3d">
                    {/* Front Face: Clean solid white card face with soft edge shadow */}
                    <div className="ach-card-face ach-card-face--front" aria-hidden="true" />

                    {/* Back Face: Monochrome Black & White milestone card */}
                    <div className="ach-card-face ach-card-face--back">
                      <div className="ach-back-top">
                        <span className="ach-back-index">{item.index}</span>
                        <span className="ach-back-metric">{item.metric}</span>
                      </div>

                      <div className="ach-back-category">{item.category}</div>
                      <h3 className="ach-back-title">{item.title}</h3>
                      <div className="ach-back-subtitle">{item.subtitle}</div>
                      <p className="ach-back-desc">{item.description}</p>

                      <div className="ach-back-tags">
                        {item.tags.map((tag) => (
                          <span key={tag} className="ach-back-tag">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Bottom Interactive Cue */}
                      <div className="ach-card-cue" aria-hidden="true">
                        <span className="ach-card-cue-dot" />
                        <span className="ach-card-cue-text">EXPLORE RECOGNITION</span>
                        <span className="ach-card-cue-arrow">&rsaquo;</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Achievements
