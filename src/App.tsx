import { useState, useEffect, useCallback } from 'react'
import { WelcomeScene } from './scenes/Welcome/WelcomeScene'
import { Overlay } from './ui/Overlay'
import './styles/global.css'

export function App() {
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

  // Check session storage to play intro once per session (support ?replay=1 to force replay)
  const [isReturningVisitor, setIsReturningVisitor] = useState(false)
  useEffect(() => {
    const isForceReplay = window.location.search.includes('replay=1') || window.location.search.includes('reset=1')
    if (isForceReplay) {
      sessionStorage.removeItem('devesh_portfolio_visited')
      setIsReturningVisitor(false)
      return
    }
    const visited = sessionStorage.getItem('devesh_portfolio_visited') === 'true'
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
    sessionStorage.setItem('devesh_portfolio_visited', 'true')
  }, [])

  // Skip intro click callback
  const handleSkipIntro = useCallback(() => {
    setIsSkipped(true)
    setIntroActive(false)
    setIntroComplete(true)
    sessionStorage.setItem('devesh_portfolio_visited', 'true')
  }, [])

  // Reset view callback
  const [resetTrigger, setResetTrigger] = useState(0)
  const handleResetView = useCallback(() => {
    setResetTrigger((c) => c + 1)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D Welcome Canvas Scene */}
      <WelcomeScene
        startIntro={startIntro}
        isSkipped={isSkipped}
        reducedMotion={reducedMotion || isReturningVisitor}
        resetTrigger={resetTrigger}
        onSceneReady={() => setSceneReady(true)}
        onIntroComplete={handleIntroComplete}
        onWaypointChange={(index) => setActiveWaypoint(index)}
      />

      {/* GSAP HTML Overlay */}
      <Overlay
        sceneReady={sceneReady}
        introActive={introActive}
        introComplete={introComplete}
        activeWaypoint={activeWaypoint}
        onStartIntro={handleStartIntro}
        onSkipIntro={handleSkipIntro}
        onResetView={handleResetView}
        reducedMotion={reducedMotion}
        isReturningVisitor={isReturningVisitor}
      />
    </div>
  )
}

export default App
