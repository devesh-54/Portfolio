import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { invalidate } from '@react-three/fiber'

import WelcomeApp from '../scenes/Welcome/App.jsx'
import { About } from './About'
import { Skills } from './Skills'
import { Hackathons } from './Hackathons'
import { ProjectsEditorial } from './ProjectsEditorial'
import { Achievements } from './Achievements'
import { Contact } from './Contact'
import ProjectDetail from '../ui/ProjectDetail'
import { PixelStage, STAGE_HOLD_PROGRESS } from '../sections/PixelStage'
import type { SectionId } from '../ui/SectionOrderNav'
import { projects, type ProjectItem } from '../config/projects'
import { siteTheme } from '../config/theme'

import { heroProgress } from '../scenes/Welcome/heroProgress'
import type { ExternalPose } from '../scenes/Welcome/ScreenDive'

import { FLIGHT_CONFIG } from '../scenes/Projects/flightConfig'

import '../scenes/Welcome/index.css'
import './Home.css'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

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

const ENABLE_PROJECT_DETAIL_OVERLAY = true

export function Home() {
  const isDev = typeof window !== 'undefined' && window.location.search.includes('dev=1')
  const [, setHeaderTheme] = useState<'dark' | 'light'>('dark')
  const headerThemeRef = useRef<'dark' | 'light'>('dark')
  const updateHeaderTheme = useCallback((next: 'dark' | 'light') => {
    const headerEl = document.getElementById('site-header')
    if (headerEl && headerEl.getAttribute('data-theme') !== next) {
      headerEl.setAttribute('data-theme', next)
    }
    if (headerThemeRef.current !== next) {
      headerThemeRef.current = next
      setHeaderTheme(next)
    }
  }, [])
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    if (typeof window === 'undefined') return 'welcome'
    const h = window.location.hash
    if (h === '#about') return 'about'
    if (h === '#skills') return 'skills'
    if (h === '#hackathons') return 'hackathons'
    if (h === '#projects') return 'projects'
    if (h === '#achievements') return 'achievements'
    if (h === '#contact') return 'contact'
    return 'welcome'
  })
  const activeSectionRef = useRef<SectionId>(activeSection)
  const updateActiveSection = useCallback((next: SectionId) => {
    if (activeSectionRef.current !== next) {
      activeSectionRef.current = next
      setActiveSection(next)
    }
  }, [])
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

  useEffect(() => {
    if (typeof window === 'undefined' || !ENABLE_PROJECT_DETAIL_OVERLAY) return
    ;(window as unknown as {
      openProject?: (id: string, sourceEl?: HTMLElement | null) => void
    }).openProject = (id: string, sourceEl?: HTMLElement | null) => {
      const project = projects.find((p) => p.id === id)
      if (!project) return
      const rect = sourceEl?.getBoundingClientRect?.()
      handleSelectProject(
        project,
        rect
          ? {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }
          : undefined
      )
    }
    return () => {
      delete (window as unknown as { openProject?: unknown }).openProject
    }
  }, [handleSelectProject])

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Wake up Canvas on unpause
  useEffect(() => {
    if (!isCanvasPaused) {
      invalidate()
    }
  }, [isCanvasPaused])

  const handleStageTriggerCreated = useCallback((trigger: ScrollTrigger) => {
    stageTriggerRef.current = trigger
  }, [])
  const handleStageActiveChange = useCallback((active: boolean) => {
    setIsCanvasPaused(active)
    if (!active) invalidate()
  }, [])
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
      const clampedHero = Math.max(0, Math.min(1, pHero))
      heroProgress.set(clampedHero)
      setIsCanvasPaused(false)
      if (clampedHero < FLIGHT_CONFIG.WHITE_WORLD_P) {
        updateHeaderTheme('dark')
        updateActiveSection('welcome')
        document.getElementById('site-header')?.removeAttribute('data-bw')
      } else {
        updateHeaderTheme('dark')
        updateActiveSection('about')
        document.getElementById('site-header')?.removeAttribute('data-bw')
      }
      if (heroTriggerRef.current) {
        const start = heroTriggerRef.current.start
        const end = heroTriggerRef.current.end
        const targetScroll = start + clampedHero * (end - start)
        window.scrollTo(0, targetScroll)
        if (lenisRef.current) {
          lenisRef.current.scrollTo(targetScroll, { immediate: true })
        }
        heroTriggerRef.current.scroll(targetScroll)
        ScrollTrigger.update()
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
        { name: 'p_0.48_safechit', p: 0.48, title: 'p = 0.48 (SafeChit Focus - Right Side)' },
        { name: 'p_0.50_midflight', p: 0.50, title: 'p = 0.50 (Mid-Flight Arc)' },
        { name: 'p_0.56_dr_detection', p: 0.56, title: 'p = 0.56 (DR Detection Focus - Left Side)' },
        { name: 'p_0.64_cashpilot', p: 0.64, title: 'p = 0.64 (CashPilot Focus - Right Side)' },
        { name: 'p_0.72_mediguard_ai', p: 0.72, title: 'p = 0.72 (MediGuard AI Focus - Left Side)' },
        { name: 'p_0.80_hireconnect', p: 0.80, title: 'p = 0.80 (HireConnect Focus - Right Side)' },
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
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0)

    const lenis = new Lenis({
      lerp: FLIGHT_CONFIG.LENIS_LERP,
      touchMultiplier: 2,
      syncTouch: true,
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
    }
    gsap.ticker.add(tickerCb)
    gsap.ticker.lagSmoothing(0)

    // Scroll lock until intro completes (desktop only; mobile allows immediate swipe)
    if (!introEnded && !isTouchDevice) {
      lenis.stop()
    } else {
      lenis.start()
    }

    // Hero pin and dive ScrollTrigger (Welcome -> Monitor Dive -> About Me white handoff)
    if (!reducedMotion) {
      heroTriggerRef.current = ScrollTrigger.create({
        trigger: '#hero',
        start: 'top top',
        end: `+=${FLIGHT_CONFIG.TOTAL_SCROLL_VH || (FLIGHT_CONFIG.DIVE_SCROLL_VH + FLIGHT_CONFIG.FLIGHT_SCROLL_VH)}%`,
        pin: true,
        anticipatePin: 1,
        scrub: true,
        refreshPriority: 10,
        onLeave: () => {
          setIsCanvasPaused(true)
        },
        onEnterBack: (self) => {
          setIsCanvasPaused(false)
          invalidate()
          const p = self.progress
          heroProgress.set(p)
          const whiteWorldP = FLIGHT_CONFIG.WHITE_WORLD_P
          updateHeaderTheme('dark')
          updateActiveSection(p >= whiteWorldP ? 'about' : 'welcome')
          document.getElementById('site-header')?.removeAttribute('data-bw')
        },
        onUpdate: (self) => {
          const p = self.progress
          heroProgress.set(p)

          const whiteWorldP = FLIGHT_CONFIG.WHITE_WORLD_P
          updateHeaderTheme('dark')
          const headerEl = document.getElementById('site-header')
          if (headerEl) {
            headerEl.removeAttribute('data-bw')
          }

          if (!(stageTriggerRef.current?.isActive && (stageTriggerRef.current.start || 0) > 20)) {
            updateActiveSection(p >= whiteWorldP ? 'about' : 'welcome')
          }
        },
      })
    }

    // Header theme ScrollTrigger per section (used in fallback mode)
    const sectionIds = [
      '#hero',
      '#about',
      '#skills',
      '#hackathons',
      '#projects',
      '#achievements',
      '#contact',
    ]
    const themeTriggers: ScrollTrigger[] = []
    const reveals: gsap.core.Tween[] = []

    if (isFallback) {
      // Pause canvas once white About section covers the screen
      const aboutElFallback = document.getElementById('about')
      if (aboutElFallback) {
        const pauseTrigger = ScrollTrigger.create({
          trigger: aboutElFallback,
          start: 'top top',
          onEnter: () => setIsCanvasPaused(true),
          onLeaveBack: () => {
            setIsCanvasPaused(false)
            invalidate()
          },
        })
        themeTriggers.push(pauseTrigger)
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
              const rawId = id.replace('#', '')
              const secId: SectionId = rawId === 'hero' ? 'welcome' : (rawId as SectionId)
              updateActiveSection(secId)
              const nextTheme = isDark ? 'dark' : 'light'
              setHeaderTheme(nextTheme)
              const headerEl = document.getElementById('site-header')
              if (headerEl) {
                headerEl.setAttribute('data-theme', nextTheme)
                if (id === '#hackathons') headerEl.setAttribute('data-bw', 'true')
                else headerEl.removeAttribute('data-bw')
              }
            }
          },
        })
        themeTriggers.push(trigger)
      })

      // Reveal animations for sections in fallback mode
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

    // Deep link handling (e.g. /#about, /#skills, /#hackathons, /#projects, /#achievements, /#contact)
    const handleDeepLink = () => {
      const hash = window.location.hash
      if (!hash) return
      ScrollTrigger.refresh()

      if (!isFallback && stageTriggerRef.current) {
        const st = stageTriggerRef.current
        let targetP: number | null = null
        if (hash === '#about') targetP = STAGE_HOLD_PROGRESS.about
        else if (hash === '#skills') targetP = STAGE_HOLD_PROGRESS.skills
        else if (hash === '#hackathons') targetP = STAGE_HOLD_PROGRESS.hackathons
        else if (hash === '#projects') targetP = STAGE_HOLD_PROGRESS.projects
        else if (hash === '#achievements') targetP = STAGE_HOLD_PROGRESS.achievements
        else if (hash === '#contact') targetP = STAGE_HOLD_PROGRESS.contact

        if (targetP !== null) {
          updateActiveSection(hash.slice(1) as SectionId)
          setIsCanvasPaused(true)
          heroProgress.set(1)
          if (creditsRef.current) {
            creditsRef.current.style.opacity = '0'
            creditsRef.current.style.pointerEvents = 'none'
          }
          if (scrollHintRef.current) {
            scrollHintRef.current.style.opacity = '0'
          }
          const targetScroll = st.start + targetP * (st.end - st.start)
          window.scrollTo(0, targetScroll)
          lenis.scrollTo(targetScroll, { immediate: true })
          st.scroll(targetScroll)
          ;(window as any).__applyStage?.(targetP, hash === '#about' ? 1 : undefined)
          ScrollTrigger.update()
          const targetStageTheme =
            hash === '#about' || hash === '#hackathons' || hash === '#achievements' ? 'dark' : siteTheme
          updateHeaderTheme(targetStageTheme)
          const headerEl = document.getElementById('site-header')
          if (headerEl) {
            if (hash === '#hackathons') headerEl.setAttribute('data-bw', 'true')
            else headerEl.removeAttribute('data-bw')
          }
          return
        }
      }

      const targetEl = document.querySelector(hash)
      if (targetEl) {
        setIsCanvasPaused(true)
        heroProgress.set(1)
        if (creditsRef.current) {
          creditsRef.current.style.opacity = '0'
          creditsRef.current.style.pointerEvents = 'none'
        }
        if (scrollHintRef.current) {
          scrollHintRef.current.style.opacity = '0'
        }
        const scrollFallbackToTarget = () => {
          ScrollTrigger.refresh()
          lenis.resize()
          const targetTop = targetEl.getBoundingClientRect().top + window.scrollY
          window.scrollTo(0, targetTop)
          lenis.scrollTo(targetTop, { immediate: true, force: true })
          reveals.forEach((t) => {
            const trig = t.scrollTrigger?.trigger as HTMLElement | undefined
            if (trig && (trig === targetEl || targetEl.contains(trig))) {
              t.progress(1)
            }
          })
          ScrollTrigger.update()
        }
        scrollFallbackToTarget()
        requestAnimationFrame(scrollFallbackToTarget)
        const targetTheme = targetEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
        updateHeaderTheme(targetTheme)
        const headerEl = document.getElementById('site-header')
        if (headerEl) {
          if (hash === '#hackathons') headerEl.setAttribute('data-bw', 'true')
          else headerEl.removeAttribute('data-bw')
        }
      }
    }

    // Sort triggers by DOM order so #hero pin spacing correctly offsets #stage
    ScrollTrigger.sort()
    ScrollTrigger.refresh()

    if (!window.location.hash && (!heroTriggerRef.current || heroTriggerRef.current.progress < FLIGHT_CONFIG.WHITE_WORLD_P)) {
      updateHeaderTheme('dark')
      updateActiveSection('welcome')
      document.getElementById('site-header')?.removeAttribute('data-bw')
    }

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
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    if (isTouch || introEnded) {
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
        lenisRef.current.scrollTo('#about', { immediate: true })
      } else {
        const aboutEl = document.getElementById('about')
        aboutEl?.scrollIntoView()
      }
      setIsCanvasPaused(true)
    }, 400)
  }

  return (
    <div className="home-root">
      {isDev && <DevDebugBox isCanvasPaused={isCanvasPaused} inHeroOverlayRef={inHeroOverlayRef} />}

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
        {/* In-hero match-cut overlay */}
        <div
          ref={inHeroOverlayRef}
          className="in-hero-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--bg, #03050a)',
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
              Continue to About &darr;
            </button>
          </div>
        )}
      </section>

      {/* Main Sections */}
      <main style={{ marginTop: !isFallback ? '-100vh' : '0' }}>
        {!isFallback ? (
          <PixelStage
            onStageTriggerCreated={handleStageTriggerCreated}
            onStageActiveChange={handleStageActiveChange}
            onActiveSectionChange={updateActiveSection}
            onHeaderThemeChange={updateHeaderTheme}
            onSelectProject={ENABLE_PROJECT_DETAIL_OVERLAY ? handleSelectProject : undefined}
          />
        ) : (
          <>
            {/* About Section */}
            <section id="about" data-theme="dark" className="page-section" style={{ padding: 0, background: '#03050a' }}>
              <About embedded />
            </section>

            {/* Skills Section */}
            <section id="skills" data-theme={siteTheme} className="page-section section-light">
              <div className="section-inner section-reveal">
                <Skills embedded active instantComplete showHeading />
              </div>
            </section>

            {/* Hackathons Section */}
            <section id="hackathons" data-theme="dark" className="page-section section-hackathons-fallback">
              <Hackathons embedded instantComplete />
            </section>

            {/* Projects Section (Text-Only Index) */}
            <section id="projects" data-theme={siteTheme} className="page-section section-light" style={{ padding: 0 }}>
              <ProjectsEditorial
                embedded
                onSelectProject={ENABLE_PROJECT_DETAIL_OVERLAY ? handleSelectProject : undefined}
              />
            </section>

            {/* Achievements Section */}
            <section id="achievements" data-theme="dark" className="page-section" style={{ padding: 0, background: '#03050a' }}>
              <Achievements embedded revealProgress={1} />
            </section>

            {/* Contact Section */}
            <section id="contact" data-theme={siteTheme} className="page-section section-light" style={{ padding: 0 }}>
              <div className="section-inner section-reveal">
                <Contact embedded />
              </div>
            </section>
          </>
        )}
      </main>

      {/* Project Detail Overlay */}
      {ENABLE_PROJECT_DETAIL_OVERLAY ? (
        <ProjectDetail
          project={activeProject}
          isOpen={isDetailOpen}
          onClose={handleCloseProject}
          startRect={selectedCardRect}
          dialogRef={dialogRef}
          backBtnRef={backBtnRef}
          onSelectProject={setActiveProject}
        />
      ) : null}
    </div>
  )
}

export default Home
