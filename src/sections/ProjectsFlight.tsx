import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects, type ProjectItem } from '../config/projects'
import { flightConfig } from '../config/flight'
import ProjectDetail from '../ui/ProjectDetail'
import './ProjectsFlight.css'

gsap.registerPlugin(ScrollTrigger)

// Seeded PRNG: mulberry32
function mulberry32(seed: number) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededRange(rand: () => number, min: number, max: number) {
  return min + rand() * (max - min)
}

interface ProjectsFlightProps {
  lenisRef: React.MutableRefObject<Lenis | null>
}

type ModalState = 'idle' | 'opening' | 'open' | 'closing'

export const ProjectsFlight: React.FC<ProjectsFlightProps> = ({ lenisRef }) => {
  const sectionRef = useRef<HTMLElement>(null)
  const flightRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const gridWrapRef = useRef<HTMLDivElement>(null)
  const flightTitleRef = useRef<HTMLDivElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const indexGridRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const backBtnRef = useRef<HTMLButtonElement>(null)

  // Selected project for detail overlay
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // State machine refs to avoid per-frame re-renders
  const modalStateRef = useRef<ModalState>('idle')
  const pendingCloseRef = useRef(false)
  const clickedCardRef = useRef<HTMLElement | null>(null)
  const expanderElRef = useRef<HTMLDivElement | null>(null)
  const flightTlRef = useRef<gsap.core.Timeline | null>(null)
  const savedScrollYRef = useRef<number>(0)

  // Check touch devices
  const isTouch = useMemo(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }, [])

  // Check prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Desktop: 8 cols x 6 rows = 48 cards. Mobile: 4 cols x 3 rows x 2 = 24 cards
  const totalCards = 48

  // Generate cards in seeded-shuffled order
  const { flightCards, cardTransforms } = useMemo(() => {
    const randCards = mulberry32(flightConfig.seed)
    const list: ProjectItem[] = []
    for (let i = 0; i < totalCards; i++) {
      list.push(projects[i % projects.length])
    }
    // Seeded Fisher-Yates shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(randCards() * (i + 1))
      const temp = list[i]
      list[i] = list[j]
      list[j] = temp
    }

    // Determine first appearance for captions
    const seen = new Set<string>()
    const flightCardsWithFlag = list.map((item, index) => {
      const isFirst = !seen.has(item.id)
      if (isFirst) seen.add(item.id)
      return { item, isFirst, index }
    })

    // Compute random 3D transform values once with separate seed stream
    const randTransforms = mulberry32(flightConfig.seed + 100)
    const transforms = list.map(() => ({
      z: seededRange(randTransforms, flightConfig.zStart[0], flightConfig.zStart[1]),
      rotX: seededRange(randTransforms, flightConfig.rotXStart[0], flightConfig.rotXStart[1]),
      xPercent: seededRange(randTransforms, flightConfig.xPercentEnd[0], flightConfig.xPercentEnd[1]),
      yPercent: seededRange(randTransforms, flightConfig.yPercentEnd[0], flightConfig.yPercentEnd[1]),
    }))

    return { flightCards: flightCardsWithFlag, cardTransforms: transforms }
  }, [totalCards])

  // Open Project Detail Handler
  const openProject = useCallback(
    async (project: ProjectItem, sourceEl: HTMLElement) => {
      if (modalStateRef.current !== 'idle') return
      modalStateRef.current = 'opening'
      pendingCloseRef.current = false
      clickedCardRef.current = sourceEl
      savedScrollYRef.current = window.scrollY

      // Freeze Lenis smooth scroll and prevent native bounce
      if (lenisRef.current) {
        lenisRef.current.stop()
      }
      document.documentElement.style.overflow = 'hidden'

      // Pre-decode image before morphing to avoid white flash
      const targetImgSrc = project.detailImage || project.image || ''
      if (targetImgSrc) {
        const preload = new Image()
        preload.src = targetImgSrc
        try {
          await preload.decode()
        } catch {
          // Ignore decode failure
        }
      }

      // If user hit Escape during decode
      if (modalStateRef.current !== 'opening') return

      setActiveProject(project)
      setIsDetailOpen(true)

      const isMobile = window.innerWidth <= 768
      const sourceRect = sourceEl.getBoundingClientRect()
      const computedRadius = window.getComputedStyle(sourceEl).borderRadius || '8px'

      // Reduced motion fallback: simple cross-fade
      if (reducedMotion) {
        const dialog = dialogRef.current
        if (dialog) {
          gsap.set(dialog, { visibility: 'visible', opacity: 0 })
          gsap.to(dialog, {
            opacity: 1,
            duration: 0.2,
            onComplete: () => {
              modalStateRef.current = 'open'
              backBtnRef.current?.focus()
            },
          })
        }
        return
      }

      // Step 4: Create ONE expander element at clicked card rect
      const expander = document.createElement('div')
      expander.className = 'flight-expander'
      expander.style.position = 'fixed'
      expander.style.zIndex = '91'
      expander.style.left = `${sourceRect.left}px`
      expander.style.top = `${sourceRect.top}px`
      expander.style.width = `${sourceRect.width}px`
      expander.style.height = `${sourceRect.height}px`
      expander.style.borderRadius = computedRadius
      expander.style.overflow = 'hidden'
      expander.style.pointerEvents = 'none'
      expander.style.background = '#03050a'
      expander.style.boxShadow = '0 10px 40px rgba(0,0,0,0.8)'

      const expImg = document.createElement('img')
      expImg.src = targetImgSrc
      expImg.alt = project.title
      expImg.style.width = '100%'
      expImg.style.height = '100%'
      expImg.style.objectFit = 'cover'
      expImg.style.objectPosition = project.focus || '50% 50%'
      expImg.style.display = 'block'
      expander.appendChild(expImg)

      document.body.appendChild(expander)
      expanderElRef.current = expander

      // Immediately hide the original clicked card
      gsap.set(sourceEl, { opacity: 0 })

      // Target expander bounds
      const targetWidth = isMobile ? window.innerWidth : window.innerWidth * 0.42
      const targetHeight = isMobile ? window.innerHeight * 0.42 : window.innerHeight

      // Elements to fade out
      const otherCards = document.querySelectorAll<HTMLElement>('.grid__item')
      const flightTitle = flightTitleRef.current
      const flightHint = hintRef.current
      const heroCredits = document.querySelector('.hero-credits-wrap')

      const fadeElements = [
        ...Array.from(otherCards).filter((c) => c !== sourceEl),
        flightTitle,
        flightHint,
        heroCredits,
      ].filter(Boolean)

      const dialog = dialogRef.current
      if (dialog) {
        gsap.set(dialog, { visibility: 'visible', opacity: 1 })
      }

      const titleLines = dialog?.querySelectorAll('.line-text') || []
      const detailDesc = dialog?.querySelector('.detail-desc')
      const detailStack = dialog?.querySelector('.detail-stack')
      const detailLinks = dialog?.querySelector('.detail-links')
      const backBtn = backBtnRef.current

      // Open timeline (1.2s total)
      const tl = gsap.timeline({
        onComplete: () => {
          modalStateRef.current = 'open'
          if (gridRef.current) {
            gridRef.current.style.visibility = 'hidden'
          }
          backBtn?.focus()
          if (pendingCloseRef.current) {
            closeProject()
          }
        },
      })

      // 0.00s: fade other cards, title, hint to opacity 0
      tl.to(
        fadeElements,
        {
          opacity: 0,
          duration: 0.35,
          ease: 'power2.out',
        },
        0
      )

      // 0.10s: animate expander to left panel bounds
      tl.to(
        expander,
        {
          left: 0,
          top: 0,
          width: targetWidth,
          height: targetHeight,
          borderRadius: 0,
          duration: 0.9,
          ease: 'power3.inOut',
        },
        0.1
      )

      // 0.55s: reveal title lines, paragraphs, stack, links, and back button
      tl.fromTo(
        titleLines,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
        },
        0.55
      )

      const textDetails = [detailDesc, detailStack, detailLinks].filter(Boolean)
      if (textDetails.length > 0) {
        tl.fromTo(
          textDetails,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.06,
            ease: 'power3.out',
          },
          0.65
        )
      }

      if (backBtn) {
        tl.fromTo(
          backBtn,
          { opacity: 0 },
          { opacity: 1, duration: 0.4, ease: 'power2.out' },
          0.7
        )
      }
    },
    [reducedMotion, lenisRef]
  )

  // Close Project Detail Handler
  const closeProject = useCallback(() => {
    if (modalStateRef.current === 'idle' || modalStateRef.current === 'closing') return

    if (modalStateRef.current === 'opening') {
      pendingCloseRef.current = true
      return
    }

    modalStateRef.current = 'closing'

    // Restore 3D grid visibility immediately
    if (gridRef.current) {
      gridRef.current.style.visibility = 'visible'
    }

    const dialog = dialogRef.current
    const sourceEl = clickedCardRef.current
    const expander = expanderElRef.current

    // Reduced motion close
    if (reducedMotion) {
      if (dialog) {
        gsap.to(dialog, {
          opacity: 0,
          duration: 0.2,
          onComplete: () => {
            gsap.set(dialog, { visibility: 'hidden' })
            setIsDetailOpen(false)
            setActiveProject(null)
            document.documentElement.style.overflow = ''
            if (lenisRef.current) {
              lenisRef.current.start()
            }
            if (sourceEl) {
              sourceEl.focus()
            }
            modalStateRef.current = 'idle'
          },
        })
      }
      return
    }

    const titleLines = dialog?.querySelectorAll('.line-text') || []
    const detailDesc = dialog?.querySelector('.detail-desc')
    const detailStack = dialog?.querySelector('.detail-stack')
    const detailLinks = dialog?.querySelector('.detail-links')
    const backBtn = backBtnRef.current
    const otherCards = document.querySelectorAll<HTMLElement>('.grid__item')
    const flightTitle = flightTitleRef.current
    const flightHint = hintRef.current
    const heroCredits = document.querySelector('.hero-credits-wrap')

    const fadeElements = [
      ...Array.from(otherCards).filter((c) => c !== sourceEl),
      flightTitle,
      flightHint,
      heroCredits,
    ].filter(Boolean)

    const textDetails = [backBtn, detailDesc, detailStack, detailLinks].filter(Boolean)

    // Current screen rect of the clicked card
    const currentRect = sourceEl ? sourceEl.getBoundingClientRect() : null
    const computedRadius = sourceEl
      ? window.getComputedStyle(sourceEl).borderRadius || '8px'
      : '8px'

    const isInsideViewport =
      currentRect &&
      currentRect.bottom > 0 &&
      currentRect.top < window.innerHeight &&
      currentRect.right > 0 &&
      currentRect.left < window.innerWidth

    const tl = gsap.timeline({
      onComplete: () => {
        // Clean up expander
        if (expander && expander.parentElement) {
          expander.parentElement.removeChild(expander)
        }
        expanderElRef.current = null

        // Restore card opacity and dialog
        if (sourceEl) {
          gsap.set(sourceEl, { opacity: '', clearProps: 'opacity' })
        }
        if (dialog) {
          gsap.set(dialog, { visibility: 'hidden', opacity: 0 })
        }

        setIsDetailOpen(false)
        setActiveProject(null)
        document.documentElement.style.overflow = ''

        // Resume scroll
        if (lenisRef.current) {
          lenisRef.current.start()
        }

        // Restore focus
        if (sourceEl) {
          sourceEl.focus()
        }

        modalStateRef.current = 'idle'
      },
    })

    // Fade out text elements
    if (textDetails.length > 0) {
      tl.to(
        textDetails,
        {
          opacity: 0,
          duration: 0.35,
          ease: 'power2.in',
        },
        0
      )
    }

    if (titleLines.length > 0) {
      tl.to(
        titleLines,
        {
          yPercent: -110,
          duration: 0.4,
          stagger: 0.04,
          ease: 'power3.in',
        },
        0
      )
    }

    // Morph expander back to card rect (or scale down and fade if scrolled away)
    if (expander) {
      if (isInsideViewport && currentRect) {
        tl.to(
          expander,
          {
            left: currentRect.left,
            top: currentRect.top,
            width: currentRect.width,
            height: currentRect.height,
            borderRadius: computedRadius,
            duration: 0.8,
            ease: 'power3.inOut',
          },
          0.1
        )
      } else {
        tl.to(
          expander,
          {
            scale: 0.92,
            opacity: 0,
            duration: 0.5,
            ease: 'power2.in',
          },
          0.1
        )
      }
    }

    // Restore other cards and title opacity by clearing inline overrides
    tl.to(
      fadeElements,
      {
        opacity: '',
        clearProps: 'opacity',
        duration: 0.6,
        ease: 'power2.out',
      },
      0.15
    )
  }, [reducedMotion, lenisRef])

  // Setup GSAP Flight ScrollTrigger and 10Hz Near Checker
  useEffect(() => {
    if (reducedMotion) return
    const gridWrap = gridWrapRef.current
    if (!gridWrap) return

    const isMobile = window.innerWidth <= 768
    const itemElements = Array.from(
      gridWrap.querySelectorAll<HTMLElement>('.grid__item')
    )
    const inners = Array.from(
      gridWrap.querySelectorAll<HTMLElement>('.grid__item-inner')
    )
    const shades = Array.from(gridWrap.querySelectorAll<HTMLElement>('.shade'))

    // Step A3: Scroll-scrubbed timeline
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: gridWrap,
        start: 'top bottom+=5%',
        end: 'bottom top-=5%',
        scrub: true,
      },
    })
    flightTlRef.current = tl

    // Grid wrap advances forward to wrapZEnd (duration: 1)
    tl.to(gridWrap, { z: flightConfig.wrapZEnd, duration: 1 }, 0)

    // Items fly and rotate back to 0 while preserving z-depth (duration: 1)
    itemElements.forEach((el, idx) => {
      const t = cardTransforms[idx]
      if (!t) return
      const initialZ = isMobile ? t.z * 0.6 : t.z
      tl.fromTo(
        el,
        {
          transformOrigin: '50% 0%',
          z: initialZ,
          rotationX: t.rotX,
          xPercent: 0,
          yPercent: 0,
        },
        {
          z: initialZ,
          xPercent: t.xPercent,
          yPercent: t.yPercent,
          rotationX: 0,
          duration: 1,
        },
        0
      )
    })

    // Inner images zoom down from 2 to 0.5 (duration: 1)
    tl.fromTo(
      inners,
      { scale: 1 / flightConfig.innerScale },
      { scale: flightConfig.innerScale, duration: 1 },
      0
    )

    // Shades fade from 1 to 0 over first half of the timeline (duration: 0.5)
    tl.fromTo(shades, { opacity: 1 }, { opacity: 0, duration: 0.5 }, 0)

    // Fade-up animation for project index cards
    const indexGrid = indexGridRef.current
    if (indexGrid) {
      const indexCards = indexGrid.querySelectorAll('.project-index-card')
      gsap.fromTo(
        indexCards,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: indexGrid,
            start: 'top 85%',
          },
        }
      )

      // Fade out flight title when reaching the index section
      if (flightTitleRef.current) {
        ScrollTrigger.create({
          trigger: indexGrid,
          start: 'top 95%',
          onEnter: () => {
            if (flightTitleRef.current) flightTitleRef.current.style.opacity = '0'
          },
          onLeaveBack: () => {
            if (flightTitleRef.current) flightTitleRef.current.style.opacity = '1'
          },
        })
      }
    }

    // Step 2: 10Hz Near Detection Checker (runs at checkHz: 10, NOT every frame)
    let lastCheck = 0
    const checkInterval = 1000 / flightConfig.select.checkHz

    const tickerCb = () => {
      const now = performance.now()
      if (now - lastCheck < checkInterval) return
      lastCheck = now

      // Skip checker if modal is not idle
      if (modalStateRef.current !== 'idle') return

      const vw = window.innerWidth
      const vh = window.innerHeight
      const minW = (flightConfig.select.minWidthVw / 100) * vw
      const maxW = (flightConfig.select.maxWidthVw / 100) * vw
      let nearCount = 0

      itemElements.forEach((card) => {
        const rect = card.getBoundingClientRect()
        const totalArea = rect.width * rect.height

        // Width check
        const widthOk = rect.width >= minW && rect.width <= maxW

        // Viewport intersection check
        const x1 = Math.max(0, rect.left)
        const y1 = Math.max(0, rect.top)
        const x2 = Math.min(vw, rect.right)
        const y2 = Math.min(vh, rect.bottom)
        const visibleArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
        const visibleRatio = totalArea > 0 ? visibleArea / totalArea : 0
        const ratioOk = visibleRatio >= flightConfig.select.minVisibleRatio

        // Shade opacity check
        const shade = card.querySelector('.shade') as HTMLElement | null
        const shadeOpacity = shade ? parseFloat(window.getComputedStyle(shade).opacity) : 1
        const shadeOk = shadeOpacity <= flightConfig.select.maxShade

        const isNear = widthOk && ratioOk && shadeOk

        if (isNear) {
          nearCount++
          if (!card.classList.contains('is-near')) {
            card.classList.add('is-near')
            card.setAttribute('tabindex', '0')
          }
        } else {
          if (card.classList.contains('is-near')) {
            card.classList.remove('is-near')
            card.setAttribute('tabindex', '-1')
          }
        }
      })

      // Toggle hint visibility
      if (hintRef.current) {
        if (nearCount > 0) {
          hintRef.current.classList.add('is-visible')
        } else {
          hintRef.current.classList.remove('is-visible')
        }
      }
    }

    gsap.ticker.add(tickerCb)

    // Refresh ScrollTrigger after fonts and images load
    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 400)

    document.fonts?.ready?.then(() => {
      ScrollTrigger.refresh()
    })

    return () => {
      clearTimeout(refreshTimer)
      gsap.ticker.remove(tickerCb)
      tl.kill()
      ScrollTrigger.getAll().forEach((t) => {
        if (t.vars.trigger === gridWrap || t.vars.trigger === indexGrid) {
          t.kill()
        }
      })
    }
  }, [cardTransforms, reducedMotion])

  return (
    <section id="projects" ref={sectionRef} data-theme="dark">
      {/* Flight Title (sticky bottom-left) */}
      <div ref={flightTitleRef} className="flight-title" aria-hidden="true">
        <h2>Projects</h2>
        <div className="flight-subtitle">AI &middot; Web &middot; Mobile</div>
      </div>

      {/* Flight Hint (sticky bottom-right) */}
      {!reducedMotion && (
        <div ref={hintRef} className="flight-hint">
          {isTouch ? 'Tap a project to open' : 'Click a project to open'}
        </div>
      )}

      {/* 3D Card Flight (skipped in reduced-motion mode) */}
      {!reducedMotion && (
        <div ref={flightRef} className="flight">
          <div ref={gridRef} className="grid">
            <div ref={gridWrapRef} className="grid-wrap">
              {flightCards.map(({ item, isFirst, index }) => (
                <button
                  key={`${item.id}-${index}`}
                  type="button"
                  className="grid__item"
                  data-project-id={item.id}
                  aria-label={`Open project: ${item.title}`}
                  tabIndex={-1}
                  onClick={(e) => openProject(item, e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openProject(item, e.currentTarget)
                    }
                  }}
                >
                  <div className="grid__item-inner">
                    <img
                      src={item.image}
                      alt={item.title}
                      decoding="async"
                      onError={(e) => {
                        const target = e.currentTarget
                        target.style.display = 'none'
                        const fallback = target.parentElement?.querySelector(
                          '.card-fallback'
                        ) as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div className="card-fallback" style={{ display: 'none' }}>
                      {item.title}
                    </div>
                  </div>

                  {/* Dark overlay for cards emerging from void */}
                  <div className="shade" />

                  {/* Caption on the FIRST card of each project */}
                  {isFirst && <span className="caption">{item.title}</span>}

                  {/* Near card hover title */}
                  <span className="near-title">{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Index List (Below the flight) */}
      <div className="projects-index">
        <h3 className="projects-index-heading">All projects</h3>
        <div ref={indexGridRef} className="projects-index-grid">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="project-index-card"
              data-project-id={project.id}
              aria-label={`Open project: ${project.title}`}
              onClick={(e) => openProject(project, e.currentTarget)}
            >
              <div className="project-index-thumb">
                <img
                  src={project.image}
                  alt={project.title}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const fallback = target.parentElement?.querySelector(
                      '.card-fallback'
                    ) as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                <div className="card-fallback" style={{ display: 'none' }}>
                  {project.title}
                </div>
              </div>

              <div className="project-index-info">
                <h4 className="project-index-title">{project.title}</h4>
                <p className="project-index-summary">{project.summary}</p>
                {project.stack && project.stack.length > 0 && (
                  <div className="project-index-stack">
                    {project.stack
                      .filter((s) => s !== 'TODO')
                      .map((tech) => (
                        <span key={tech} className="stack-tag">
                          {tech}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Project Detail Portal */}
      <ProjectDetail
        project={activeProject}
        isOpen={isDetailOpen}
        onClose={closeProject}
        dialogRef={dialogRef}
        backBtnRef={backBtnRef}
      />
    </section>
  )
}

export default ProjectsFlight
