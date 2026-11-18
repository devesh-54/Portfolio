import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

const FADE_MS = 350        // matches the .loader opacity transition
const READY_GRACE_MS = 350 // max wait after sceneReady if useProgress().active gets stuck
const MAX_WAIT_MS = 4000   // absolute safety cap so the loader can never hang indefinitely

/**
 * Dark screen with a cyan progress line. Shows download progress and fades out smoothly
 * as soon as the 3D scene mounts (`ready`), with safety guards against stalled Drei
 * DefaultLoadingManager `active` flags or parent re-renders cancelling the timer.
 */
export function Loader({ ready, onHidden, onTransitionEnd }) {
  const { active, progress } = useProgress()
  const [gone, setGone] = useState(false)
  const [forcedDone, setForcedDone] = useState(false)

  const onHiddenRef = useRef(onHidden)
  const onTransitionEndRef = useRef(onTransitionEnd)
  onHiddenRef.current = onHidden
  onTransitionEndRef.current = onTransitionEnd

  const finishedRef = useRef(false)

  // If the 3D scene is ready (Suspense resolved), don't let a stale `active` flag block fade-out
  useEffect(() => {
    if (!ready) return
    const id = setTimeout(() => setForcedDone(true), READY_GRACE_MS)
    return () => clearTimeout(id)
  }, [ready])

  // Absolute safety cap in case a loader worker stalls on first visit
  useEffect(() => {
    const id = setTimeout(() => setForcedDone(true), MAX_WAIT_MS)
    return () => clearTimeout(id)
  }, [])

  const done = forcedDone || (ready && (!active || progress >= 99))

  useEffect(() => {
    if (!done || finishedRef.current) return
    const id = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      setGone(true)
      onHiddenRef.current?.()
      onTransitionEndRef.current?.()
    }, FADE_MS)
    return () => clearTimeout(id)
  }, [done])

  if (gone) return null
  return (
    <div
      className={`loader${done ? ' loader--done' : ''}`}
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={done ? 100 : Math.round(progress)}
    >
      <div className="loader-track">
        <div className="loader-line" style={{ transform: `scaleX(${done ? 1 : Math.max(0.08, progress / 100)})` }} />
      </div>
    </div>
  )
}
