import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProjectsScene } from '../scenes/Projects/ProjectsScene'
import { ProjectsOverlay } from '../ui/ProjectsOverlay'
import { SiteNav } from '../ui/SiteNav'
import { navigateWithFade } from '../ui/navigateWithFade'

export function Projects() {
  const navigate = useNavigate()
  const [sceneReady, setSceneReady] = useState(false)
  const [startIntro, setStartIntro] = useState(false)
  const [introActive, setIntroActive] = useState(false)
  const [introComplete, setIntroComplete] = useState(false)
  const [activeWaypoint, setActiveWaypoint] = useState(0)
  const [isSkipped, setIsSkipped] = useState(false)

  // Check prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(motionQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    motionQuery.addEventListener('change', handleChange)
    return () => motionQuery.removeEventListener('change', handleChange)
  }, [])

  // Check session storage to play intro once per session (key: projectsIntroPlayed)
  const [isReturningVisitor, setIsReturningVisitor] = useState(false)
  useEffect(() => {
    const isForceReplay = window.location.search.includes('replay=1') || window.location.search.includes('reset=1')
    if (isForceReplay) {
      sessionStorage.removeItem('projectsIntroPlayed')
      setIsReturningVisitor(false)
      return
    }
    const visited = sessionStorage.getItem('projectsIntroPlayed') === 'true'
    if (visited) {
      setIsReturningVisitor(true)
    }
  }, [])

  // Start intro callback (from loader)
  const handleStartIntro = useCallback(() => {
    if (isReturningVisitor || reducedMotion) {
      setIntroActive(false)
      setIntroComplete(true)
      return
    }
    setStartIntro(true)
    setIntroActive(true)
  }, [isReturningVisitor, reducedMotion])

  // Intro completion callback
  const handleIntroComplete = useCallback(() => {
    setIntroActive(false)
    setIntroComplete(true)
    sessionStorage.setItem('projectsIntroPlayed', 'true')
  }, [])

  // Skip intro click callback
  const handleSkipIntro = useCallback(() => {
    setIsSkipped(true)
    setIntroActive(false)
    setIntroComplete(true)
    sessionStorage.setItem('projectsIntroPlayed', 'true')
  }, [])

  // Reset view callback
  const [resetTrigger, setResetTrigger] = useState(0)
  const handleResetView = useCallback(() => {
    setResetTrigger((c) => c + 1)
  }, [])

  const handleBack = useCallback(() => {
    navigateWithFade('/', navigate)
  }, [navigate])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D Projects Canvas Scene */}
      <ProjectsScene
        startIntro={startIntro}
        isSkipped={isSkipped}
        reducedMotion={reducedMotion || isReturningVisitor}
        resetTrigger={resetTrigger}
        onSceneReady={() => setSceneReady(true)}
        onIntroComplete={handleIntroComplete}
        onWaypointChange={(index) => setActiveWaypoint(index)}
      />

      {/* GSAP HTML Projects Overlay */}
      <ProjectsOverlay
        sceneReady={sceneReady}
        introActive={introActive}
        introComplete={introComplete}
        activeWaypoint={activeWaypoint}
        onStartIntro={handleStartIntro}
        onSkipIntro={handleSkipIntro}
        onResetView={handleResetView}
        onBack={handleBack}
        reducedMotion={reducedMotion}
        isReturningVisitor={isReturningVisitor}
      />

      <SiteNav variant="compact" />
    </div>
  )
}

export default Projects
