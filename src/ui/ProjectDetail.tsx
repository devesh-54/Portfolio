import React, { useEffect, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import type { ProjectItem } from '../config/projects'
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
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  isOpen,
  onClose,
  startRect,
  dialogRef,
  backBtnRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const previewImgRef = useRef<HTMLImageElement>(null)

  // Keep project data alive during closing animation
  const [renderedProject, setRenderedProject] = useState<ProjectItem | null>(project)
  useEffect(() => {
    if (project) {
      setRenderedProject(project)
    }
  }, [project])

  const animStateRef = useRef<'closed' | 'opening' | 'open' | 'closing'>('closed')
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const startRectRef = useRef<CardRect | null>(startRect || null)

  useEffect(() => {
    if (startRect) {
      startRectRef.current = startRect
    }
  }, [startRect])

  const reset = useCallback(() => {
    animStateRef.current = 'closed'
    const dialog = dialogRef.current
    if (dialog) {
      dialog.classList.remove('is-open')
      dialog.style.visibility = 'hidden'
      dialog.style.opacity = '0'
      dialog.style.pointerEvents = 'none'
      gsap.set(dialog, { clearProps: 'all' })
    }
    if (leftPanelRef.current) {
      gsap.set(leftPanelRef.current, { clearProps: 'all' })
    }
    if (previewImgRef.current) {
      gsap.set(previewImgRef.current, { clearProps: 'all' })
    }
    if (containerRef.current) {
      gsap.set(containerRef.current.children, { clearProps: 'all' })
    }
    timelineRef.current = null
  }, [dialogRef])

  // Trigger smooth reverse / close animation
  const startClose = useCallback(() => {
    if (animStateRef.current === 'closed' || animStateRef.current === 'closing') return

    // If interrupted mid-opening, cleanly reverse
    if (animStateRef.current === 'opening') {
      animStateRef.current = 'closing'
      if (timelineRef.current) {
        timelineRef.current.reverse()
        timelineRef.current.eventCallback('onReverseComplete', () => {
          reset()
          onClose()
        })
        return
      }
    }

    animStateRef.current = 'closing'

    const initialRect = startRectRef.current || {
      left: window.innerWidth * 0.35,
      top: window.innerHeight * 0.35,
      width: Math.min(320, window.innerWidth * 0.28),
      height: Math.min(320, window.innerWidth * 0.28) / 1.5,
    }

    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    const tl = gsap.timeline({
      onComplete: () => {
        reset()
        onClose()
      },
    })

    // 1. Right column text & buttons fade out first
    if (containerRef.current) {
      tl.to(
        containerRef.current.children,
        {
          autoAlpha: 0,
          y: -16,
          duration: 0.3,
          stagger: 0.02,
          ease: 'power2.in',
        },
        0
      )
    }

    // 2. Picture panel morphs back into initial card bounds
    if (leftPanelRef.current) {
      tl.to(
        leftPanelRef.current,
        {
          left: initialRect.left,
          top: initialRect.top,
          width: initialRect.width,
          height: initialRect.height,
          borderRadius: 12,
          duration: 0.95,
          ease: 'power3.inOut',
        },
        0.08
      )
    }

    // 3. Inner image zooms slightly back
    if (previewImgRef.current) {
      tl.to(
        previewImgRef.current,
        {
          scale: 1.18,
          duration: 0.95,
          ease: 'power3.inOut',
        },
        0.08
      )
    }

    // 4. Background dialog fades out to black void / 3D cards
    if (dialogRef.current) {
      tl.to(
        dialogRef.current,
        {
          autoAlpha: 0,
          duration: 0.35,
          ease: 'power2.inOut',
        },
        0.58
      )
    }

    timelineRef.current = tl
  }, [onClose, reset, dialogRef])

  // Open animation
  useEffect(() => {
    if (!isOpen || !project) {
      if (animStateRef.current === 'open' || animStateRef.current === 'opening') {
        startClose()
      }
      return
    }

    const dialog = dialogRef.current
    const leftPanel = leftPanelRef.current
    const previewImg = previewImgRef.current
    const rightCol = containerRef.current
    if (!dialog || !leftPanel || !previewImg) return

    animStateRef.current = 'opening'

    const initialRect = startRect || {
      left: window.innerWidth * 0.35,
      top: window.innerHeight * 0.35,
      width: Math.min(320, window.innerWidth * 0.28),
      height: Math.min(320, window.innerWidth * 0.28) / 1.5,
    }

    const isMobile = window.innerWidth <= 768
    const targetLeft = 0
    const targetTop = 0
    const targetWidth = isMobile ? window.innerWidth : window.innerWidth * 0.42
    const targetHeight = isMobile ? window.innerHeight * 0.38 : window.innerHeight

    dialog.classList.add('is-open')
    dialog.style.visibility = 'visible'
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

    // 1. Dialog background fades in
    tl.fromTo(
      dialog,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.45, ease: 'power2.out' },
      0
    )

    // 2. Picture panel morphs from thumbnail startRect to target full panel
    tl.fromTo(
      leftPanel,
      {
        position: 'fixed',
        left: initialRect.left,
        top: initialRect.top,
        width: initialRect.width,
        height: initialRect.height,
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 95,
      },
      {
        left: targetLeft,
        top: targetTop,
        width: targetWidth,
        height: targetHeight,
        borderRadius: 0,
        duration: 1.1,
        ease: 'power4.inOut',
      },
      0
    )

    // 3. Inner image scale unzooms from 1.18 to 1.0 (matching Codrops Transition)
    tl.fromTo(
      previewImg,
      { scale: 1.18 },
      { scale: 1.0, duration: 1.1, ease: 'power4.inOut' },
      0
    )

    // 4. Stagger in project details on the right column
    if (rightCol) {
      tl.fromTo(
        rightCol.children,
        { autoAlpha: 0, y: 26 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.04,
          ease: 'power3.out',
        },
        0.42
      )
    }

    timelineRef.current = tl
  }, [isOpen, project, startRect, dialogRef, backBtnRef, reset, onClose, startClose])

  // ESC key and focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        startClose()
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
  }, [isOpen, startClose, dialogRef])

  if (typeof document === 'undefined') return null

  const displayProj = renderedProject || project
  const isCompleted = displayProj?.status?.toLowerCase().includes('completed')

  return createPortal(
    <div
      id="project-detail-dialog"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={displayProj?.title || 'Project Details'}
      tabIndex={-1}
    >
      {/* Left Column: morphing preview image panel */}
      <div className="detail-left-panel" ref={leftPanelRef}>
        {displayProj && (
          <img
            ref={previewImgRef}
            src={displayProj.detailImage || displayProj.image}
            alt={displayProj.title}
            style={{
              objectPosition: displayProj.focus || '50% 50%',
            }}
          />
        )}
      </div>

      {/* Right Column: Project details, highlights, stack, links */}
      <div className="detail-right-column" ref={containerRef}>
        <div className="detail-header-row">
          <button
            ref={backBtnRef}
            type="button"
            className="detail-back-btn"
            onClick={startClose}
            aria-label="Back to projects (or press Escape)"
          >
            &larr; back [ESC]
          </button>

          {displayProj?.status && (
            <span
              className={`detail-status-badge ${
                isCompleted ? 'status-completed' : 'status-in-progress'
              }`}
            >
              <span className="status-dot" />
              {displayProj.status}
            </span>
          )}
        </div>

        <h2 className="detail-title">{displayProj?.title}</h2>

        <div className="detail-summary">{displayProj?.summary}</div>

        {displayProj?.highlights && displayProj.highlights.length > 0 && (
          <div className="detail-highlights">
            <h3 className="highlights-heading">Highlights</h3>
            <ul className="highlights-list">
              {displayProj.highlights.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {displayProj?.stack && displayProj.stack.length > 0 && (
          <div className="detail-stack">
            {displayProj.stack.map((tag) => (
              <span key={tag} className="stack-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="detail-links">
          {displayProj?.links && displayProj.links.length > 0 ? (
            displayProj.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="detail-link-btn"
              >
                {link.label} &rarr;
              </a>
            ))
          ) : (
            <span className="detail-empty-links">Project in active development</span>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ProjectDetail
