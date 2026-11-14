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
  const previewImgRef = useRef<HTMLImageElement>(null)

  // Featured/active projects list for next/prev navigation
  const activeProjects = projects.filter((p) => p.featured !== false)

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
          duration: 0.24,
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
          duration: 0.28,
          ease: 'power2.inOut',
        },
        0.06
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
      { autoAlpha: 1, duration: 0.28, ease: 'power2.out' },
      0
    )

    // Inner dashboard container smoothly fades & rises into view
    if (container) {
      tl.fromTo(
        container,
        { autoAlpha: 0, y: 16, scale: 0.99 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, ease: 'power3.out' },
        0.05
      )
    }

    timelineRef.current = tl
  }, [isOpen, dialogRef, backBtnRef, reset, onClose, startClose])

  const displayProj = currentProject || project || renderedProject
  const isCompleted = displayProj?.status?.toLowerCase().includes('completed')
  const cleanYear = displayProj?.year?.trim() || ''
  const rawRole = displayProj?.role?.trim() || ''
  const cleanRole = rawRole && !/\btodo\b/i.test(rawRole) ? rawRole : 'Full-Stack Developer'
  const descriptionParagraphs = displayProj?.description
    ? displayProj.description
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []

  // Gallery slideshow state & auto-advancing logic
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Reset to first slide whenever a new project is selected or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveSlide(0)
      setIsPaused(false)
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
    }, 4500) // 4.5s per slide, smooth slow transition

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

      const outX = dir === 'next' ? -60 : 60
      const inX = dir === 'next' ? 60 : -60

      if (containerRef.current) {
        gsap.to(containerRef.current, {
          x: outX,
          opacity: 0,
          duration: 0.18,
          ease: 'power2.in',
          onComplete: () => {
            setCurrentProject(targetProj)
            setRenderedProject(targetProj)
            setActiveSlide(0)
            onSelectProject?.(targetProj)
            gsap.fromTo(
              containerRef.current,
              { x: inX, opacity: 0 },
              {
                x: 0,
                opacity: 1,
                duration: 0.26,
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

  return createPortal(
    <div
      id="project-detail-dialog"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={displayProj?.title || 'Project Details'}
      tabIndex={-1}
      className={isMobileApp ? 'dialog--mobile-app' : 'dialog--web-app'}
    >
      {/* Floating Left and Right side navigation buttons */}
      {prevProject && (
        <button
          type="button"
          className="detail-side-nav detail-side-nav--prev"
          onClick={() => navigateTo(prevProject, 'prev')}
          title={`Previous project: ${prevProject.title} (← Left Arrow)`}
          aria-label={`Previous project: ${prevProject.title}`}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="detail-side-nav-tooltip">‹ {prevProject.title}</span>
        </button>
      )}

      {nextProject && (
        <button
          type="button"
          className="detail-side-nav detail-side-nav--next"
          onClick={() => navigateTo(nextProject, 'next')}
          title={`Next project: ${nextProject.title} (→ Right Arrow)`}
          aria-label={`Next project: ${nextProject.title}`}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="detail-side-nav-tooltip">{nextProject.title} ›</span>
        </button>
      )}

      {/* Continuous dark background dashboard canvas */}
      <div
        className={`detail-canvas ${
          isMobileApp ? 'detail-canvas--mobile' : 'detail-canvas--web'
        }`}
        ref={containerRef}
      >
        {isMobileApp ? (
          /* ========================================================= */
          /* MOBILE APPLICATION SHOWCASE (38% Device / 62% Info)       */
          /* ========================================================= */
          <div className="mobile-showcase-layout">
            {/* LEFT COLUMN: Smartphone Mockup (35–38% width) */}
            <div
              className="mobile-showcase-left"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
                <div className="smartphone-mockup" aria-label="Smartphone Device Mockup">
                  {/* Smartphone Top Notch / Dynamic Island */}
                  <div className="smartphone-island" aria-hidden="true">
                    <div className="smartphone-speaker" />
                    <div className="smartphone-camera-lens" />
                  </div>

                  {/* Smartphone Screen Viewport with Horizontal Sliding Track */}
                  <div className="smartphone-screen">
                    <div
                      className="smartphone-carousel-track"
                      style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                    >
                      {imageList.map((imgSrc, idx) => (
                        <div key={imgSrc + idx} className="smartphone-carousel-slide">
                          <img
                            ref={idx === 0 ? previewImgRef : undefined}
                            src={imgSrc}
                            alt={`${displayProj?.title || 'Mobile project'} screenshot ${idx + 1}`}
                            className="smartphone-screenshot"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Smartphone Bottom Home Indicator */}
                  <div className="smartphone-home-indicator" aria-hidden="true" />
                </div>

                {/* Screenshot navigation controls directly below the phone */}
                {imageList.length > 1 && (
                  <div
                    className="detail-carousel-controls detail-carousel-controls--mobile"
                    aria-label="Mobile app screenshots"
                  >
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

              {/* RIGHT COLUMN: Project Information + Bottom Info Grid (All in Right Column) */}
              <div className="mobile-showcase-right">
                {/* 1. Back navigation */}
                <div className="mobile-info-nav-row">
                  <button
                    type="button"
                    ref={backBtnRef}
                    className="detail-back-btn"
                    onClick={startClose}
                    aria-label="Close project details"
                  >
                    ← back [ESC]
                  </button>

                  <div className="detail-project-nav-bar">
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
                      <span>Prev</span>
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
                      <span>Next</span>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 2. Project number and completion status */}
                <div className="mobile-info-meta-row">
                  <span className="mobile-proj-tag">
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
                </div>

                {/* 3. Large project title */}
                <h2 className="mobile-info-title">{displayProj?.title}</h2>

                {/* 4. Application category or developer role */}
                <div className="mobile-info-category">
                  <span className="mobile-cat-pill">MOBILE APPLICATION</span>
                  <span className="mobile-cat-bullet" aria-hidden="true">·</span>
                  <span className="mobile-role-label">{cleanRole}</span>
                </div>

                {/* 5. Short project introduction */}
                <p className="mobile-info-summary">{displayProj?.summary}</p>

                {/* 6. Technology stack badges */}
                {displayProj?.stack && displayProj.stack.length > 0 && (
                  <div className="mobile-tech-tags">
                    {displayProj.stack.map((item) => (
                      <span key={item} className="detail-tech-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* 7. GitHub and Demo buttons */}
                <div className="mobile-action-buttons">
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
                    <div className="mobile-demo-pill" title="Live APK / Demo in active build pipeline">
                      <span className="mobile-demo-dot" />
                      <span>APK / Demo in Build</span>
                    </div>
                  )}
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="mobile-right-divider" />

                {/* 2-Column Spacious Bento Showcase (50% / 50%) */}
                <div className="mobile-details-bento">
                  {/* COLUMN 1: Core Capabilities (Features) */}
                  <div className="mobile-bento-card mobile-bento-card--features">
                    <div className="mobile-card-header">
                      <span className="mobile-card-kicker">KEY CAPABILITIES</span>
                      <span className="mobile-card-headline">Core App Features</span>
                    </div>
                    <div className="mobile-features-flow">
                      {featureColumns.map((col, idx) => (
                        <div key={idx} className="mobile-feature-row">
                          <div className="mobile-feature-badge">{col.label}</div>
                          <p className="mobile-feature-text">{col.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* COLUMN 2: Purpose & Architecture */}
                  <div className="mobile-bento-card mobile-bento-card--specs">
                    <div className="mobile-card-header">
                      <span className="mobile-card-kicker">SYSTEM & IMPACT</span>
                      <span className="mobile-card-headline">Purpose & Architecture</span>
                    </div>

                    {/* Problem & Purpose */}
                    <div className="mobile-spec-section">
                      <div className="mobile-spec-title">Problem & Impact</div>
                      <p className="mobile-spec-body">
                        {displayProj?.aboutDetails?.purpose || displayProj?.description?.split('\n\n')[0]}
                      </p>
                      {displayProj?.aboutDetails?.targetUsers && (
                        <div className="mobile-user-tag-row">
                          <span className="mobile-user-label">Target Users:</span>
                          <span className="mobile-user-value">{displayProj.aboutDetails.targetUsers}</span>
                        </div>
                      )}
                    </div>

                    {/* Technical Specs */}
                    <div className="mobile-spec-section mobile-spec-section--arch">
                      {technicalDetails?.architecture && (
                        <div className="mobile-spec-item">
                          <div className="spec-label">System Architecture</div>
                          <div className="spec-value">{technicalDetails.architecture}</div>
                        </div>
                      )}
                      {technicalDetails?.challenges && (
                        <div className="mobile-spec-item">
                          <div className="spec-label">Technical Challenge</div>
                          <div className="spec-value">{technicalDetails.challenges}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
          </div>
        </div>
      ) : (
          /* ========================================================= */
          /* WEBPAGE APPLICATION SHOWCASE (58% Preview / 42% Info)     */
          /* ========================================================= */
          <>
            {/* TOP ROW: Quick Project Info (Left) + Screenshot Preview (Right) */}
            <div className="detail-top-row">
              {/* 1. Left — Quick project information (42% width) */}
              <div className="detail-quick-info">
                <div className="detail-quick-header">
                  <button
                    type="button"
                    ref={backBtnRef}
                    className="detail-back-btn"
                    onClick={startClose}
                    aria-label="Close project details"
                  >
                    ← back [ESC]
                  </button>

                  {/* Prev / Next project switcher in header */}
                  <div className="detail-project-nav-bar">
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
                      <span>Prev</span>
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
                      <span>Next</span>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </button>
                  </div>

                  <div className="detail-quick-badges">
                    {cleanYear && <span className="detail-year-pill">{cleanYear}</span>}
                    <span
                      className={`detail-status-pill ${
                        isCompleted ? 'detail-status-pill--completed' : 'detail-status-pill--progress'
                      }`}
                    >
                      <span className="detail-status-dot" aria-hidden="true" />
                      {displayProj?.status || 'In Progress'}
                    </span>
                  </div>
                </div>

                {/* Project name in large typography */}
                <h2 className="detail-title">{displayProj?.title}</h2>

                {/* Developer role */}
                <div className="detail-role-label">{cleanRole}</div>

                {/* Short introduction */}
                <p className="detail-summary-text">{displayProj?.summary}</p>

                {/* Technology tags */}
                {displayProj?.stack && displayProj.stack.length > 0 && (
                  <div className="detail-tech-tags">
                    {displayProj.stack.map((item) => (
                      <span key={item} className="detail-tech-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* GitHub and Live Demo buttons */}
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
                      <span>GitHub →</span>
                    </a>
                  )}
                  {demoLink && (
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
                  )}
                </div>
              </div>

              {/* 2. Right — Project preview (58% width) */}
              <div
                className="detail-preview-section detail-preview-section--web"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className="detail-media-frame detail-media-frame--web">
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
                          className="detail-slide-img"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image navigation dots immediately underneath */}
                {imageList.length > 1 && (
                  <div className="detail-carousel-controls" aria-label="Project screenshot gallery">
                    <button
                      type="button"
                      className="detail-carousel-btn detail-carousel-btn--prev"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveSlide((prev) => (prev - 1 + imageList.length) % imageList.length)
                      }}
                      title="Previous image"
                      aria-label="Previous image"
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
                          title={`View image ${dotIdx + 1}`}
                          aria-label={`View image ${dotIdx + 1}`}
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
                      title="Next image"
                      aria-label="Next image"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SUBTLE HORIZONTAL DIVIDER LINE */}
            <div className="detail-divider" />

            {/* 3. BOTTOM — Full-Width Project Details (100% width) */}
            <div className="detail-bottom-grid">
              {/* SECTION 1: ABOUT */}
              <div className="detail-bottom-card detail-card--about">
                <div className="detail-section-label">ABOUT</div>
                <h3 className="detail-section-title">Overview & Purpose</h3>
                <div className="detail-section-content">
                  {descriptionParagraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              </div>

              {/* SECTION 2: HIGHLIGHTS (Important features in two columns) */}
              <div className="detail-bottom-card detail-card--highlights">
                <div className="detail-section-label">HIGHLIGHTS</div>
                <h3 className="detail-section-title">Key Capabilities</h3>
                <div className="detail-features-two-col">
                  {featureColumns.map((col, idx) => (
                    <div key={idx} className="detail-feature-item">
                      <div className="detail-feature-num">{col.label}</div>
                      <div className="detail-feature-desc">{col.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: TECHNICAL DETAILS (Architecture, technologies & challenges) */}
              <div className="detail-bottom-card detail-card--technical">
                <div className="detail-section-label">TECHNICAL DETAILS</div>
                <h3 className="detail-section-title">System & Stack</h3>
                <div className="detail-tech-specs">
                  {technicalDetails?.architecture && (
                    <div className="detail-tech-spec-row">
                      <div className="spec-label">Architecture</div>
                      <div className="spec-value">{technicalDetails.architecture}</div>
                    </div>
                  )}
                  {technicalDetails?.technologies && (
                    <div className="detail-tech-spec-row">
                      <div className="spec-label">Technologies</div>
                      <div className="spec-value">{technicalDetails.technologies}</div>
                    </div>
                  )}
                  {technicalDetails?.challenges && (
                    <div className="detail-tech-spec-row">
                      <div className="spec-label">Key Challenge</div>
                      <div className="spec-value">{technicalDetails.challenges}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

export default ProjectDetail
