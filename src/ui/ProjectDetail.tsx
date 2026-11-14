import React, { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { projects, type ProjectItem } from '../config/projects'
import './ProjectDetail.css'

export interface CardRect {
  left: number
  top: number
  width: number
  height: number
}

export interface ProjectDetailProps {
  project: ProjectItem | null
  isOpen: boolean
  onClose: () => void
  startRect?: CardRect | null
  dialogRef: React.RefObject<HTMLDivElement | null>
  backBtnRef: React.RefObject<HTMLButtonElement | null>
  onSelectProject?: (project: ProjectItem) => void
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  isOpen,
  onClose,
  dialogRef,
  backBtnRef,
  onSelectProject,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const detailsScrollRef = useRef<HTMLDivElement>(null)
  const previewImgRef = useRef<HTMLImageElement>(null)

  // Featured/active projects list for next/prev navigation (strictly the 6 featured builds)
  const activeProjects = projects.filter((p) => p.featured)

  // Current project state allowing internal next/previous switching
  const [currentProject, setCurrentProject] = useState<ProjectItem | null>(project)
  // Keep project data alive during closing animation
  const [renderedProject, setRenderedProject] = useState<ProjectItem | null>(project)

  useEffect(() => {
    if (project) {
      setCurrentProject(project)
      setRenderedProject(project)
    }
  }, [project])

  const animStateRef = useRef<'closed' | 'opening' | 'open' | 'closing'>('closed')
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const prevIsOpenRef = useRef(false)
  const isNavigatingRef = useRef(false)

  const reset = useCallback(() => {
    animStateRef.current = 'closed'
    prevIsOpenRef.current = false
    isNavigatingRef.current = false
    const dialog = dialogRef.current
    if (dialog) {
      dialog.classList.remove('is-open')
      dialog.style.visibility = 'hidden'
      dialog.style.opacity = '0'
      dialog.style.pointerEvents = 'none'
      gsap.set(dialog, { clearProps: 'all' })
    }
    if (containerRef.current) {
      gsap.set(containerRef.current, { clearProps: 'all' })
    }
    timelineRef.current = null
  }, [dialogRef])

  // Trigger smooth reverse / close animation
  const startClose = useCallback(() => {
    if (animStateRef.current === 'closed' || animStateRef.current === 'closing') return

    animStateRef.current = 'closing'

    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    const dialog = dialogRef.current
    const container = containerRef.current

    const tl = gsap.timeline({
      onComplete: () => {
        reset()
        onClose()
      },
    })

    if (container) {
      tl.to(
        container,
        {
          autoAlpha: 0,
          y: -14,
          scale: 0.99,
          duration: 0.22,
          ease: 'power2.in',
        },
        0
      )
    }

    if (dialog) {
      tl.to(
        dialog,
        {
          autoAlpha: 0,
          duration: 0.26,
          ease: 'power2.inOut',
        },
        0.05
      )
    }

    timelineRef.current = tl
  }, [onClose, reset, dialogRef])

  // Open animation — only runs on initial open transition
  useEffect(() => {
    if (!isOpen) {
      if (animStateRef.current === 'open' || animStateRef.current === 'opening') {
        startClose()
      }
      prevIsOpenRef.current = false
      return
    }

    // Modal is already open — switching projects should NOT replay dialog open fade
    if (prevIsOpenRef.current) {
      return
    }
    prevIsOpenRef.current = true

    const dialog = dialogRef.current
    const container = containerRef.current
    if (!dialog) return

    animStateRef.current = 'opening'

    dialog.classList.add('is-open')
    dialog.style.visibility = 'visible'
    dialog.style.opacity = '1'
    dialog.style.pointerEvents = 'auto'

    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    const tl = gsap.timeline({
      onComplete: () => {
        animStateRef.current = 'open'
        backBtnRef.current?.focus()
      },
      onReverseComplete: () => {
        reset()
        onClose()
      },
    })

    // Dialog background fades in
    tl.fromTo(
      dialog,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.26, ease: 'power2.out' },
      0
    )

    // Inner container smoothly rises into view
    if (container) {
      tl.fromTo(
        container,
        { autoAlpha: 0, y: 16, scale: 0.99 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out' },
        0.04
      )
    }

    timelineRef.current = tl
  }, [isOpen, dialogRef, backBtnRef, reset, onClose, startClose])

  const displayProj = currentProject || project || renderedProject
  const isCompleted = displayProj?.status?.toLowerCase().includes('completed')
  const cleanYear = displayProj?.year?.trim() || ''
  const cleanRole = displayProj?.role?.trim() || ''

  const descriptionParagraphs = displayProj?.description
    ? displayProj.description
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []

  // Gallery slideshow state & auto-advancing logic
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Reset to first slide & top scroll whenever a new project is selected or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveSlide(0)
      setIsPaused(false)
      if (detailsScrollRef.current) {
        detailsScrollRef.current.scrollTop = 0
      }
    }
  }, [isOpen, displayProj?.id])

  const imageList =
    displayProj?.images && displayProj.images.length > 0
      ? displayProj.images
      : displayProj?.detailImage || displayProj?.image
      ? [displayProj.detailImage || displayProj.image]
      : []

  // Auto-advance slowly one-by-one
  useEffect(() => {
    if (!isOpen || imageList.length <= 1 || isPaused) return

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % imageList.length)
    }, 4500)

    return () => clearInterval(interval)
  }, [isOpen, imageList.length, isPaused])

  // Project navigation logic
  const currentIndex = activeProjects.findIndex((p) => p.id === displayProj?.id)
  const prevProject =
    currentIndex > 0
      ? activeProjects[currentIndex - 1]
      : activeProjects[activeProjects.length - 1]
  const nextProject =
    currentIndex < activeProjects.length - 1
      ? activeProjects[currentIndex + 1]
      : activeProjects[0]

  const navigateTo = useCallback(
    (targetProj: ProjectItem, dir: 'next' | 'prev' = 'next') => {
      if (!targetProj || targetProj.id === displayProj?.id || isNavigatingRef.current) return
      isNavigatingRef.current = true

      const outX = dir === 'next' ? -50 : 50
      const inX = dir === 'next' ? 50 : -50

      if (containerRef.current) {
        gsap.to(containerRef.current, {
          x: outX,
          opacity: 0,
          duration: 0.16,
          ease: 'power2.in',
          onComplete: () => {
            setCurrentProject(targetProj)
            setRenderedProject(targetProj)
            setActiveSlide(0)
            if (detailsScrollRef.current) {
              detailsScrollRef.current.scrollTop = 0
            }
            onSelectProject?.(targetProj)
            gsap.fromTo(
              containerRef.current,
              { x: inX, opacity: 0 },
              {
                x: 0,
                opacity: 1,
                duration: 0.24,
                ease: 'power3.out',
                onComplete: () => {
                  isNavigatingRef.current = false
                },
              }
            )
          },
        })
      } else {
        setCurrentProject(targetProj)
        setRenderedProject(targetProj)
        setActiveSlide(0)
        onSelectProject?.(targetProj)
        isNavigatingRef.current = false
      }
    },
    [displayProj?.id, onSelectProject]
  )

  // ESC key, Left/Right arrows, and focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        startClose()
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (prevProject) navigateTo(prevProject, 'prev')
        return
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (nextProject) navigateTo(nextProject, 'next')
        return
      }

      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return

        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, startClose, dialogRef, prevProject, nextProject, navigateTo])

  if (typeof document === 'undefined') return null

  const isMobileApp =
    displayProj?.kind === 'mobile' ||
    (!displayProj?.kind &&
      (displayProj?.stack?.includes('Flutter') ||
        displayProj?.stack?.includes('React Native') ||
        displayProj?.stack?.includes('Kotlin')))

  const repoLink = displayProj?.links?.find((l) =>
    l.label.toLowerCase().includes('repo') || l.label.toLowerCase().includes('github')
  )
  const demoLink = displayProj?.links?.find((l) =>
    l.label.toLowerCase().includes('demo') ||
    l.label.toLowerCase().includes('live') ||
    l.label.toLowerCase().includes('model')
  )

  const featureColumns =
    displayProj?.featureColumns && displayProj.featureColumns.length > 0
      ? displayProj.featureColumns
      : displayProj?.highlights && displayProj.highlights.length > 0
      ? displayProj.highlights.map((h, i) => ({
          label: `0${i + 1} — CAPABILITY`,
          description: h,
        }))
      : []

  const technicalDetails = displayProj?.technicalDetails || {
    architecture: displayProj?.stack?.join(', ') || 'Custom Full-Stack Architecture',
    technologies: 'Production deployment with optimized assets & CI/CD pipeline',
    challenges: 'High performance real-time interactivity and cross-platform reliability',
  }

  // Derive display domain / URL tag for browser mockup
  const browserUrl = demoLink?.url
    ? demoLink.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : repoLink?.url
    ? repoLink.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : `${displayProj?.id || 'project'}.app`

  return createPortal(
    <div
      id="project-detail-dialog"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={displayProj?.title || 'Project Details'}
      tabIndex={-1}
    >
      {/* Unified 2-Column Dashboard Frame */}
      <div className="detail-canvas" ref={containerRef}>
        {/* ========================================================= */}
        {/* COLUMN 1 (LEFT): Media Showcase (Fixed, capped at 70vh)  */}
        {/* ========================================================= */}
        <div
          className="detail-media-column"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {isMobileApp ? (
            /* Smartphone Mockup Frame */
            <div className="smartphone-mockup" aria-label="Smartphone Device Mockup">
              {/* Dynamic Island / Camera & Speaker */}
              <div className="smartphone-island" aria-hidden="true">
                <div className="smartphone-speaker" />
                <div className="smartphone-camera-lens" />
              </div>

              {/* Smartphone Viewport with Track */}
              <div className="smartphone-screen">
                <div
                  className="detail-carousel-track"
                  style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                  {imageList.map((imgSrc, idx) => (
                    <div key={imgSrc + idx} className="detail-carousel-slide">
                      <img
                        ref={idx === 0 ? previewImgRef : undefined}
                        src={imgSrc}
                        alt={`${displayProj?.title || 'Mobile project'} screenshot ${idx + 1}`}
                        className="detail-slide-img detail-slide-img--mobile"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Smartphone Home Indicator Bar */}
              <div className="smartphone-home-indicator" aria-hidden="true" />
            </div>
          ) : (
            /* Desktop Web Browser Frame */
            <div className="browser-mockup" aria-label="Web Application Browser Frame">
              {/* Browser Window Header */}
              <div className="browser-topbar" aria-hidden="true">
                <div className="browser-dots">
                  <span className="browser-dot browser-dot--close" />
                  <span className="browser-dot browser-dot--min" />
                  <span className="browser-dot browser-dot--max" />
                </div>
                <div className="browser-url-bar">
                  <svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="browser-lock-icon"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="browser-url-text">{browserUrl}</span>
                </div>
              </div>

              {/* Browser Viewport with Track */}
              <div className="browser-screen">
                <div
                  className="detail-carousel-track"
                  style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                  {imageList.map((imgSrc, idx) => (
                    <div key={imgSrc + idx} className="detail-carousel-slide">
                      <img
                        ref={idx === 0 ? previewImgRef : undefined}
                        src={imgSrc}
                        alt={`${displayProj?.title || 'Project'} screenshot ${idx + 1}`}
                        className="detail-slide-img detail-slide-img--web"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Carousel Controls Directly Below Device / Browser (only if multiple images) */}
          {imageList.length > 1 && (
            <div className="detail-carousel-controls" aria-label="Project screenshot gallery">
              <button
                type="button"
                className="detail-carousel-btn detail-carousel-btn--prev"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveSlide((prev) => (prev - 1 + imageList.length) % imageList.length)
                }}
                title="Previous screenshot"
                aria-label="Previous screenshot"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>

              <div className="detail-carousel-dots">
                {imageList.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    className={`detail-carousel-dot ${dotIdx === activeSlide ? 'is-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveSlide(dotIdx)
                    }}
                    title={`View screenshot ${dotIdx + 1}`}
                    aria-label={`View screenshot ${dotIdx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                className="detail-carousel-btn detail-carousel-btn--next"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveSlide((prev) => (prev + 1) % imageList.length)
                }}
                title="Next screenshot"
                aria-label="Next screenshot"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2 (RIGHT): Project Details (Scrolls internally)   */}
        {/* ========================================================= */}
        <div className="detail-info-column" ref={detailsScrollRef}>
          <div className="detail-info-inner">
            {/* 1. TOP NAVIGATION ROW: Back Button (Left) & Prev/Next Pill (Right) */}
            <div className="detail-nav-row">
              <button
                type="button"
                ref={backBtnRef}
                className="detail-back-btn"
                onClick={startClose}
                aria-label="Close project details"
              >
                ← BACK [ESC]
              </button>

              <div className="detail-project-nav-bar" aria-label="Project switcher">
                <button
                  type="button"
                  className="detail-proj-btn detail-proj-btn--prev"
                  onClick={() => navigateTo(prevProject, 'prev')}
                  title={`Previous Project: ${prevProject.title}`}
                  aria-label={`Previous Project: ${prevProject.title}`}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                  <span>PREV</span>
                </button>
                <span className="detail-proj-counter">
                  {String(currentIndex >= 0 ? currentIndex + 1 : 1).padStart(2, '0')} /{' '}
                  {String(activeProjects.length).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  className="detail-proj-btn detail-proj-btn--next"
                  onClick={() => navigateTo(nextProject, 'next')}
                  title={`Next Project: ${nextProject.title}`}
                  aria-label={`Next Project: ${nextProject.title}`}
                >
                  <span>NEXT</span>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 2. META BADGES ROW */}
            <div className="detail-meta-row">
              <span className="detail-proj-tag">
                PROJECT {String(currentIndex >= 0 ? currentIndex + 1 : 1).padStart(2, '0')}
              </span>
              {cleanYear && <span className="detail-year-pill">{cleanYear}</span>}
              <span
                className={`detail-status-pill ${
                  isCompleted ? 'detail-status-pill--completed' : 'detail-status-pill--progress'
                }`}
              >
                <span className="detail-status-dot" aria-hidden="true" />
                {displayProj?.status || 'In Progress'}
              </span>
              <span className="detail-category-pill">
                {isMobileApp ? 'MOBILE APPLICATION' : 'WEB APPLICATION'}
              </span>
              {cleanRole && <span className="detail-role-pill">{cleanRole}</span>}
            </div>

            {/* 3. PROJECT TITLE */}
            <h2 className="detail-title">{displayProj?.title}</h2>

            {/* 4. SUMMARY */}
            <p className="detail-summary">{displayProj?.summary}</p>

            {/* 5. TECH STACK BADGES */}
            {displayProj?.stack && displayProj.stack.length > 0 && (
              <div className="detail-tech-tags">
                {displayProj.stack.map((item) => (
                  <span key={item} className="detail-tech-pill">
                    {item}
                  </span>
                ))}
              </div>
            )}

            {/* 6. ACTION BUTTONS (GitHub Repo & Live Demo) */}
            <div className="detail-action-buttons">
              {repoLink && (
                <a
                  href={repoLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-btn detail-btn--repo"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>GitHub Repo →</span>
                </a>
              )}
              {demoLink ? (
                <a
                  href={demoLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-btn detail-btn--demo"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>{demoLink.label} →</span>
                </a>
              ) : (
                <div className="detail-demo-pill" title="Live APK / Demo in active build pipeline">
                  <span className="detail-demo-dot" />
                  <span>APK / Demo in Build</span>
                </div>
              )}
            </div>

            {/* 7. SUBTLE DIVIDER */}
            <div className="detail-divider" />

            {/* 8. 2-COLUMN BENTO SHOWCASE (KEY CAPABILITIES & SYSTEM / IMPACT) */}
            <div className="detail-bento-grid">
              {/* BENTO CARD 1: Key Capabilities */}
              <div className="detail-bento-card detail-bento-card--features">
                <div className="bento-card-header">
                  <span className="bento-kicker">KEY CAPABILITIES</span>
                  <h3 className="bento-headline">Core App Features</h3>
                </div>
                <div className="bento-features-list">
                  {featureColumns.map((col, idx) => (
                    <div key={idx} className="bento-feature-item">
                      <div className="bento-feature-kicker">{col.label}</div>
                      <p className="bento-feature-desc">{col.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* BENTO CARD 2: Purpose & Architecture */}
              <div className="detail-bento-card detail-bento-card--specs">
                <div className="bento-card-header">
                  <span className="bento-kicker">SYSTEM & IMPACT</span>
                  <h3 className="bento-headline">Purpose & Architecture</h3>
                </div>

                <div className="bento-specs-flow">
                  {/* Problem & Impact */}
                  <div className="bento-spec-section">
                    <div className="bento-spec-kicker">PROBLEM & IMPACT</div>
                    <p className="bento-spec-body">
                      {displayProj?.aboutDetails?.purpose || descriptionParagraphs[0]}
                    </p>
                  </div>

                  {/* Target Users */}
                  {displayProj?.aboutDetails?.targetUsers && (
                    <div className="bento-spec-section">
                      <div className="bento-spec-kicker">TARGET USERS</div>
                      <p className="bento-spec-body bento-spec-body--users">
                        {displayProj.aboutDetails.targetUsers}
                      </p>
                    </div>
                  )}

                  {/* System Architecture */}
                  {technicalDetails?.architecture && (
                    <div className="bento-spec-section">
                      <div className="bento-spec-kicker">SYSTEM ARCHITECTURE</div>
                      <p className="bento-spec-body">{technicalDetails.architecture}</p>
                    </div>
                  )}

                  {/* Technical Challenge */}
                  {technicalDetails?.challenges && (
                    <div className="bento-spec-section">
                      <div className="bento-spec-kicker">TECHNICAL CHALLENGE</div>
                      <p className="bento-spec-body">{technicalDetails.challenges}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ProjectDetail
