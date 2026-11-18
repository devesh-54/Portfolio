import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { CINEMATIC_EVENTS } from '../../ui/CinematicTransition'

/**
 * CinematicMonitorDive (R3F Component)
 *
 * Handles:
 * 1. Listening to click events (via custom event / direct trigger)
 * 2. GSAP camera zoom targeting the 3D curved monitor screen center with Power4.easeIn
 * 3. Scaling up the monitor mesh slightly during zoom to simulate physical proximity
 * 4. Dispatching glass-shatter and blinding-flash events at calibrated milestones
 */
export function CinematicMonitorDive({
  screenMeshRef,
  monitorGroupRef,
  externalPose,
  responsiveScale = 1.0,
  onTransitionStart,
  onTransitionEnd,
}) {
  const { camera } = useThree()
  const isZoomingRef = useRef(false)
  const animProxyRef = useRef({ t: 0, scaleMult: 1.0 })
  const tweenRef = useRef(null)

  useEffect(() => {
    const handleTrigger = () => {
      if (isZoomingRef.current) return
      isZoomingRef.current = true

      onTransitionStart?.()

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (reducedMotion) {
        // Skip 3D zoom under reduced motion
        return
      }

      // 1. Calculate monitor screen center C in world coordinates
      const C = new THREE.Vector3(-1.95, 1.04, -1.2)
      if (screenMeshRef?.current) {
        screenMeshRef.current.updateWorldMatrix(true, false)
        const box = new THREE.Box3().setFromObject(screenMeshRef.current)
        box.getCenter(C)
      } else if (monitorGroupRef?.current) {
        monitorGroupRef.current.updateWorldMatrix(true, false)
        const box = new THREE.Box3().setFromObject(monitorGroupRef.current)
        box.getCenter(C)
      }

      // 2. Start pose
      const startPos = camera.position.clone()
      const startTarget = externalPose?.current?.target
        ? externalPose.current.target.clone()
        : new THREE.Vector3(0, 0.85, -0.5)

      // 3. End pose: straight into the monitor screen center
      const toCenter = new THREE.Vector3().subVectors(C, startPos).normalize()
      // Pierces right into the monitor display
      const endPos = C.clone().addScaledVector(toCenter, -0.05)

      animProxyRef.current.t = 0
      animProxyRef.current.scaleMult = 1.0

      // Dispatch milestones
      const tShatter = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(CINEMATIC_EVENTS.SHATTER))
      }, 450)

      const tFlash = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(CINEMATIC_EVENTS.FLASH))
      }, 900)

      const tSwap = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(CINEMATIC_EVENTS.SWAP))
      }, 1300)

      // GSAP aggressive exponential zoom (Power4.easeIn / power4.in)
      tweenRef.current = gsap.to(animProxyRef.current, {
        t: 1,
        scaleMult: 1.18, // Simultaneously scale up the monitor mesh slightly to simulate physical proximity
        duration: 1.1,
        ease: 'power4.in',
        onUpdate: () => {
          const t = animProxyRef.current.t
          const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, t)
          const currentTarget = new THREE.Vector3().lerpVectors(startTarget, C, t)

          if (externalPose?.current) {
            externalPose.current.active = true
            externalPose.current.position.copy(currentPos)
            externalPose.current.target.copy(currentTarget)
          }

          camera.position.copy(currentPos)
          camera.lookAt(currentTarget)

          // Scale monitor mesh
          if (monitorGroupRef?.current) {
            const base = responsiveScale || 1.0
            monitorGroupRef.current.scale.setScalar(base * animProxyRef.current.scaleMult)
          }
        },
        onComplete: () => {
          onTransitionEnd?.()
        },
      })

      return () => {
        window.clearTimeout(tShatter)
        window.clearTimeout(tFlash)
        window.clearTimeout(tSwap)
      }
    }

    window.addEventListener(CINEMATIC_EVENTS.TRIGGER, handleTrigger)

    return () => {
      window.removeEventListener(CINEMATIC_EVENTS.TRIGGER, handleTrigger)
      if (tweenRef.current) tweenRef.current.kill()
    }
  }, [
    camera,
    screenMeshRef,
    monitorGroupRef,
    externalPose,
    responsiveScale,
    onTransitionStart,
    onTransitionEnd,
  ])

  // Continuous frame lock during zoom
  useFrame(() => {
    if (!isZoomingRef.current) return
    if (externalPose?.current?.active) {
      camera.position.copy(externalPose.current.position)
      camera.lookAt(externalPose.current.target)
    }
  })

  return null
}

export default CinematicMonitorDive

