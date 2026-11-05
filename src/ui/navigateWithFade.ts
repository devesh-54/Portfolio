import type { NavigateFunction } from 'react-router-dom'

let overlayElement: HTMLDivElement | null = null

function getOrCreateOverlay(): HTMLDivElement {
  if (overlayElement && document.body.contains(overlayElement)) {
    return overlayElement
  }
  const el = document.createElement('div')
  el.id = 'route-fade-overlay'
  el.style.position = 'fixed'
  el.style.inset = '0'
  el.style.backgroundColor = '#f2f1ed'
  el.style.zIndex = '99999'
  el.style.pointerEvents = 'none'
  el.style.opacity = '0'
  el.style.transition = 'opacity 0.4s ease'
  document.body.appendChild(el)
  overlayElement = el
  return el
}

export function navigateWithFade(
  to: string,
  navigate: NavigateFunction,
  options?: { replace?: boolean }
) {
  if (typeof window === 'undefined') {
    navigate(to, options)
    return
  }

  // If already at target path, do nothing
  if (window.location.pathname === to) {
    return
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) {
    navigate(to, options)
    return
  }

  const overlay = getOrCreateOverlay()
  overlay.style.backgroundColor = to === '/' ? '#03050a' : '#f2f1ed'
  overlay.style.pointerEvents = 'auto'
  overlay.style.opacity = '1'

  setTimeout(() => {
    navigate(to, options)
    // Once route changes, fade overlay out
    setTimeout(() => {
      overlay.style.opacity = '0'
      setTimeout(() => {
        overlay.style.pointerEvents = 'none'
      }, 400)
    }, 50)
  }, 400)
}
