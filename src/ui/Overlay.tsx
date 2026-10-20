import { useEffect, useRef, useState, useMemo } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'

interface OverlayProps {
  sceneReady: boolean
  introActive: boolean
  introComplete: boolean
  activeWaypoint: number // -1 = none/transition, 0 = python, 1 = react, 2 = flutter
  onStartIntro: () => void
  onSkipIntro: () => void
  onResetView?: () => void
  reducedMotion: boolean
  isReturningVisitor: boolean
}

interface CaptionItem {
  step: string
  name: string
  tagline: string
}

const FEATURED_CAPTIONS: CaptionItem[] = [
  {
    step: '01 / 03',
    name: 'Python',
    tagline: 'AI & Deep Learning',
  },
  {
    step: '02 / 03',
    name: 'React',
    tagline: 'Full-Stack Web',
  },
  {
    step: '03 / 03',
    name: 'Flutter',
    tagline: 'Mobile Apps',
  },
]

/**
 * Overlay Component (HTML + GSAP)
 *
 * Modern, razor-sharp overlay.
 * Features:
 * - 0 -> 100 counter during asset loading
 * - Synchronized captions for Python, React, and Flutter (fade in/out via opacity + transform)
 * - Hero identity fade-in ("Devesh", "AI & Full-Stack Developer", Enter button)
 * - Temporary 6s navigation tip: "Drag to rotate • Scroll to zoom"
 * - Reset view button returning camera smoothly to wide view
 * - Skip intro button
 */
