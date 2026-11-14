import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { PageShell } from '../ui/PageShell'
import { hackathons, type HackathonEntry, type HackathonQuadrant } from '../config/hackathons'
import './Hackathons.css'

export interface HackathonsProps {
  embedded?: boolean
  active?: boolean
  stageMode?: boolean
  instantComplete?: boolean
  forceOverview?: boolean
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * Computes scroll-driven geometric reveal & reverse collapse variables synchronously on DOM nodes
 * so PixelStage scrubs at 60fps without triggering React re-renders per frame.
 *
 * entryProgress: 0 -> 1 (Skills white -> black line drops -> center circle -> 4-way crosshairs -> titles)
 * exitProgress:  0 -> 1 (Reverse: titles fade -> crosshairs retract -> circle closes -> line exits downward into About white)
 */
export function applyHackathonTransitionVars(
  containerEl: HTMLElement | null,
  entryProgress: number,
  exitProgress: number
): void {
  if (!containerEl) return
  const E = clamp01(entryProgress)
  const X = clamp01(exitProgress)

  let bgAlpha = 1
  let circleScale = 1
  let circleOpacity = 1
  let circleFill = 1
  let circleBorderAlpha = 1
  let horizP = 0
  let horizRetract = 0
  let horizOpacity = 0
  let arcP = 1
  let arcOpacity = 0
  let crossSpread = 1
  let uiOpacity = 1
  let uiLiftPx = 0
  let lineOpacity = 0
  let lineTopPct = 0
  let lineHeightPct = 0
  let lineDir = 'entry'
  let lineLightBlend = 0

  if (X > 0.001) {
    // Phase Exit (Exact mirror reverse of full-radius Entry formation):
    // 1. UI fades out & crosshairs center (X = 0.00..0.18), 4 rays retract (X = 0.14..0.38), DS fills out (X = 0.22..0.38)
    // 2. Circle border opens into two semicircular arcs retracting back toward +-R rim tips (X = 0.34..0.56)
    // 3. Horizontal arms shoot inward from +-R to (50,50), then collapse into center point (X = 0.50..0.70)
    // 4. Vertical seam descends from center (50%) off bottom edge (104%) revealing About (X = 0.68..0.99)
    const centerForce = smoothstep(0.0, 0.16, X)
    uiOpacity = 1 - smoothstep(0.0, 0.18, X)
    uiLiftPx = smoothstep(0.0, 0.18, X) * 8
    crossSpread = 1 - smoothstep(0.14, 0.38, X)
    circleFill = 1 - smoothstep(0.22, 0.38, X)

    circleScale = 1
    circleBorderAlpha = 1 - smoothstep(0.32, 0.37, X)
    circleOpacity = 1 - smoothstep(0.69, 0.72, X)

    arcP = 1 - smoothstep(0.36, 0.56, X)
    arcOpacity = X <= 0.32 ? 0 : smoothstep(0.32, 0.36, X) * (arcP > 0.002 ? 1 : 0)

    const horizGrowIn = smoothstep(0.50, 0.60, X)
    const horizCollapse = smoothstep(0.60, 0.70, X)
    horizP = 1 - horizCollapse
    horizRetract = 1 - horizGrowIn
    horizOpacity = X >= 0.50 && X <= 0.71 && horizGrowIn > 0.002 && horizCollapse < 0.998 ? 1 : 0

    // Exit line descends from center (50%) down off bottom edge (104%) and disappears
    if (X >= 0.68 && X <= 0.99) {
      const tHead = smoothstep(0.68, 0.89, X)
      const tTail = smoothstep(0.79, 0.98, X)
      const head = 50 + tHead * 54
      const tail = 50 + tTail * 54
      lineTopPct = tail
      lineHeightPct = Math.max(0, head - tail)
      lineOpacity = lineHeightPct > 0.2 ? 1 : 0
      lineDir = 'exit'
    } else {
      lineOpacity = 0
      lineHeightPct = 0
    }

    bgAlpha = 1
    lineLightBlend = 0
    containerEl.style.setProperty('--hack-force-center', centerForce > 0.01 ? '1' : '0')
  } else {
    // Phase Entry (Full-radius circle formation without tiny-circle scaling):
    // 1. White vertical line from top meets center (E = 0.24..0.42 in Skills)
    // 2. From center point, line spreads horizontally left & right to full circle radius +-R (E = 0.43..0.54)
    // 3. Two curved arcs sweep from +-R around upper/lower perimeter and connect into full circle (E = 0.54..0.72)
    // 4. Center ring fills, 4 crosshair rays shoot outward (E = 0.74..0.90), quadrants reveal (E = 0.86..1.00)
    bgAlpha = smoothstep(0.32, 0.42, E)
    lineOpacity = 0
    lineHeightPct = 0
    lineDir = 'entry'

    circleScale = 1
    circleOpacity = E >= 0.99 ? 1 : smoothstep(0.42, 0.44, E)
    horizP = E >= 0.99 ? 0 : smoothstep(0.43, 0.54, E)
    horizRetract = E >= 0.99 ? 0 : smoothstep(0.54, 0.65, E)
    horizOpacity = E >= 0.99 || horizP <= 0.002 || horizRetract >= 0.998 ? 0 : 1
    arcP = smoothstep(0.54, 0.72, E)
    arcOpacity = E >= 0.99 || arcP <= 0.002 ? 0 : 1 - smoothstep(0.73, 0.79, E)
    circleBorderAlpha = smoothstep(0.69, 0.76, E)
    circleFill = smoothstep(0.69, 0.82, E)
    crossSpread = smoothstep(0.74, 0.90, E)
    uiOpacity = smoothstep(0.86, 1.0, E)
    uiLiftPx = (1 - uiOpacity) * 12
    containerEl.style.setProperty('--hack-force-center', '0')
  }

  const horizOffset = horizRetract > 0.001 ? -100 * horizRetract : 100 * (1 - horizP)
  const arcOffset = 100 * (1 - arcP)

  containerEl.style.setProperty('--hack-bg-alpha', bgAlpha.toFixed(4))
  containerEl.style.setProperty('--hack-circle-scale', circleScale.toFixed(4))
  containerEl.style.setProperty('--hack-circle-opacity', circleOpacity.toFixed(4))
  containerEl.style.setProperty('--hack-circle-fill', circleFill.toFixed(4))
  containerEl.style.setProperty('--hack-ring-border-alpha', circleBorderAlpha.toFixed(4))
  containerEl.style.setProperty('--hack-horiz-offset', horizOffset.toFixed(2))
  containerEl.style.setProperty('--hack-horiz-opacity', horizOpacity.toFixed(4))
  containerEl.style.setProperty('--hack-arc-offset', arcOffset.toFixed(2))
  containerEl.style.setProperty('--hack-arc-opacity', arcOpacity.toFixed(4))
  containerEl.style.setProperty('--hack-cross-spread', crossSpread.toFixed(4))
  containerEl.style.setProperty('--hack-ui-opacity', uiOpacity.toFixed(4))
  containerEl.style.setProperty('--hack-ui-lift', `${uiLiftPx.toFixed(2)}px`)
  containerEl.style.setProperty('--hack-seam-opacity', lineOpacity.toFixed(4))
  containerEl.style.setProperty('--hack-seam-top', `${lineTopPct.toFixed(2)}%`)
  containerEl.style.setProperty('--hack-seam-height', `${lineHeightPct.toFixed(2)}%`)
  containerEl.style.setProperty('--hack-seam-light-blend', lineLightBlend.toFixed(4))
  containerEl.setAttribute('data-seam-phase', lineDir)
}

function getIntersectionCoords(activeQuadrant: HackathonQuadrant | null): { cx: string; cy: string } {
  switch (activeQuadrant) {
    case 'top-left':
      return { cx: '66%', cy: '66%' }
    case 'top-right':
      return { cx: '34%', cy: '66%' }
    case 'bottom-left':
      return { cx: '66%', cy: '34%' }
    case 'bottom-right':
      return { cx: '34%', cy: '34%' }
    default:
      return { cx: '50%', cy: '50%' }
  }
}

export function Hackathons({
  embedded = false,
  active = true,
  stageMode = false,
  instantComplete = false,
  forceOverview = false,
}: HackathonsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [lockedId, setLockedId] = useState<string | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const suppressHoverUntilRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(hover: none), (pointer: coarse)')
    const sync = () => setIsTouchDevice(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Reset active selection when leaving Hackathons stage or when overview is forced during exit transition
  useEffect(() => {
    if (!active || forceOverview) {
      setHoveredId(null)
      setLockedId(null)
    }
  }, [active, forceOverview])

  // Ensure initial static vars are applied when rendered outside PixelStage (e.g. mobile/reduced-motion fallback or standalone route)
  useEffect(() => {
    if (!stageMode || instantComplete) {
      applyHackathonTransitionVars(rootRef.current, 1, 0)
    }
  }, [stageMode, instantComplete])

  const effectiveId = !active || forceOverview ? null : (lockedId ?? hoveredId)
  const effectiveEntry = hackathons.find((h) => h.id === effectiveId) ?? null
  const activeQuadrant: HackathonQuadrant | null = effectiveEntry?.quadrant ?? null
  const { cx, cy } = getIntersectionCoords(activeQuadrant)

  const resetToOverview = useCallback(() => {
    // Suppress passive mouseenter briefly while intersection crosshairs glide back to 50%/50%
    suppressHoverUntilRef.current = performance.now() + 650
    setLockedId(null)
    setHoveredId(null)
  }, [])

  const handleToggleLock = useCallback(
    (id: string) => {
      if (lockedId === id) {
        resetToOverview()
        return
      }
      setLockedId(id)
    },
    [lockedId, resetToOverview]
  )

  const handleNavigationKey = useCallback(
    (key: string): boolean => {
      if (key === 'Escape') {
        resetToOverview()
        return true
      }
      const order = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const
      const currentIndex = effectiveEntry ? order.indexOf(effectiveEntry.quadrant) : -1

      let nextIndex: number | null = null
      if (key === 'ArrowRight') {
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % 4
      } else if (key === 'ArrowLeft') {
        nextIndex = currentIndex === -1 ? 3 : (currentIndex + 3) % 4
      } else if (key === 'ArrowDown') {
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 2) % 4
      } else if (key === 'ArrowUp') {
        nextIndex = currentIndex === -1 ? 2 : (currentIndex + 2) % 4
      } else if (key >= '1' && key <= '4') {
        nextIndex = Number(key) - 1
      }

      if (nextIndex !== null) {
        const targetQuad = order[nextIndex]
        const targetEntry = hackathons.find((h) => h.quadrant === targetQuad)
        if (targetEntry) {
          setLockedId(targetEntry.id)
          return true
        }
      }
      return false
    },
    [effectiveEntry, resetToOverview]
  )

  // Global keyboard shortcuts scoped strictly to when #hackathons is the active screen
  useEffect(() => {
    if (!active || forceOverview || typeof window === 'undefined') return
    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      if (rootRef.current && target && rootRef.current.contains(target)) {
        return
      }
      if (handleNavigationKey(e.key)) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onWindowKeyDown)
    return () => window.removeEventListener('keydown', onWindowKeyDown)
  }, [active, forceOverview, handleNavigationKey])

