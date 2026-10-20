import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useControls, folder, button } from 'leva'
import initialSettings from './camera-settings.json'

// ============================================================================
// CAMERA RIG CONFIGURATION & EASINGS
// ============================================================================

export interface Waypoint {
  name?: string
  position: [number, number, number]
  target: [number, number, number]
  enabled: boolean
}

export interface CameraSettings {
  waypoints: Waypoint[]
  end: {
    position: [number, number, number]
    target: [number, number, number]
  }
  introDuration: number
  easing: string
  pathMode: 'spline' | 'lerp'
  zoomMin: number
  zoomMax: number
  cursorIntensity: number
  cursorSmoothing: number
}

const EASINGS = {
  easeInOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  linear: (t: number) => t,
}

const roundCoords = (coords: number[]) => coords.map((v) => Number(v.toFixed(2)))

function downloadJSON(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

interface CameraRigProps {
  start?: boolean
  onReady?: () => void
  onIntroComplete?: () => void
  onWaypointChange?: (index: number) => void
  isSkipped?: boolean
  reducedMotion?: boolean
  resetTrigger?: number
}

function remapSplineProgress(t: number): { k: number; activeIndex: number } {
  const clampedT = Math.max(0, Math.min(1, t))

  // Dwell 1: Python (featured 1)
  if (clampedT < 0.18) {
    const p = clampedT / 0.18
    return { k: EASINGS.easeInOut(p) * 0.24, activeIndex: -1 }
  } else if (clampedT < 0.25) {
    const p = (clampedT - 0.18) / 0.07
    return { k: 0.24 + p * 0.02, activeIndex: 0 }
  }
  // Transition 1 -> 2
  else if (clampedT < 0.44) {
    const p = (clampedT - 0.25) / 0.19
    return { k: 0.26 + EASINGS.easeInOut(p) * 0.23, activeIndex: clampedT < 0.27 ? 0 : -1 }
  }
  // Dwell 2: React (featured 2)
  else if (clampedT < 0.51) {
    const p = (clampedT - 0.44) / 0.07
    return { k: 0.49 + p * 0.02, activeIndex: 1 }
  }
  // Transition 2 -> 3
  else if (clampedT < 0.70) {
    const p = (clampedT - 0.51) / 0.19
    return { k: 0.51 + EASINGS.easeInOut(p) * 0.23, activeIndex: clampedT < 0.53 ? 1 : -1 }
  }
  // Dwell 3: Flutter (featured 3)
  else if (clampedT < 0.77) {
    const p = (clampedT - 0.70) / 0.07
    return { k: 0.74 + p * 0.02, activeIndex: 2 }
  }
  // Transition 3 -> End Shot
  else {
    const p = (clampedT - 0.77) / 0.23
    return { k: 0.76 + EASINGS.easeInOut(p) * 0.24, activeIndex: clampedT < 0.79 ? 2 : -1 }
  }
}

/**
 * CameraRig Component
 *
 * Implements a cinematic camera system with featured logo zoom-ins
 * and seamless transition to full 360-degree free orbit exploration.
 */
export function CameraRig({
  start = false,
  onReady,
  onIntroComplete,
  onWaypointChange,
  isSkipped = false,
  reducedMotion = false,
  resetTrigger = 0,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  // Runtime flythrough state stored in refs to avoid React re-renders in useFrame
  const introState = useRef<{
    active: boolean
    t: number // 0 to 1
    duration: number
    positions: THREE.Vector3[]
    targets: THREE.Vector3[]
    posCurve: THREE.CatmullRomCurve3
    targetCurve: THREE.CatmullRomCurve3
    currentWaypointIndex: number
  } | null>(null)

  // Skip easing state for smooth jump when user clicks "Skip intro"
  const skipState = useRef<{
    active: boolean
    progress: number
    startPos: THREE.Vector3
    startTarget: THREE.Vector3
    endPos: THREE.Vector3
    endTarget: THREE.Vector3
  } | null>(null)

  // Reset view state (1.2s ease back to wide end shot)
  const resetState = useRef<{
    active: boolean
    progress: number
    startPos: THREE.Vector3
    startTarget: THREE.Vector3
    endPos: THREE.Vector3
    endTarget: THREE.Vector3
  } | null>(null)

  // Cursor parallax vectors
  const cursorRef = useRef({
    offset: new THREE.Vector3(),
    goal: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
  })

  // Performance FPS tracking during flythrough
  const perfTrackerRef = useRef<number[]>([])

  // Leva controls state
  const [showLeva, setShowLeva] = useState(false)
  const actionsRef = useRef<{
    play: () => void
    skip: () => void
    log: () => void
    export: () => void
  }>({
    play: () => {},
    skip: () => {},
    log: () => {},
    export: () => {},
  })

  // Toggle Leva panel with "L" key, log view with "W" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key.toLowerCase() === 'l') {
        setShowLeva((prev) => !prev)
      } else if (e.key.toLowerCase() === 'w') {
        actionsRef.current.log()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Helper to extract current camera position and target excluding parallax offset
  const getCurrentView = useCallback(() => {
    const purePos = camera.position.clone().sub(cursorRef.current.offset)
    const target = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3()
    return {
      position: roundCoords(purePos.toArray()),
      target: roundCoords(target.toArray()),
    }
  }, [camera])

  // Leva Tuning Controls (hidden unless toggled with "L")
  const waypointSchemaEntries = initialSettings.waypoints.map((wp, index) => [
    `Waypoint ${index + 1} (${wp.name || 'Point'})`,
    folder(
      {
        [`wp_${index}_enabled`]: { value: wp.enabled, label: 'Enabled' } as any,
        [`wp_${index}_pos`]: { value: wp.position, step: 0.1, label: 'Position' } as any,
        [`wp_${index}_target`]: { value: wp.target, step: 0.1, label: 'Target' } as any,
        [`Set Point ${index + 1} from View`]: button(() => {
          const view = getCurrentView()
          setLevaConfig({
            [`wp_${index}_pos`]: view.position,
            [`wp_${index}_target`]: view.target,
          })
        }),
      },
      { collapsed: true }
    ),
  ])

  const [levaConfig, setLevaConfig] = useControls(
    'PS1 Camera Rig Tuner',
    () => ({
      endPosition: { value: initialSettings.end.position, step: 0.1, label: 'End Position [x,y,z]' } as any,
      endTarget: { value: initialSettings.end.target, step: 0.1, label: 'End Target [x,y,z]' } as any,
      'Log View (W)': button(() => actionsRef.current.log()),
      'Set Current View as End': button(() => {
        const view = getCurrentView()
        setLevaConfig({ endPosition: view.position, endTarget: view.target })
      }),
      'Export camera-settings.json': button(() => actionsRef.current.export()),
      'Replay Intro': button(() => actionsRef.current.play()),
      IntroMotion: folder({
        introDuration: { value: initialSettings.introDuration, min: 3, max: 25, step: 0.5, label: 'Duration (s)' },
        pathMode: { value: initialSettings.pathMode, options: ['spline', 'lerp'], label: 'Path Mode' },
        easing: { value: initialSettings.easing, options: ['easeInOut', 'easeOut', 'linear'], label: 'Easing' },
      }),
      Parallax: folder({
        cursorIntensity: { value: initialSettings.cursorIntensity, min: 0, max: 1.5, step: 0.05, label: 'Parallax Amount' },
        cursorSmoothing: { value: initialSettings.cursorSmoothing, min: 0.5, max: 8.0, step: 0.1, label: 'Parallax Smoothness' },
        zoomMin: { value: initialSettings.zoomMin, min: 1, max: 8, step: 0.5, label: 'Min Distance' },
        zoomMax: { value: initialSettings.zoomMax, min: 8, max: 30, step: 0.5, label: 'Max Distance' },
      }),
      Waypoints: folder(Object.fromEntries(waypointSchemaEntries), { collapsed: true }),
    }),
    { render: () => showLeva }
  ) as unknown as [Record<string, any>, (values: Record<string, any>) => void]

  // Construct current path stops from Leva controls or JSON defaults
  const buildStops = useCallback(() => {
    const positions: THREE.Vector3[] = []
    const targets: THREE.Vector3[] = []

    initialSettings.waypoints.forEach((wp, index) => {
      const isEnabled = levaConfig[`wp_${index}_enabled`] ?? wp.enabled
      if (isEnabled) {
        const p = (levaConfig[`wp_${index}_pos`] as [number, number, number]) || wp.position
        const t = (levaConfig[`wp_${index}_target`] as [number, number, number]) || wp.target
        positions.push(new THREE.Vector3().fromArray(p))
        targets.push(new THREE.Vector3().fromArray(t))
      }
    })

    // Final end position
    const endPos = (levaConfig.endPosition as [number, number, number]) || initialSettings.end.position
    const endTgt = (levaConfig.endTarget as [number, number, number]) || initialSettings.end.target
    positions.push(new THREE.Vector3().fromArray(endPos))
    targets.push(new THREE.Vector3().fromArray(endTgt))

    return {
      positions,
      targets,
      posCurve: new THREE.CatmullRomCurve3(positions, false, 'centripetal'),
      targetCurve: new THREE.CatmullRomCurve3(targets, false, 'centripetal'),
    }
  }, [levaConfig])

  // Sample the route at progress k (0..1)
  const samplePath = useCallback(
    (stops: ReturnType<typeof buildStops>, k: number, outPos: THREE.Vector3, outTarget: THREE.Vector3) => {
      const mode = levaConfig.pathMode || initialSettings.pathMode
      const clampedK = Math.max(0, Math.min(1, k))

      if (mode === 'spline') {
        // Spline mode: centripetal CatmullRom curve
        stops.posCurve.getPoint(clampedK, outPos)
        stops.targetCurve.getPoint(clampedK, outTarget)
        return
      }

      // Mode: segment-by-segment lerp with ease-in-out on each leg
      const legs = stops.positions.length - 1
      if (legs <= 0) {
        outPos.copy(stops.positions[0])
        outTarget.copy(stops.targets[0])
        return
      }

      const scaled = clampedK * legs
      const leg = Math.min(Math.floor(scaled), legs - 1)
      const localT = scaled - leg
      const easeFn = EASINGS[levaConfig.easing as keyof typeof EASINGS] || EASINGS.easeInOut
      const easedLocalT = easeFn(localT)

      outPos.lerpVectors(stops.positions[leg], stops.positions[leg + 1], easedLocalT)
      outTarget.lerpVectors(stops.targets[leg], stops.targets[leg + 1], easedLocalT)
    },
    [levaConfig.pathMode, levaConfig.easing]
  )

  // Configure actions
  actionsRef.current = {
    play: () => {
      cursorRef.current.offset.set(0, 0, 0)
      perfTrackerRef.current = []
      const stops = buildStops()
      if (controlsRef.current) {
        controlsRef.current.enabled = false
      }
      samplePath(stops, 0, camera.position, controlsRef.current ? controlsRef.current.target : new THREE.Vector3())
      if (controlsRef.current) controlsRef.current.update()

      introState.current = {
        active: true,
        t: 0,
        duration: levaConfig.introDuration || initialSettings.introDuration,
        positions: stops.positions,
        targets: stops.targets,
        posCurve: stops.posCurve,
        targetCurve: stops.targetCurve,
        currentWaypointIndex: -1,
      }
    },
    skip: () => {
      if (!introState.current?.active && !controlsRef.current) return
      introState.current = null

      const endPos = new THREE.Vector3().fromArray(
        (levaConfig.endPosition as [number, number, number]) || initialSettings.end.position
      )
      const endTgt = new THREE.Vector3().fromArray(
        (levaConfig.endTarget as [number, number, number]) || initialSettings.end.target
      )

      if (reducedMotion) {
        camera.position.copy(endPos)
        if (controlsRef.current) {
          controlsRef.current.target.copy(endTgt)
          controlsRef.current.enabled = true
          controlsRef.current.update()
        }
        onIntroComplete?.()
        return
      }

      // Smooth ease towards end view
      skipState.current = {
        active: true,
        progress: 0,
        startPos: camera.position.clone().sub(cursorRef.current.offset),
        startTarget: controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(),
        endPos,
        endTarget: endTgt,
      }
    },
    log: () => {
      const { position, target } = getCurrentView()
      console.log(
        `%c[CameraRig] Current View:%c\n  camera position: [${position.join(', ')}]\n  point of interest: [${target.join(', ')}]`,
        'color: #1a1f9c; font-weight: bold;',
        'color: inherit;'
      )
    },
    export: () => {
      const outConfig: CameraSettings = {
        waypoints: initialSettings.waypoints.map((wp, index) => ({
          name: wp.name,
          enabled: levaConfig[`wp_${index}_enabled`] ?? wp.enabled,
          position: roundCoords((levaConfig[`wp_${index}_pos`] as number[]) || wp.position) as [number, number, number],
          target: roundCoords((levaConfig[`wp_${index}_target`] as number[]) || wp.target) as [number, number, number],
        })),
        end: {
          position: roundCoords(levaConfig.endPosition as number[]) as [number, number, number],
          target: roundCoords(levaConfig.endTarget as number[]) as [number, number, number],
        },
        introDuration: levaConfig.introDuration || initialSettings.introDuration,
        easing: levaConfig.easing || initialSettings.easing,
        pathMode: (levaConfig.pathMode as 'spline' | 'lerp') || initialSettings.pathMode,
        zoomMin: levaConfig.zoomMin || initialSettings.zoomMin,
        zoomMax: levaConfig.zoomMax || initialSettings.zoomMax,
        cursorIntensity: levaConfig.cursorIntensity || initialSettings.cursorIntensity,
        cursorSmoothing: levaConfig.cursorSmoothing || initialSettings.cursorSmoothing,
      }

      const json = JSON.stringify(outConfig, null, 2).replace(
        /\[\s+([^[\]{}]*?)\s+\]/g,
        (_, list) => `[${list.split(/,\s*/).join(', ')}]`
      )
      downloadJSON('camera-settings.json', json + '\n')
    },
  }

  // Handle skip trigger
  useEffect(() => {
    if (isSkipped) {
      actionsRef.current.skip()
    }
  }, [isSkipped])

  // Handle reset view trigger (ease back to end shot over 1.2s)
  const prevResetRef = useRef(resetTrigger)
  useEffect(() => {
    if (resetTrigger > prevResetRef.current) {
      prevResetRef.current = resetTrigger
      const endPos = new THREE.Vector3().fromArray(
        (levaConfig.endPosition as [number, number, number]) || initialSettings.end.position
      )
      const endTgt = new THREE.Vector3().fromArray(
        (levaConfig.endTarget as [number, number, number]) || initialSettings.end.target
      )
      if (controlsRef.current) controlsRef.current.enabled = false
      resetState.current = {
        active: true,
        progress: 0,
        startPos: camera.position.clone().sub(cursorRef.current.offset),
        startTarget: controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(),
        endPos,
        endTarget: endTgt,
      }
    }
  }, [resetTrigger, camera, levaConfig.endPosition, levaConfig.endTarget])

  // Phase 1: Set camera pose at Waypoint 0 (High in Fog) on mount
  useLayoutEffect(() => {
    const stops = buildStops()
    const target = controlsRef.current ? controlsRef.current.target : new THREE.Vector3()

    if (reducedMotion) {
      const endPos = (levaConfig.endPosition as [number, number, number]) || initialSettings.end.position
      const endTgt = (levaConfig.endTarget as [number, number, number]) || initialSettings.end.target
      camera.position.fromArray(endPos)
      target.fromArray(endTgt)
      if (controlsRef.current) {
        controlsRef.current.enabled = true
        controlsRef.current.update()
      }
      onReady?.()
      onIntroComplete?.()
      return
    }

    samplePath(stops, 0, camera.position, target)
    camera.lookAt(target)
    if (controlsRef.current) {
      controlsRef.current.enabled = false
      controlsRef.current.update()
    }
    onReady?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: Start flythrough when start becomes true
  useEffect(() => {
    if (start && !reducedMotion) {
      actionsRef.current.play()
    }
  }, [start, reducedMotion])

  // Per-frame camera driver (running at smooth 60fps)
  useFrame(({ pointer }, delta) => {
    const ctl = controlsRef.current
    if (!ctl) return

    const safeDelta = Math.min(delta, 1 / 30)

    // Handle skip transition
    if (skipState.current?.active) {
      const skip = skipState.current
      skip.progress = Math.min(skip.progress + safeDelta / 0.85, 1)
      const ease = EASINGS.easeInOut(skip.progress)

      camera.position.lerpVectors(skip.startPos, skip.endPos, ease)
      ctl.target.lerpVectors(skip.startTarget, skip.endTarget, ease)
      ctl.update()

      if (skip.progress >= 1) {
        skipState.current = null
        ctl.enabled = true
        onIntroComplete?.()
      }
      return
    }

    // Handle Reset View transition (1.2s smooth return to wide end shot)
    if (resetState.current?.active) {
      const reset = resetState.current
      reset.progress = Math.min(reset.progress + safeDelta / 1.2, 1)
      const ease = EASINGS.easeInOut(reset.progress)

      camera.position.lerpVectors(reset.startPos, reset.endPos, ease)
      ctl.target.lerpVectors(reset.startTarget, reset.endTarget, ease)
      ctl.update()

      if (reset.progress >= 1) {
        resetState.current = null
        ctl.enabled = true
      }
      return
    }

    // Handle Phase 2 Intro Flythrough (Descent through fog)
    if (introState.current?.active) {
      const intro = introState.current
      perfTrackerRef.current.push(delta)
      intro.t = Math.min(intro.t + safeDelta / intro.duration, 1)

      const stops = {
        positions: intro.positions,
        targets: intro.targets,
        posCurve: intro.posCurve,
        targetCurve: intro.targetCurve,
      }

      // Sample along spline with smooth 0.6s dwells at featured stops
      const remapped = remapSplineProgress(intro.t)
      samplePath(stops, remapped.k, camera.position, ctl.target)
      ctl.update()

      if (remapped.activeIndex !== intro.currentWaypointIndex) {
        intro.currentWaypointIndex = remapped.activeIndex
        onWaypointChange?.(remapped.activeIndex)
      }

      if (intro.t >= 1) {
        // Phase 3 transition: Hand over controls to user
        introState.current = null
        ctl.enabled = true

        const deltas = perfTrackerRef.current
        if (deltas.length > 0) {
          const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length
          const measuredFps = Math.round(1 / avgDelta)
          console.log(
            `%c[CameraRig Performance] Flythrough completed across ${deltas.length} frames.\n` +
            `  Average FPS: ${measuredFps} fps\n` +
            `  Average frame time: ${(avgDelta * 1000).toFixed(2)} ms`,
            'color: #1a1f9c; font-weight: bold;'
          )
          ;(window as any).__FLYTHROUGH_PERF__ = {
            fps: measuredFps,
            frameCount: deltas.length,
            avgFrameTimeMs: Number((avgDelta * 1000).toFixed(2)),
          }
        }

        onIntroComplete?.()
      }
    }

    // Phase 3 & 4: Distance limits & Cursor Parallax
    ctl.minDistance = ctl.enabled ? levaConfig.zoomMin || initialSettings.zoomMin : 0
    ctl.maxDistance = ctl.enabled ? levaConfig.zoomMax || initialSettings.zoomMax : Infinity

    // Phase 4: Cursor Parallax
    const cur = cursorRef.current
    camera.position.sub(cur.offset)
    cur.goal.set(0, 0, 0)

    if (ctl.enabled) {
      cur.right.setFromMatrixColumn(camera.matrixWorld, 0)
      cur.up.setFromMatrixColumn(camera.matrixWorld, 1)

      const intensity = levaConfig.cursorIntensity ?? initialSettings.cursorIntensity
      cur.goal
        .addScaledVector(cur.right, pointer.x * intensity)
        .addScaledVector(cur.up, pointer.y * intensity * 0.6)
    }

    // Exponential damping: offset.lerp(goal, 1 - exp(-smoothing * dt))
    const smoothing = levaConfig.cursorSmoothing ?? initialSettings.cursorSmoothing
    const dampFactor = 1 - Math.exp(-smoothing * Math.min(delta, 0.1))
    cur.offset.lerp(cur.goal, dampFactor)

    camera.position.add(cur.offset)
    camera.lookAt(ctl.target)
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.06}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      enablePan={false}
      minDistance={2.5}
      maxDistance={22}
      target={[0, 0, 0]}
    />
  )
}