export function Overlay({
  sceneReady,
  introActive,
  introComplete,
  activeWaypoint,
  onStartIntro,
  onSkipIntro,
  onResetView,
  reducedMotion,
  isReturningVisitor,
}: OverlayProps) {
  const { progress, total } = useProgress()

  const [displayProgress, setDisplayProgress] = useState(0)
  const [loaderVisible, setLoaderVisible] = useState(true)
  const [showTip, setShowTip] = useState(true)

  const loaderRef = useRef<HTMLDivElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const heroFooterRef = useRef<HTMLDivElement>(null)
  const skipBtnRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  // Current featured logo caption
  const currentCaption = useMemo(() => {
    if (activeWaypoint < 0 || activeWaypoint >= FEATURED_CAPTIONS.length) return null
    return FEATURED_CAPTIONS[activeWaypoint]
  }, [activeWaypoint])

  // Animate counter from 0 to 100
  useEffect(() => {
    const target = isReturningVisitor || reducedMotion || total === 0 ? 100 : Math.round(progress)
    const counterObj = { val: displayProgress }

    const tween = gsap.to(counterObj, {
      val: target,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayProgress(Math.floor(counterObj.val))
      },
    })

    return () => {
      tween.kill()
    }
  }, [progress, total, isReturningVisitor, reducedMotion])

  // When loading finishes, dismiss loader and trigger camera descent
  useEffect(() => {
    if (displayProgress >= 100 && (sceneReady || total === 0)) {
      const timer = setTimeout(() => {
        if (loaderRef.current) {
          gsap.to(loaderRef.current, {
            opacity: 0,
            duration: 0.7,
            ease: 'power2.inOut',
            onComplete: () => {
              setLoaderVisible(false)
              onStartIntro()
            },
          })
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [displayProgress, sceneReady, total, onStartIntro])

  // Synchronized caption transition (transform and opacity only)
  useEffect(() => {
    if (introActive && currentCaption && captionRef.current) {
      gsap.fromTo(
        captionRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }
      )
    } else if (captionRef.current && !currentCaption) {
      gsap.to(captionRef.current, {
        opacity: 0,
        y: -12,
        duration: 0.4,
        ease: 'power2.in',
      })
    }
  }, [activeWaypoint, currentCaption, introActive])

  // Fade out caption on intro complete
  useEffect(() => {
    if (introComplete && captionRef.current) {
      gsap.to(captionRef.current, {
        opacity: 0,
        y: -12,
        duration: 0.4,
        ease: 'power2.in',
      })
    }
  }, [introComplete])

  // Hero footer fade in on intro complete
  useEffect(() => {
    if (introComplete && heroFooterRef.current) {
      gsap.fromTo(
        heroFooterRef.current.children,
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          stagger: 0.12,
          ease: 'power3.out',
        }
      )
    }
  }, [introComplete])

  // Tip "Drag to rotate • Scroll to zoom" that fades after 6 seconds
  useEffect(() => {
    if (introComplete) {
      const timer = setTimeout(() => {
        if (tipRef.current) {
          gsap.to(tipRef.current, {
            opacity: 0,
            y: 8,
            duration: 0.9,
            ease: 'power2.out',
            onComplete: () => setShowTip(false),
          })
        }
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [introComplete])

  // Only show dev shortcut pills if URL contains ?dev=1
  const isDevMode = typeof window !== 'undefined' && window.location.search.includes('dev=1')

  return (
    <>
      {/* 1. Loading Overlay */}
      {loaderVisible && (
        <div ref={loaderRef} className="loader-screen">
          <div className="loader-content">
            <span className="loader-title">INITIALIZING 3D WORKSPACE</span>
            <span className="loader-counter">{displayProgress}%</span>
            <div className="loader-bar-bg">
              <div
                ref={progressBarRef}
                className="loader-bar-fill"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Crisp Overlay Container */}
      <div className="ui-overlay">
        {/* Top Header Bar */}
        <header className="overlay-top">
          <div className="brand-badge">
            <span className="name-tag">DEVESH</span>
            <span className="spec-tag">B.TECH AI & DATA SCIENCE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Dev Tools Hint (only with ?dev=1) */}
            {isDevMode && (
              <div className="controls-hint">
                <span className="shortcut-pill" title="Toggle Leva Live Camera Tuning Panel">
                  Press [L] for Rig Tools
                </span>
                <span className="shortcut-pill" title="Log current camera position and target">
                  Press [W] to Log
                </span>
              </div>
            )}

            {/* Skip Intro Button */}
            {introActive && !introComplete && (
              <button
                ref={skipBtnRef}
                className="skip-btn"
                onClick={onSkipIntro}
                aria-label="Skip cinematic flythrough"
              >
                Skip Intro ➔
              </button>
            )}
          </div>
        </header>

        {/* Center Flythrough Captions */}
        <main
          ref={captionRef}
          className="caption-container"
          style={{
            opacity: introActive && !introComplete && currentCaption ? 1 : 0,
          }}
        >
          {currentCaption && (
            <>
              <span className="caption-step">{currentCaption.step}</span>
              <h2 className="caption-title">{currentCaption.name}</h2>
              <p className="caption-desc">{currentCaption.tagline}</p>
            </>
          )}
        </main>

        {/* Bottom Hero Footer */}
        <footer
          ref={heroFooterRef}
          className="hero-footer"
          style={{ opacity: introComplete ? 1 : 0 }}
        >
          <div className="hero-info">
            <h1 className="hero-name">Devesh</h1>
            <p className="hero-tagline">AI & Full-Stack Developer</p>
            <p className="hero-details">
              B.Tech Artificial Intelligence & Data Science • Deep Learning & Full-Stack Systems
            </p>
          </div>

          <div className="hero-actions">
            {showTip && (
              <div ref={tipRef} className="orbit-tip">
                <span>Drag to rotate • Scroll to zoom</span>
              </div>
            )}

            {introComplete && onResetView && (
              <button
                className="reset-btn"
                onClick={onResetView}
                title="Reset view back to wide angle shot"
              >
                Reset view ↺
              </button>
            )}

            <button
              className="enter-btn"
              onClick={() => {
                console.log('[Portfolio] Enter button clicked (Page 2 placeholder)')
              }}
              title="Enter portfolio (Page 2 placeholder)"
            >
              Enter <span className="enter-arrow">➔</span>
            </button>
          </div>
        </footer>
      </div>
    </>
  )
}
