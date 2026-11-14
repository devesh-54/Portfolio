import { useState, useEffect } from 'react'
import './FullscreenToggle.css'

export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [isFirstPage, setIsFirstPage] = useState(true)

  useEffect(() => {
    // Only show on the first page (Hero / Welcome scene)
    const checkFirstPage = () => {
      const hash = window.location.hash
      const isHeroHash = !hash || hash === '#' || hash === '#welcome' || hash === '#hero'
      const isTop = window.scrollY < 80
      setIsFirstPage(isHeroHash && isTop)
    }

    checkFirstPage()
    window.addEventListener('scroll', checkFirstPage, { passive: true })
    window.addEventListener('hashchange', checkFirstPage)
    return () => {
      window.removeEventListener('scroll', checkFirstPage)
      window.removeEventListener('hashchange', checkFirstPage)
    }
  }, [])

  useEffect(() => {
    // Check if fullscreen API is available in current environment
    const supported = Boolean(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    )
    setIsSupported(supported)

    const handleFullscreenChange = () => {
      const active = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(active)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  if (!isSupported) {
    return null
  }

  const toggleFullscreen = async () => {
    try {
      const doc = document as any
      const docEl = document.documentElement as any

      if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen()
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen()
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen()
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen()
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen()
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen()
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err)
    }
  }

  return (
    <button
      type="button"
      className={`fullscreen-toggle-btn ${isFullscreen ? 'is-active' : ''} ${!isFirstPage ? 'is-hidden' : ''}`}
      onClick={toggleFullscreen}
      title={isFullscreen ? 'Exit Fullscreen (Esc / F11)' : 'View Portfolio in Fullscreen (F11)'}
      aria-label={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
    >
      <span className="fullscreen-toggle-icon">
        {isFullscreen ? (
          /* Compress / Exit Fullscreen icon */
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        ) : (
          /* Expand / Enter Fullscreen icon */
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        )}
      </span>
      <span className="fullscreen-toggle-label">
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </span>
    </button>
  )
}

export default FullscreenToggle

