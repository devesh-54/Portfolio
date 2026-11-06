import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { invalidate } from '@react-three/fiber'

import WelcomeApp from '../scenes/Welcome/App.jsx'
import { Header } from '../scenes/Welcome/Header'
import { Credits } from '../scenes/Welcome/Credits'
import { About } from './About'
import { Skills } from './Skills'
import { Contact } from './Contact'
import ProjectDetail from '../ui/ProjectDetail'
import { PixelStage, STAGE_HOLD_PROGRESS } from '../sections/PixelStage'
import type { ProjectItem } from '../config/projects'

import { heroProgress } from '../scenes/Welcome/heroProgress'
import type { ExternalPose } from '../scenes/Welcome/ScreenDive'

import { FLIGHT_CONFIG } from '../scenes/Projects/flightConfig'

import '../scenes/Welcome/index.css'
import './Home.css'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

function DevDebugBox({
  isCanvasPaused,
  inHeroOverlayRef,
}: {
  isCanvasPaused: boolean
  inHeroOverlayRef: React.RefObject<HTMLDivElement | null>
}) {
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let animId: number
    const update = () => {
      if (boxRef.current) {
        const d = heroProgress.debug
        const overlayOp = inHeroOverlayRef.current ? inHeroOverlayRef.current.style.opacity : '0'

        boxRef.current.innerText = [
          `rawProgress: ${heroProgress.get().toFixed(4)}`,
          `smoothed p:   ${d.smoothedP.toFixed(4)}`,
          `flight p:     ${d.flightP.toFixed(4)}`,
          `active cards: ${d.activeCards} / 48`,
          `pose active:  ${d.externalPoseActive}`,
          `canvas vis:   ${isCanvasPaused ? 'hidden' : 'visible'}`,
          `frameloop:    ${isCanvasPaused ? 'never' : 'always'}`,
          `overlay op:   ${overlayOp}`,
          `camera pos:   [${d.cameraPos.join(', ')}]`,
        ].join('\n')
      }
      animId = requestAnimationFrame(update)
    }
    animId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animId)
  }, [isCanvasPaused, inHeroOverlayRef])

  return (
    <div
      ref={boxRef}
      id="dev-debug-box"
      style={{
        position: 'fixed',
        top: 64,
        left: 12,
        zIndex: 99999,
        background: 'rgba(3, 5, 10, 0.92)',
        color: '#2fd0ff',
        border: '1px solid #2fd0ff',
        padding: '8px 12px',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: 1.4,
        pointerEvents: 'none',
        borderRadius: 4,
        whiteSpace: 'pre',
      }}
    />
  )
}

