import React, { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { heroProgress } from './heroProgress'
import settings from './camera-settings.json'
import { FLIGHT_CONFIG } from '../Projects/flightConfig'

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

export interface ExternalPose {
  active: boolean
  position: THREE.Vector3
  target: THREE.Vector3
  e?: number
}

export interface ScreenDiveProps {
  screenMeshRef?: React.RefObject<THREE.Mesh | null>
  externalPose: React.MutableRefObject<ExternalPose>
  onDiveCompleteChange?: (completed: boolean) => void
  onHandoverChange?: (isCorridor: boolean) => void
  inHeroOverlayRef?: React.RefObject<HTMLDivElement | null>
  creditsRef?: React.RefObject<HTMLDivElement | null>
  scrollHintRef?: React.RefObject<HTMLDivElement | null>
  introEnded?: boolean
}

export function ScreenDive({
  externalPose,
  onDiveCompleteChange,
  onHandoverChange,
  inHeroOverlayRef,
  creditsRef,
  scrollHintRef,
  introEnded = true,
}: ScreenDiveProps) {
  const { camera } = useThree()
  const isCompleteRef = useRef(false)
  const isCorridorRef = useRef(false)

  // Natural wide viewing pose of the settled desk room (no zoom into monitor)
  const startPosition = useRef(new THREE.Vector3(...settings.end.position)).current
  const startTarget = useRef(new THREE.Vector3(...settings.end.target)).current

  const tempPos = useRef(new THREE.Vector3()).current
  const tempTarget = useRef(new THREE.Vector3()).current

  // Cursor parallax refs
  const cursorGoal = useRef(new THREE.Vector3()).current
  const cursorOffset = useRef(new THREE.Vector3()).current
  const cursorRight = useRef(new THREE.Vector3()).current
  const cursorUp = useRef(new THREE.Vector3()).current

  // Camera near plane
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = 0.05
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // Pure function of scroll progress setting camera pose
  const applyHeroState = useCallback(
    (p: number, delta: number, pointer?: { x: number; y: number }) => {
      const handover = FLIGHT_CONFIG.HANDOVER_P
      const isCorridor = p >= handover

      // Threshold crossing for Handover
      if (isCorridor !== isCorridorRef.current) {
        isCorridorRef.current = isCorridor
        onHandoverChange?.(isCorridor)
        onDiveCompleteChange?.(isCorridor)
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = isCorridor ? 60 : 35
          camera.updateProjectionMatrix()
        }
      }

      if (!isCorridor) {
        // --- PHASE A: Welcome desk room settled view (steady wide angle, NO zoom into monitor) ---
        tempPos.copy(startPosition)
        tempTarget.copy(startTarget)

        // Smooth cursor parallax on the desk room
        if (pointer) {
          cursorGoal.set(pointer.x, pointer.y, 0).multiplyScalar(0.35)
          const dFollow = THREE.MathUtils.damp(0, 1, 3, delta)
          cursorOffset.lerp(cursorGoal, dFollow)

          cursorRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
          cursorUp.set(0, 1, 0).applyQuaternion(camera.quaternion)

          tempPos.addScaledVector(cursorRight, cursorOffset.x)
          tempPos.addScaledVector(cursorUp, cursorOffset.y)
        }

        // Camera Pose ownership
        if (introEnded || p > 0.001) {
          externalPose.current.active = true
        }
        externalPose.current.position.copy(tempPos)
        externalPose.current.target.copy(tempTarget)
        externalPose.current.e = 0
      } else {
        // --- PHASE B: Selected Work Depth Flythrough (from user's reference code) ---
        const DEPTH = 150.0
        const flightP = Math.max(0, Math.min(1.0, (p - handover) / (1 - handover)))
        const camZ = 8.0 - flightP * (DEPTH + 10.0)
        const camX = Math.sin(flightP * 6.0) * 0.6
        const camY = Math.sin(flightP * 4.0) * 0.3

        tempPos.set(camX, FLIGHT_CONFIG.CAMERA_Y + camY, camZ)
        tempTarget.set(camX * 0.5, FLIGHT_CONFIG.CAMERA_Y + camY * 0.5, camZ - 20.0)

        externalPose.current.active = true
        externalPose.current.position.copy(tempPos)
        externalPose.current.target.copy(tempTarget)
        externalPose.current.e = 1.0
      }

      if (inHeroOverlayRef?.current) {
        inHeroOverlayRef.current.style.opacity = '0'
      }

      // Track completion
      const completed = p >= 0.95
      if (completed !== isCompleteRef.current) {
        isCompleteRef.current = completed
      }

      // Hint & Credits
      const rawProgress = heroProgress.get()
      if (scrollHintRef?.current) {
        const showHint = rawProgress < 0.04 && introEnded
        scrollHintRef.current.style.opacity = showHint ? '0.9' : '0'
        scrollHintRef.current.style.transform = `translateX(-50%) translateY(${showHint ? '0px' : '8px'})`
      }

      if (creditsRef?.current) {
        const creditsOpacity = Math.max(0, Math.min(1, 1 - smoothstep(0.04, 0.15, p)))
        creditsRef.current.style.opacity = creditsOpacity.toFixed(4)
        creditsRef.current.style.pointerEvents = creditsOpacity < 0.01 ? 'none' : 'auto'
      }

      // Dev debug telemetry
      heroProgress.debug.rawProgress = rawProgress
      heroProgress.debug.smoothedP = p
      heroProgress.debug.flightP = isCorridor ? (p - handover) / (1 - handover) : 0
      heroProgress.debug.e = !isCorridor ? p / handover : 1
      heroProgress.debug.externalPoseActive = externalPose.current.active
      heroProgress.debug.cameraPos = [
        +camera.position.x.toFixed(3),
        +camera.position.y.toFixed(3),
        +camera.position.z.toFixed(3),
      ]
    },
    [
      camera,
      introEnded,
      startPosition,
      startTarget,
      onDiveCompleteChange,
      onHandoverChange,
      externalPose,
      inHeroOverlayRef,
      creditsRef,
      scrollHintRef,
      cursorGoal,
      cursorOffset,
      cursorRight,
      cursorUp,
      tempPos,
      tempTarget,
    ]
  )

  useFrame(({ pointer }, delta) => {
    // Lenis is the single source of truth for smoothed scroll progress
    const p = heroProgress.get()
    applyHeroState(p, delta, pointer)
  })

  return null
}

export default ScreenDive