  const handleStageKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (handleNavigationKey(e.key)) {
      e.preventDefault()
    }
  }

  const content = (
    <div
      ref={rootRef}
      className={`hack-stage ${embedded ? 'hack-stage--embedded' : ''} ${
        activeQuadrant ? 'has-active' : ''
      }`}
      data-active-quadrant={activeQuadrant ?? 'none'}
      style={
        {
          ['--cx' as string]: cx,
          ['--cy' as string]: cy,
        } as React.CSSProperties
      }
      onMouseLeave={() => {
        if (!isTouchDevice) setHoveredId(null)
      }}
      onKeyDown={handleStageKeyDown}
    >
      {/* Solid dark #050509 veil controlled smoothly by scroll transition */}
      <div className="hack-backdrop" aria-hidden="true" />

      {/* Vertical entry/exit seam line (drop from top -> center circle; reverse center -> bottom) */}
      <div className="hack-seam-line" aria-hidden="true" />

      {/* Header metadata bar subtle top tag (below fixed site-header height) */}
      <div className="hack-top-caption">
        <h2 className="hack-top-caption-title">HACKATHON ARCHIVE</h2>
      </div>

      {/* 4 Connected Quadrants */}
      <div className="hack-quads-layer" role="region" aria-label="Hackathon experience in four quadrants">
        {hackathons.map((item: HackathonEntry) => {
          const isExpanded = effectiveEntry?.id === item.id
          const isLocked = lockedId === item.id
          const isMuted = effectiveEntry !== null && !isExpanded

          return (
            <button
              key={item.id}
              type="button"
              className={`hack-quad hack-quad--${item.quadrant} ${
                isExpanded ? 'is-expanded' : ''
              } ${isMuted ? 'is-muted' : ''}`}
              aria-expanded={isExpanded}
              onMouseEnter={() => {
                if (active && !forceOverview && !isTouchDevice && performance.now() >= suppressHoverUntilRef.current) {
                  setHoveredId(item.id)
                }
              }}
              onClick={() => handleToggleLock(item.id)}
            >
              <div className="hack-quad-glow" aria-hidden="true" />

              <div className="hack-quad-inner">
                <div className="hack-quad-meta-top">
                  <span className="hack-quad-index">{item.index}</span>
                  <span className="hack-quad-badge">{item.shortBadge}</span>
                </div>

                <h3 className="hack-quad-title">{item.title}</h3>

                <div className="hack-quad-cue" aria-hidden="true">
                  <span className="hack-quad-cue-arrow">&rsaquo;</span>
                  <span>
                    {isLocked
                      ? 'PINNED · CLICK TO RESET'
                      : isExpanded
                        ? 'ACTIVE · CLICK TO PIN'
                        : 'CLICK TO EXPLORE'}
                  </span>
                </div>

                <div className="hack-quad-details">
                  <div className="hack-quad-divider" aria-hidden="true" />
                  <p className="hack-quad-status">{item.statusTag}</p>
                  <p className="hack-quad-headline">{item.headline}</p>

                  <div className="hack-quad-paragraphs">
                    {item.paragraphs.map((p, idx) => (
                      <p key={idx} className="hack-quad-paragraph">
                        {p}
                      </p>
                    ))}
                  </div>

                  <div className="hack-quad-specs">
                    {item.meta.map((m) => (
                      <div
                        key={m.label}
                        className={`hack-spec-pill ${m.highlight ? 'is-accent' : ''}`}
                      >
                        <span className="hack-spec-label">{m.label}</span>
                        <span className="hack-spec-value">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 4 Hairline Dividing Rays Extending Outward From the Central Circle */}
      <div className="hack-crosshair-layer" aria-hidden="true">
        <span className="hack-ray hack-ray--left" />
        <span className="hack-ray hack-ray--right" />
        <span className="hack-ray hack-ray--top" />
        <span className="hack-ray hack-ray--bottom" />
      </div>

      {/* Central Intersection Circle Hub + Corner Reticle Brackets */}
      <button
        type="button"
        className="hack-center-hub"
        aria-label={effectiveEntry ? 'Reset quadrant view to center overview' : 'Hackathons central emblem'}
        onMouseEnter={() => {
          if (!isTouchDevice && !lockedId) setHoveredId(null)
        }}
        onClick={resetToOverview}
      >
        {/* Subtle technical corner brackets just outside center ring */}
        <span className="hack-bracket hack-bracket--tl" aria-hidden="true" />
        <span className="hack-bracket hack-bracket--tr" aria-hidden="true" />
        <span className="hack-bracket hack-bracket--bl" aria-hidden="true" />
        <span className="hack-bracket hack-bracket--br" aria-hidden="true" />

        {/* Delicate segmented outer orbital arc */}
        <svg className="hack-hub-orbit" viewBox="0 0 120 120" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="48 140 48 140"
            strokeLinecap="round"
          />
        </svg>

        <span className="hack-hub-ring">
          {/* Geometric formation overlay: horizontal left/right split from center -> two arcs connect into circle */}
          <svg className="hack-hub-formation-svg" viewBox="0 0 100 100" aria-hidden="true">
            <path
              className="hack-hub-horiz-line"
              d="M 50 50 L 1 50"
              pathLength={100}
            />
            <path
              className="hack-hub-horiz-line"
              d="M 50 50 L 99 50"
              pathLength={100}
            />
            <path
              className="hack-hub-arc-line"
              d="M 1 50 A 49 49 0 0 1 99 50"
              pathLength={100}
            />
            <path
              className="hack-hub-arc-line"
              d="M 99 50 A 49 49 0 0 1 1 50"
              pathLength={100}
            />
          </svg>
          <span className="hack-hub-content">
            <span className="hack-hub-dot" aria-hidden="true" />
            <span className="hack-hub-code">DS</span>
            <span className="hack-hub-sub">
              {effectiveEntry ? effectiveEntry.index : '04'}
            </span>
          </span>
        </span>
      </button>

      {/* Subtle Scroll / Explore Indicator */}
      <div className="hack-scroll-indicator" aria-hidden="true">
        <span className="hack-scroll-text">SCROLL TO EXPLORE</span>
        <span className="hack-scroll-arrow">&#8595;</span>
      </div>
    </div>
  )

  if (embedded) {
    return content
  }

  return <PageShell title="Hackathons - Devesh">{content}</PageShell>
}

export default Hackathons

