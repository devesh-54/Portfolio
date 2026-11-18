import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './CinematicTransition.css'

/**
 * Event names used to coordinate the 3D WebGL camera timeline and HTML/CSS overlays.
 */
export const CINEMATIC_EVENTS = {
  TRIGGER: 'portfolio:dive-to-projects',
  SHATTER: 'portfolio:shatter-glass',
  FLASH: 'portfolio:blinding-flash',
  SWAP: 'portfolio:swap-page',
} as const

/**
 * Helper to dispatch the transition from any button or component.
 */
export function triggerCinematicTransition() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CINEMATIC_EVENTS.TRIGGER))
  }
}

/**
 * Cinematic Glass Shatter & Blinding White-Out Transition Component
 *
 * Manages:
 * 1. .is-transitioning class on document.body
 * 2. .glass-crack-overlay with high-contrast SVG spiderweb glass fracture & @keyframes shatter-jitter
 * 3. .blinding-flash (#ffffff with heavy bloom box-shadow)
 * 4. Seamless router navigation to /projects at peak white
 * 5. Smooth fade-out reveal upon arrival
 */
export function CinematicTransitionOverlay() {
  const navigate = useNavigate()
  const location = useLocation()

  const [isShattering, setIsShattering] = useState(false)
  const [flashState, setFlashState] = useState<'idle' | 'active' | 'fading'>('idle')
  const isTransitioningRef = useRef(false)
  const timersRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
  }, [])

  // Start transition flow
  const handleTrigger = useCallback(() => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true

    // Add state class to document body
    document.body.classList.add('is-transitioning')

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion) {
      // Reduced motion: skip violent camera dive/jitter, simple smooth white fade
      setFlashState('active')
      const t1 = window.setTimeout(() => {
        navigate('/projects')
        setFlashState('fading')
        const t2 = window.setTimeout(() => {
          setFlashState('idle')
          document.body.classList.remove('is-transitioning')
          isTransitioningRef.current = false
        }, 500)
        timersRef.current.push(t2)
      }, 400)
      timersRef.current.push(t1)
      return
    }

    // Schedule fallback triggers in case WebGL loop is paused or delayed
    // Shatter starts at ~0.45s as camera approaches monitor
    const tShatter = window.setTimeout(() => {
      setIsShattering(true)
    }, 450)
    timersRef.current.push(tShatter)

    // Blinding white flash at ~0.90s right as camera penetrates monitor glass
    const tFlash = window.setTimeout(() => {
      setFlashState('active')
    }, 900)
    timersRef.current.push(tFlash)

    // Page swap at ~1.30s peak whiteout
    const tSwap = window.setTimeout(() => {
      navigate('/projects')
      // Once on /projects, smoothly fade out the blinding flash
      const tFade = window.setTimeout(() => {
        setIsShattering(false)
        setFlashState('fading')
        const tEnd = window.setTimeout(() => {
          setFlashState('idle')
          document.body.classList.remove('is-transitioning')
          isTransitioningRef.current = false
        }, 550)
        timersRef.current.push(tEnd)
      }, 100)
      timersRef.current.push(tFade)
    }, 1300)
    timersRef.current.push(tSwap)
  }, [navigate])

  // WebGL camera timeline event synchronization
  useEffect(() => {
    const onTrigger = () => handleTrigger()
    const onShatter = () => setIsShattering(true)
    const onFlash = () => setFlashState('active')
    const onSwap = () => {
      navigate('/projects')
      const tFade = window.setTimeout(() => {
        setIsShattering(false)
        setFlashState('fading')
        const tEnd = window.setTimeout(() => {
          setFlashState('idle')
          document.body.classList.remove('is-transitioning')
          isTransitioningRef.current = false
        }, 550)
        timersRef.current.push(tEnd)
      }, 100)
      timersRef.current.push(tFade)
    }

    window.addEventListener(CINEMATIC_EVENTS.TRIGGER, onTrigger)
    window.addEventListener(CINEMATIC_EVENTS.SHATTER, onShatter)
    window.addEventListener(CINEMATIC_EVENTS.FLASH, onFlash)
    window.addEventListener(CINEMATIC_EVENTS.SWAP, onSwap)

    // Global click delegate for #nav-projects or project card clicks
    const onDocClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.(
        '#nav-projects, .nav-projects, [data-nav="projects"]'
      )
      if (target && location.pathname === '/') {
        e.preventDefault()
        e.stopPropagation()
        handleTrigger()
      }
    }
    document.addEventListener('click', onDocClick, { capture: true })

    // Register global trigger for console / tests
    ;(window as any).__triggerCinematicTransition = handleTrigger

    return () => {
      window.removeEventListener(CINEMATIC_EVENTS.TRIGGER, onTrigger)
      window.removeEventListener(CINEMATIC_EVENTS.SHATTER, onShatter)
      window.removeEventListener(CINEMATIC_EVENTS.FLASH, onFlash)
      window.removeEventListener(CINEMATIC_EVENTS.SWAP, onSwap)
      document.removeEventListener('click', onDocClick, { capture: true })
      clearTimers()
      delete (window as any).__triggerCinematicTransition
    }
  }, [handleTrigger, location.pathname, navigate, clearTimers])

  return (
    <>
      {/* 1. Procedural SVG Glass Fracture Overlay */}
      <div
        className={`glass-crack-overlay ${
          isShattering ? 'glass-crack-overlay--active' : ''
        }`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1920 1080"
          className="glass-crack-svg"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Specular glass fissure glow */}
            <filter id="crack-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Crystalline Glass Shards (Faceted highlights) */}
          <polygon
            points="730,480 770,465 795,505 760,535 725,515"
            className="crack-shard-cyan"
          />
          <polygon
            points="700,455 730,440 735,475 705,485"
            className="crack-shard"
          />
          <polygon
            points="765,510 805,490 825,530 780,555"
            className="crack-shard"
          />
          <polygon
            points="680,500 710,515 695,550 665,530"
            className="crack-shard-cyan"
          />
          <polygon
            points="635,460 670,410 705,435 675,485"
            className="crack-shard"
          />
          <polygon
            points="775,435 830,410 855,455 810,480"
            className="crack-shard-cyan"
          />
          <polygon
            points="785,555 845,585 820,635 765,605"
            className="crack-shard"
          />
          <polygon
            points="670,555 720,595 685,645 640,605"
            className="crack-shard-cyan"
          />

          {/* Concentric Spiderweb Fracture Rings */}
          {/* Ring 1 (Inner core impact ring) */}
          <path
            d="M 685,475 L 730,445 L 785,455 L 815,495 L 805,545 L 755,575 L 705,560 L 670,520 Z"
            className="crack-ring"
          />
          {/* Ring 2 */}
          <path
            d="M 625,440 L 710,380 L 815,395 L 880,470 L 865,585 L 780,640 L 670,620 L 595,535 Z"
            className="crack-ring"
          />
          {/* Ring 3 */}
          <path
            d="M 535,395 L 675,285 L 845,305 L 965,435 L 945,645 L 815,735 L 620,705 L 500,565 Z"
            className="crack-ring"
          />
          {/* Ring 4 */}
          <path
            d="M 410,330 L 625,175 L 895,195 L 1095,380 L 1065,720 L 870,850 L 545,815 L 365,605 Z"
            className="crack-ring"
          />
          {/* Ring 5 */}
          <path
            d="M 245,235 L 565,55 L 965,85 L 1270,305 L 1230,820 L 950,975 L 435,935 L 185,655 Z"
            className="crack-ring"
          />
          {/* Ring 6 (Outer screen boundary fissures) */}
          <path
            d="M 0,110 L 485,0 L 1055,0 L 1485,195 L 1465,960 L 1045,1080 L 310,1080 L 0,725 Z"
            className="crack-ring"
            style={{ opacity: 0.6 }}
          />

          {/* Primary Radial Jagged Fracture Veins */}
          {/* Top-Left */}
          <path
            d="M 720,480 L 670,425 L 590,360 L 505,275 L 390,190 L 245,100 L 95,35 L 0,0"
            className="crack-vein-primary"
          />
          {/* Top-Mid-Left */}
          <path
            d="M 730,460 L 715,395 L 695,305 L 680,200 L 665,90 L 655,0"
            className="crack-vein-primary"
          />
          {/* Top-Center */}
          <path
            d="M 745,460 L 765,385 L 790,280 L 818,175 L 845,75 L 860,0"
            className="crack-vein-primary"
          />
          {/* Top-Mid-Right */}
          <path
            d="M 760,475 L 815,415 L 890,330 L 985,235 L 1105,140 L 1245,50 L 1315,0"
            className="crack-vein-primary"
          />
          {/* Top-Right */}
          <path
            d="M 770,490 L 845,455 L 955,400 L 1105,335 L 1300,250 L 1545,150 L 1920,0"
            className="crack-vein-primary"
          />
          {/* Right-Top */}
          <path
            d="M 775,505 L 865,495 L 985,485 L 1145,470 L 1355,440 L 1615,410 L 1920,380"
            className="crack-vein-primary"
          />
          {/* Right-Center */}
          <path
            d="M 775,520 L 875,530 L 1015,545 L 1205,560 L 1445,580 L 1705,600 L 1920,620"
            className="crack-vein-primary"
          />
          {/* Right-Bottom */}
          <path
            d="M 765,535 L 850,575 L 970,635 L 1130,710 L 1340,805 L 1595,920 L 1920,1080"
            className="crack-vein-primary"
          />
          {/* Bottom-Right */}
          <path
            d="M 750,545 L 805,615 L 880,710 L 965,825 L 1060,950 L 1145,1080"
            className="crack-vein-primary"
          />
          {/* Bottom-Center */}
          <path
            d="M 735,550 L 745,635 L 755,750 L 765,875 L 775,990 L 780,1080"
            className="crack-vein-primary"
          />
          {/* Bottom-Mid-Left */}
          <path
            d="M 720,545 L 685,625 L 635,730 L 580,845 L 515,970 L 465,1080"
            className="crack-vein-primary"
          />
          {/* Bottom-Left */}
          <path
            d="M 705,535 L 645,595 L 560,675 L 455,770 L 330,875 L 185,990 L 0,1080"
            className="crack-vein-primary"
          />
          {/* Left-Bottom */}
          <path
            d="M 695,520 L 610,535 L 495,550 L 360,575 L 205,605 L 0,635"
            className="crack-vein-primary"
          />
          {/* Left-Center */}
          <path
            d="M 690,505 L 585,495 L 460,485 L 315,470 L 160,455 L 0,440"
            className="crack-vein-primary"
          />
          {/* Left-Top */}
          <path
            d="M 700,490 L 610,445 L 505,385 L 380,315 L 235,230 L 0,115"
            className="crack-vein-primary"
          />

          {/* Secondary Cyan Glowing Branch Fissures */}
          <path
            d="M 590,360 L 540,300 L 465,260 L 380,245 L 260,205 L 140,185 L 0,165"
            className="crack-vein-secondary"
          />
          <path
            d="M 790,280 L 860,240 L 920,180 L 990,110 L 1050,45 L 1090,0"
            className="crack-vein-secondary"
          />
          <path
            d="M 955,400 L 1045,365 L 1160,335 L 1290,285 L 1450,225 L 1680,165 L 1920,120"
            className="crack-vein-secondary"
          />
          <path
            d="M 970,635 L 1070,680 L 1195,735 L 1345,795 L 1530,875 L 1760,965 L 1920,1030"
            className="crack-vein-secondary"
          />
          <path
            d="M 635,730 L 575,790 L 500,865 L 410,950 L 305,1030 L 250,1080"
            className="crack-vein-secondary"
          />
          <path
            d="M 495,550 L 415,615 L 330,680 L 230,765 L 120,845 L 0,910"
            className="crack-vein-secondary"
          />
          <path
            d="M 460,485 L 390,415 L 315,355 L 225,295 L 110,230 L 0,195"
            className="crack-vein-secondary"
          />

          {/* Tertiary Hairline Web Filaments */}
          <path
            d="M 710,430 L 740,390 L 780,360 L 830,340 M 805,490 L 865,510 L 935,530 M 745,580 L 760,630 L 780,690 M 685,565 L 640,600 L 580,640 M 645,520 L 585,510 L 515,500 M 660,470 L 610,440 L 550,410"
            className="crack-vein-tertiary"
          />

          {/* Central Impact Crater Core */}
          <circle cx="740" cy="505" r="14" className="crack-impact-core" />
          <circle
            cx="740"
            cy="505"
            r="38"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeDasharray="8 4 2 4"
          />
        </svg>
      </div>

      {/* 2. Blinding White Flash Layer */}
      <div
        className={`blinding-flash ${
          flashState === 'active'
            ? 'blinding-flash--active'
            : flashState === 'fading'
            ? 'blinding-flash--fading'
            : ''
        }`}
        aria-hidden="true"
      />
    </>
  )
}

export default CinematicTransitionOverlay
