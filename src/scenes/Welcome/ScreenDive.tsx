import React, { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { heroProgress } from './heroProgress'
import settings from './camera-settings.json'
import { FLIGHT_CONFIG } from '../Projects/flightConfig'

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

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
  onWhiteWorldChange?: (isWhiteWorld: boolean) => void
  inHeroOverlayRef?: React.RefObject<HTMLDivElement | null>
  creditsRef?: React.RefObject<HTMLDivElement | null>
  scrollHintRef?: React.RefObject<HTMLDivElement | null>
  introEnded?: boolean
}

export function ScreenDive({
  screenMeshRef,
  externalPose,
  onDiveCompleteChange,
  onHandoverChange,
  onWhiteWorldChange,
  inHeroOverlayRef,
  creditsRef,
  scrollHintRef,
  introEnded = true,
}: ScreenDiveProps) {
  const { camera, size } = useThree()
  const isCompleteRef = useRef(false)
  const isCorridorRef = useRef(false)
  const isWhiteWorldRef = useRef(false)

  // Camera dive poses
  const startPosition = useRef(new THREE.Vector3(...settings.end.position)).current
  const startTarget = useRef(new THREE.Vector3(...settings.end.target)).current
  const finalPosition = useRef(new THREE.Vector3()).current
  const finalTarget = useRef(new THREE.Vector3()).current
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null)

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

  // Compute CatmullRom curve diving smoothly into the curved monitor
  const computePoseAndCurve = useCallback(() => {
    const mesh = screenMeshRef?.current
    if (!mesh || !mesh.geometry) return

    mesh.updateWorldMatrix(true, false)
    const geom = mesh.geometry
    const posAttr = geom.attributes.position
    const normAttr = geom.attributes.normal
    if (!posAttr) return

    const worldMat = mesh.matrixWorld
    const normalMat = new THREE.Matrix3().getNormalMatrix(worldMat)

    // Compute center C
    const worldBox = new THREE.Box3().setFromObject(mesh)
    const C = new THREE.Vector3()
    worldBox.getCenter(C)

    // Compute outward normal N (average of vertex normals in world coordinates)
    const N = new THREE.Vector3()
    if (normAttr) {
      const tempN = new THREE.Vector3()
      for (let i = 0; i < normAttr.count; i++) {
        tempN.fromBufferAttribute(normAttr, i).applyMatrix3(normalMat).normalize()
        N.add(tempN)
      }
      N.normalize()
    } else {
      N.set(0, 0, 1).applyMatrix3(normalMat).normalize()
    }

    // Ensure N points toward the viewer (start camera position)
    const toStart = startPosition.clone().sub(C)
    if (N.dot(toStart) < 0) {
      N.negate()
    }

    const worldUp = new THREE.Vector3(0, 1, 0)
    const R = new THREE.Vector3().crossVectors(worldUp, N).normalize()
    const U = new THREE.Vector3().crossVectors(N, R).normalize()

    // Project bbox / vertices onto screen's R and U plane
    let minR = Infinity, maxR = -Infinity
    let minU = Infinity, maxU = -Infinity
    const tempV = new THREE.Vector3()

    for (let i = 0; i < posAttr.count; i++) {
      tempV.fromBufferAttribute(posAttr, i).applyMatrix4(worldMat)
      const rel = tempV.sub(C)
      const projR = rel.dot(R)
      const projU = rel.dot(U)
      if (projR < minR) minR = projR
      if (projR > maxR) maxR = projR
      if (projU < minU) minU = projU
      if (projU > maxU) maxU = projU
    }

    const Wq = Math.max(0.1, maxR - minR)
    const Hq = Math.max(0.1, maxU - minU)

    const aspect = size.width / Math.max(size.height, 1)
    const fov = (camera as THREE.PerspectiveCamera).fov || 35
    const halfFovRad = THREE.MathUtils.degToRad(fov / 2)
    const tanHalfFov = Math.tan(halfFovRad)

    // d = min( Hq / (2 * tan(fov/2)), Wq / (2 * tan(fov/2) * aspect) ) * 0.90
    // Camera fills 100% of the viewport with the black OLED screen
    const d = Math.min(Hq / (2 * tanHalfFov), Wq / (2 * tanHalfFov * aspect)) * 0.90

    finalPosition.copy(C).addScaledVector(N, d)
    finalTarget.copy(C)

    // Start-to-target distance
    const dist = startPosition.distanceTo(startTarget)
    const forward = finalPosition.clone().sub(startPosition).normalize()
    const side = new THREE.Vector3().crossVectors(worldUp, forward).normalize()

    // Midpoint offset sideways and slightly up by 15% of start-to-target distance
    const midpoint = new THREE.Vector3().lerpVectors(startPosition, finalPosition, 0.5)
    midpoint.addScaledVector(side, 0.15 * dist)
    midpoint.addScaledVector(worldUp, 0.05 * dist)

    curveRef.current = new THREE.CatmullRomCurve3(
      [startPosition.clone(), midpoint, finalPosition.clone()],
      false,
      'centripetal'
    )
  }, [screenMeshRef, camera, size.width, size.height, startPosition, startTarget, finalPosition, finalTarget])

  useEffect(() => {
    computePoseAndCurve()
  }, [computePoseAndCurve])

  // Pure function of scroll progress setting camera pose
  const applyHeroState = useCallback(
    (p: number, delta: number, pointer?: { x: number; y: number }) => {
      const streamStart = FLIGHT_CONFIG.STREAM_START_P
      const handover = FLIGHT_CONFIG.HANDOVER_P
      const isCorridor = p >= streamStart
      const isWhiteWorld = p >= handover

      // Threshold crossing for Handover / Corridor
      if (isCorridor !== isCorridorRef.current) {
        isCorridorRef.current = isCorridor
        onHandoverChange?.(isCorridor)
        onDiveCompleteChange?.(isCorridor)
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = isCorridor ? 60 : 35
          camera.updateProjectionMatrix()
        }
      }

      // Threshold crossing for White Projects World
      if (isWhiteWorld !== isWhiteWorldRef.current) {
        isWhiteWorldRef.current = isWhiteWorld
        onWhiteWorldChange?.(isWhiteWorld)
      }

      if (!isCorridor) {
        // --- PHASE A: Dive into Monitor (p in [0, streamStart]) ---
        if (!curveRef.current) {
          computePoseAndCurve()
        }

        const u = Math.min(1, Math.max(0, p / streamStart))
        const e = easeInOutCubic(u)

        if (curveRef.current) {
          curveRef.current.getPoint(e, tempPos)
          tempTarget.lerpVectors(startTarget, finalTarget, e)
        } else {
          tempPos.copy(startPosition)
          tempTarget.copy(startTarget)
        }

        // Smooth cursor parallax on the desk room (scaled down as dive approaches screen)
        if (pointer) {
          const eParallax = Math.max(0, 1 - e)
          cursorGoal.set(pointer.x, pointer.y, 0).multiplyScalar(0.35)
          const dFollow = THREE.MathUtils.damp(0, 1, 3, delta)
          cursorOffset.lerp(cursorGoal, dFollow)

          cursorRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
          cursorUp.set(0, 1, 0).applyQuaternion(camera.quaternion)

          tempPos.addScaledVector(cursorRight, cursorOffset.x * eParallax)
          tempPos.addScaledVector(cursorUp, cursorOffset.y * eParallax)
        }

        // Camera Pose ownership
        if (introEnded || p > 0.001) {
          externalPose.current.active = true
        }
        externalPose.current.position.copy(tempPos)
        externalPose.current.target.copy(tempTarget)
        externalPose.current.e = e
      } else if (p < handover) {
        // --- PHASE A->B: 3D Streaming Cards Bridge (p in [streamStart, handover]) ---
        // Camera holds steady at corridor origin, looking down the depth tunnel as 3D blocks fly past
        tempPos.set(0, FLIGHT_CONFIG.CAMERA_Y, 8.0)
        tempTarget.set(0, FLIGHT_CONFIG.CAMERA_Y, -20.0)

        externalPose.current.active = true
        externalPose.current.position.copy(tempPos)
        externalPose.current.target.copy(tempTarget)
        externalPose.current.e = 1.0
      } else {
        // --- PHASE B: Selected Work Depth Flythrough (calibrated to end cleanly after last project) ---
        const DEPTH = FLIGHT_CONFIG.DEPTH || 126.0
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
      finalTarget,
      computePoseAndCurve,
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
    if (!curveRef.current) {
      computePoseAndCurve()
    }
    // Lenis is the single source of truth for smoothed scroll progress
    const p = heroProgress.get()
    applyHeroState(p, delta, pointer)
  })

  return null
}

export default ScreenDive