export function Home() {
  const isDev = typeof window !== 'undefined' && window.location.search.includes('dev=1')
  const [headerTheme, setHeaderTheme] = useState<'dark' | 'light'>('dark')
  const [isCanvasPaused, setIsCanvasPaused] = useState(false)
  const [introEnded, setIntroEnded] = useState(() => {
    if (typeof window === 'undefined') return false
    if (window.location.search.includes('p=')) return true
    const forceReplay =
      window.location.search.includes('replay=1') || window.location.search.includes('reset=1')
    if (forceReplay) return false
    const visited = sessionStorage.getItem('welcomeIntroPlayed') === 'true'
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hasHash = Boolean(window.location.hash)
    return visited || reducedMotion || hasHash
  })

  const lenisRef = useRef<Lenis | null>(null)
  const screenMeshRef = useRef<THREE.Mesh | null>(null)
  const externalPose = useRef<ExternalPose>({
    active: false,
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    e: 0,
  })

  const inHeroOverlayRef = useRef<HTMLDivElement | null>(null)
  const creditsRef = useRef<HTMLDivElement | null>(null)
  const scrollHintRef = useRef<HTMLDivElement | null>(null)
  const flightTitleRef = useRef<HTMLDivElement | null>(null)
  const flightHintRef = useRef<HTMLDivElement | null>(null)
  const projectLabelRef = useRef<HTMLDivElement | null>(null)
  const heroTriggerRef = useRef<ScrollTrigger | null>(null)
  const stageTriggerRef = useRef<ScrollTrigger | null>(null)

  // Fallback mode for mobile (<= 768px) and reduced-motion
  // Note: A vertical scan for portrait screens is a possible future improvement.
  const [isFallback, setIsFallback] = useState(() => {
    if (typeof window === 'undefined') return false
    const mobile = window.matchMedia('(max-width: 768px)').matches
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return mobile || motion
  })

  useEffect(() => {
    const mqlMobile = window.matchMedia('(max-width: 768px)')
    const mqlMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const checkFallback = () => {
      const next = mqlMobile.matches || mqlMotion.matches
      setIsFallback((prev) => {
        if (prev !== next) {
          ScrollTrigger.refresh()
          return next
        }
        return prev
      })
    }

    mqlMobile.addEventListener('change', checkFallback)
    mqlMotion.addEventListener('change', checkFallback)
    return () => {
      mqlMobile.removeEventListener('change', checkFallback)
      mqlMotion.removeEventListener('change', checkFallback)
    }
  }, [])

  // Project Detail modal state
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedCardRect, setSelectedCardRect] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const backBtnRef = useRef<HTMLButtonElement | null>(null)

  const handleSelectProject = useCallback(
    (
      project: ProjectItem,
      rect?: { left: number; top: number; width: number; height: number }
    ) => {
      setSelectedCardRect(rect || null)
      setActiveProject(project)
      setIsDetailOpen(true)
      if (lenisRef.current) {
        lenisRef.current.stop()
      }
    },
    []
  )

  const handleCloseProject = useCallback(() => {
    setIsDetailOpen(false)
    setActiveProject(null)
    setSelectedCardRect(null)
    if (lenisRef.current) {
      lenisRef.current.start()
    }
  }, [])

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Wake up Canvas on unpause
  useEffect(() => {
    if (!isCanvasPaused) {
      invalidate()
    }
  }, [isCanvasPaused])

  // Handle intro finish to unlock scrolling
  const handleIntroEnd = useCallback(() => {
    setIntroEnded(true)
    sessionStorage.setItem('welcomeIntroPlayed', 'true')
    if (lenisRef.current) {
      lenisRef.current.start()
    }
  }, [])

  // Manual scroll restoration on mount & verification helper
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    const hash = window.location.hash
    if (!hash) {
      window.scrollTo(0, 0)
    }
    ;(window as any).__setHeroProgress = (pHero: number) => {
      heroProgress.set(pHero)
      if (heroTriggerRef.current) {
        const start = heroTriggerRef.current.start
        const end = heroTriggerRef.current.end
        const targetScroll = start + pHero * (end - start)
        window.scrollTo(0, targetScroll)
        if (lenisRef.current) {
          lenisRef.current.scrollTo(targetScroll, { immediate: true })
        }
      }
      invalidate()
    }
    ;(window as any).__setFlightProgress = (flightP: number) => {
      const handover = FLIGHT_CONFIG.HANDOVER_P
      const pHero = handover + flightP * (1 - handover)
      heroProgress.set(pHero)
      if (heroTriggerRef.current) {
        const start = heroTriggerRef.current.start
        const end = heroTriggerRef.current.end
        const targetScroll = start + pHero * (end - start)
        window.scrollTo(0, targetScroll)
        if (lenisRef.current) {
          lenisRef.current.scrollTo(targetScroll, { immediate: true })
        }
      }
      invalidate()
    }
    const params = new URLSearchParams(window.location.search)
    const pParam = params.get('p')
    if (pParam !== null) {
      const flightP = parseFloat(pParam)
      if (!isNaN(flightP)) {
        const handover = FLIGHT_CONFIG.HANDOVER_P
        heroProgress.set(handover + flightP * (1 - handover))
        invalidate()
      }
    }

    if (window.location.search.includes('autocapture=1')) {
      const steps = [
        { name: 'p_0.00_start_formation', p: 0.06, title: 'p = 0.00 (Start Formation - Wide Spread Along Bottom Edge, After Intro Fade)' },
        { name: 'p_0.10_lift_arc', p: 0.10, title: 'p = 0.10 (Lift & Fan Out Arc)' },
        { name: 'p_0.25_fanning', p: 0.25, title: 'p = 0.25 (Fanning Outward)' },
        { name: 'p_0.40_jeevalink', p: 0.40, title: 'p = 0.40 (JeevaLink Focus - Left Side)' },
        { name: 'p_0.48_chitguard', p: 0.48, title: 'p = 0.48 (ChitGuard Focus - Right Side)' },
        { name: 'p_0.50_midflight', p: 0.50, title: 'p = 0.50 (Mid-Flight Arc)' },
        { name: 'p_0.56_dr_detection', p: 0.56, title: 'p = 0.56 (DR Detection Focus - Left Side)' },
        { name: 'p_0.64_cashpilot', p: 0.64, title: 'p = 0.64 (CashPilot Focus - Right Side)' },
        { name: 'p_0.72_mediguard_ai', p: 0.72, title: 'p = 0.72 (MediGuard AI Focus - Left Side)' },
        { name: 'p_0.80_hireconnect', p: 0.80, title: 'p = 0.80 (HireConnect Focus - Right Side)' },
        { name: 'p_0.88_campus_ims', p: 0.88, title: 'p = 0.88 (Campus IMS Focus - Left Side)' },
        { name: 'p_1.00_pure_black_end', p: 1.00, title: 'p = 1.00 (Pure Black Blank End)' },
      ]
      console.log('[autocapture] Detected autocapture=1, scheduling capture in 2s...')
      setTimeout(async () => {
        console.log('[autocapture] Starting step captures...')
        for (const s of steps) {
          ;(window as any).__setFlightProgress(s.p)
          await new Promise((r) => setTimeout(r, 350))
          const canvas = ((window as any).__canvas || document.querySelector('canvas')) as HTMLCanvasElement
          console.log(`[autocapture] p = ${s.p.toFixed(2)}, canvas =`, canvas ? `${canvas.width}x${canvas.height}` : 'null')
          if (canvas) {
            const base64 = canvas.toDataURL('image/png').split(',')[1]
            await fetch('http://localhost:9876/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: `${s.name}.png`, base64, step: s }),
            }).then(() => console.log(`[autocapture] Successfully sent ${s.name}.png`)).catch((e) => console.error('[autocapture] Failed to send:', e))
          }
        }
        console.log('[autocapture] All steps finished, sending /done...')
        await fetch('http://localhost:9876/done', { method: 'POST' }).catch(() => {})
      }, 2000)
    }
  }, [])

  // Initialize Lenis and ScrollTriggers
  useEffect(() => {
    const lenis = new Lenis({
      lerp: FLIGHT_CONFIG.LENIS_LERP,
      touchMultiplier: 2,
    })
    lenisRef.current = lenis
    if (typeof window !== 'undefined') {
      ;(window as any).lenis = lenis
      ;(window as any).heroProgress = heroProgress
    }

    lenis.on('scroll', () => {
      ScrollTrigger.update()
    })

    const tickerCb = (time: number) => {
      lenis.raf(time * 1000)
      if (projectLabelRef.current) {
        projectLabelRef.current.innerText = heroProgress.activeProjectTitle
        projectLabelRef.current.style.opacity = heroProgress.activeProjectOpacity.toFixed(3)
      }
    }
    gsap.ticker.add(tickerCb)
    gsap.ticker.lagSmoothing(0)

    // Scroll lock until intro completes
    if (!introEnded) {
      lenis.stop()
    } else {
      lenis.start()
    }

    // Hero pin and dive + flight ScrollTrigger
    if (!reducedMotion) {
      heroTriggerRef.current = ScrollTrigger.create({
        trigger: '#hero',
        start: 'top top',
        end: `+=${FLIGHT_CONFIG.TOTAL_SCROLL_VH || (FLIGHT_CONFIG.DIVE_SCROLL_VH + FLIGHT_CONFIG.FLIGHT_SCROLL_VH)}%`,
        pin: true,
        anticipatePin: 1,
        scrub: true,
        onLeave: () => {
          setIsCanvasPaused(true)
        },
        onEnterBack: () => {
          setIsCanvasPaused(false)
          invalidate()
        },
        onUpdate: (self) => {
          const p = self.progress
          heroProgress.set(p)

          const handover = FLIGHT_CONFIG.HANDOVER_P
          const flightP = p >= handover ? (p - handover) / (1 - handover) : 0

          // Switch header theme: dark during Welcome (p < handover), light during Projects (p >= handover on white background)
          const nextTheme = p >= handover ? 'light' : 'dark'
          const headerEl = document.getElementById('site-header')
          if (headerEl && headerEl.getAttribute('data-theme') !== nextTheme) {
            headerEl.setAttribute('data-theme', nextTheme)
          }

          // Fade "Selected work" and hint out between flightP = 0.04 and 0.12 (config HEADING_FADE)
          let headingOp = 0
          if (p >= handover && flightP < 0.98) {
            headingOp =
              1.0 -
              smoothstep(
                FLIGHT_CONFIG.HEADING_FADE.start,
                FLIGHT_CONFIG.HEADING_FADE.end,
                flightP
              )
          }

          if (flightTitleRef.current) {
            flightTitleRef.current.style.opacity = headingOp.toFixed(4)
            flightTitleRef.current.style.pointerEvents = headingOp > 0.05 ? 'auto' : 'none'
          }
          if (flightHintRef.current) {
            flightHintRef.current.style.opacity = (headingOp * 0.95).toFixed(4)
            flightHintRef.current.style.transform = `translateY(${headingOp > 0.05 ? '0px' : '6px'})`
            flightHintRef.current.style.pointerEvents = headingOp > 0.05 ? 'auto' : 'none'
          }
        },
      })
    }

    // Header theme ScrollTrigger per section (used in fallback mode)
    const sectionIds = ['#hero', '#projects', '#about', '#skills', '#contact']
    const themeTriggers: ScrollTrigger[] = []
    const reveals: gsap.core.Tween[] = []

    if (isFallback) {
      // Pause canvas only when white About section covers the screen
      const aboutEl = document.getElementById('about')
      if (aboutEl) {
        const aboutTrigger = ScrollTrigger.create({
          trigger: aboutEl,
          start: 'top top',
          onEnter: () => setIsCanvasPaused(true),
          onLeaveBack: () => {
            setIsCanvasPaused(false)
            invalidate()
          },
        })
        themeTriggers.push(aboutTrigger)
      }

      sectionIds.forEach((id) => {
        const el = document.querySelector(id)
        if (!el) return
        const isDark = el.getAttribute('data-theme') === 'dark'
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: 'top 64px',
          end: 'bottom 64px',
          onToggle: (self) => {
            if (self.isActive) {
              const nextTheme = isDark ? 'dark' : 'light'
              setHeaderTheme(nextTheme)
              const headerEl = document.getElementById('site-header')
              if (headerEl) {
                headerEl.setAttribute('data-theme', nextTheme)
              }
            }
          },
        })
        themeTriggers.push(trigger)
      })

      // Reveal animations for white sections in fallback mode
      gsap.utils.toArray<HTMLElement>('.section-reveal').forEach((el) => {
        const tween = gsap.fromTo(
          el,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          }
        )
        reveals.push(tween)
      })
    }

    // Deep link handling (e.g. /#about, /#skills, /#contact)
    const handleDeepLink = () => {
      const hash = window.location.hash
      if (!hash) return
      ScrollTrigger.refresh()

      if (!isFallback && stageTriggerRef.current) {
        const st = stageTriggerRef.current
        let targetP: number | null = null
        if (hash === '#about') targetP = STAGE_HOLD_PROGRESS.about
        else if (hash === '#skills') targetP = STAGE_HOLD_PROGRESS.skills
        else if (hash === '#contact') targetP = STAGE_HOLD_PROGRESS.contact

        if (targetP !== null) {
          setIsCanvasPaused(true)
          heroProgress.set(1)
          const targetScroll = st.start + targetP * (st.end - st.start)
          lenis.scrollTo(targetScroll, { immediate: true })
          setHeaderTheme('light')
          const headerEl = document.getElementById('site-header')
          if (headerEl) {
            headerEl.setAttribute('data-theme', 'light')
          }
          return
        }
      }

      const targetEl = document.querySelector(hash)
      if (targetEl) {
        setIsCanvasPaused(true)
        heroProgress.set(1)
        lenis.scrollTo(hash, { immediate: true })
        const targetTheme = targetEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
        setHeaderTheme(targetTheme)
        const headerEl = document.getElementById('site-header')
        if (headerEl) {
          headerEl.setAttribute('data-theme', targetTheme)
        }
      }
    }

    // Sort triggers by DOM order so #hero pin spacing correctly offsets #stage
    ScrollTrigger.sort()
    ScrollTrigger.refresh()

    handleDeepLink()
    window.addEventListener('hashchange', handleDeepLink)

    return () => {
      window.removeEventListener('hashchange', handleDeepLink)
      gsap.ticker.remove(tickerCb)
      if (heroTriggerRef.current) heroTriggerRef.current.kill()
      themeTriggers.forEach((t) => t.kill())
      reveals.forEach((t) => t.kill())
      ScrollTrigger.getAll().forEach((t) => t.kill())
      lenis.destroy()
    }
  }, [reducedMotion, isFallback])

  // Sync scroll lock with introEnded
  useEffect(() => {
    if (!lenisRef.current) return
    if (introEnded) {
      lenisRef.current.start()
    } else {
      lenisRef.current.stop()
    }
  }, [introEnded])

  // Reduced motion continue click handler
  const handleReducedMotionContinue = () => {
    if (inHeroOverlayRef.current) {
      inHeroOverlayRef.current.style.transition = 'opacity 0.4s ease'
      inHeroOverlayRef.current.style.opacity = '1'
    }
    setTimeout(() => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo('#projects', { immediate: true })
      } else {
        const proj = document.getElementById('projects')
        proj?.scrollIntoView()
      }
      setIsCanvasPaused(true)
    }, 400)
  }

  return (
    <div className="home-root">
      {isDev && <DevDebugBox isCanvasPaused={isCanvasPaused} inHeroOverlayRef={inHeroOverlayRef} />}
      {/* Fixed Header shared across entire page */}
      <Header actionsVisible={introEnded} theme={headerTheme} />

      {/* Fixed 3D Canvas across Hero and Projects */}
      <div
        className="hero-canvas-wrap"
        style={{
          visibility: isCanvasPaused ? 'hidden' : 'visible',
        }}
      >
        <WelcomeApp
          showChrome={false}
          onIntroEnd={handleIntroEnd}
          screenMeshRef={screenMeshRef}
          externalPose={externalPose}
          frameloop={isCanvasPaused ? 'never' : 'always'}
          inHeroOverlayRef={inHeroOverlayRef}
          creditsRef={creditsRef}
          scrollHintRef={scrollHintRef}
          onThresholdChange={setIsCanvasPaused}
          onSelectProject={handleSelectProject}
          isDetailOpen={isDetailOpen}
        />
      </div>

      {/* Pinned Hero Section (Camera Dive Track) */}
      <section
        id="hero"
        data-theme="dark"
      >
        {/* Scroll Hint */}
        <div
          ref={scrollHintRef}
          className="scroll-hint"
          style={{
            opacity: introEnded && !isCanvasPaused ? 0.9 : 0,
          }}
        >
          <span>Scroll</span>
          <svg
            className="scroll-hint-arrow"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Hero Credits */}
        <div ref={creditsRef} className="hero-credits-wrap">
          <Credits />
        </div>

        {/* Flight Title (bottom-left) */}
        <div ref={flightTitleRef} className="flight-title" aria-hidden="true">
          <h2>Projects</h2>
          <div className="flight-subtitle">AI &middot; Web &middot; Mobile</div>
        </div>

        {/* Flight Hint (fixed bottom-right) */}
        <div ref={flightHintRef} className="flight-hint">
          Click a project to open
        </div>

        {/* Active Project Label (bottom-center, fading in and out per project as in demo) */}
        <div
          ref={projectLabelRef}
          id="project-focus-label"
          className="project-focus-label"
          aria-live="polite"
        />

        {/* In-hero match-cut overlay */}
        <div
          ref={inHeroOverlayRef}
          className="in-hero-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000000',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />

        {/* Reduced motion fallback */}
        {reducedMotion && (
          <div className="reduced-motion-continue">
            <button
              type="button"
              onClick={handleReducedMotionContinue}
              className="continue-btn"
            >
              Continue to Projects &darr;
            </button>
          </div>
        )}
      </section>

      {/* Main Sections */}
      <main style={{ marginTop: !isFallback ? '-100vh' : '0' }}>
        {/* Projects section anchor */}
        <section id="projects" data-theme="dark" style={{ position: 'relative', height: 0, overflow: 'hidden' }} />

        {!isFallback ? (
          <PixelStage
            onStageTriggerCreated={(trigger) => {
              stageTriggerRef.current = trigger
            }}
          />
        ) : (
          <>
            {/* Light About Section */}
            <section id="about" data-theme="light" className="page-section section-light">
              <div className="section-inner section-reveal">
                <h2 className="section-heading">About</h2>
                <About embedded />
              </div>
            </section>

            {/* Light Skills Section */}
            <section id="skills" data-theme="light" className="page-section section-light">
              <div className="section-inner section-reveal">
                <h2 className="section-heading">Skills</h2>
                <Skills embedded />
              </div>
            </section>

            {/* Light Contact Section */}
            <section id="contact" data-theme="light" className="page-section section-light">
              <div className="section-inner section-reveal">
                <h2 className="section-heading">Contact</h2>
                <Contact embedded />
              </div>
            </section>
          </>
        )}
      </main>

      {/* Project Detail Overlay */}
      <ProjectDetail
        project={activeProject}
        isOpen={isDetailOpen}
        onClose={handleCloseProject}
        startRect={selectedCardRect}
        dialogRef={dialogRef}
        backBtnRef={backBtnRef}
      />
    </div>
  )
}

export default Home
