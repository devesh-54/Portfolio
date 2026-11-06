/**
 * CardStreamBridge.tsx
 *
 * Welcome -> Projects 3D Card Fly-Through Transition Bridge.
 * Recreates the exact perspective corridor from the reference video (gemini_generated_video_a1994a58.mp4):
 * - Flat horizontal floor and ceiling perspective plates (laying flat in X-Z plane, NOT vertical billboards).
 * - Black and White monochrome palette (matching black monitor screen and pure white projects world).
 * - Floor plates ($Y \approx -2.2$) and ceiling plates ($Y \approx +2.2$) spanning edge-to-edge with open center horizon.
 * - Central glowing white window at the horizon that starts as a glowing slit and expands to cover 100% full screen.
 * - Staggered flight motion along Z so plates pass the camera in continuous cascading waves.
 * - Towards the end of the transition, more white plates pass in rapid succession, covering the screen alongside the expanding white window.
 * - Perfectly synchronized with heroProgress, 100% reversible.
 */

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { FLIGHT_CONFIG } from './flightConfig'
import { heroProgress } from '../Welcome/heroProgress'

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

function makeRoundedRect(w: number, l: number, r: number, seg = 8): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -l / 2
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + l - r)
  shape.quadraticCurveTo(x + w, y + l, x + w - r, y + l)
  shape.lineTo(x + r, y + l)
  shape.quadraticCurveTo(x, y + l, x, y + l - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)

  const geom = new THREE.ShapeGeometry(shape, seg)
  const pos = geom.attributes.position
  const uvs = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = (pos.getX(i) - x) / w
    uvs[i * 2 + 1] = (pos.getY(i) - y) / l
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geom.computeVertexNormals()
  return geom
}

interface HorizonPlateDef {
  x: number
  y: number          // vertical plane offset (+2.2 ceiling, -2.2 floor)
  zStart: number
  passS: number      // progress s in [0, 1] when plate passes camera Z = 8.0
  w: number          // width along X
  l: number          // length along Z
  isFloor: boolean   // true = floor (normal up), false = ceiling (normal down)
  style: 'solidWhite' | 'frostWhite' | 'ghostGlass' | 'blackCyber' | 'charcoalPlate'
}

// 52 horizontal perspective plates matching gemini_generated_video_a1994a58.mp4
// With denser stream of white blocks towards the end (s in [0.65, 0.99])
const PLATES: HorizonPlateDef[] = [
  // ==================== FLOOR PLANE (Y ≈ -2.2, facing up) ====================
  // Early phase (s in [0.14, 0.45]) - spaced out runway
  { x: -5.6, y: -2.3, zStart: -10.0, passS: 0.16, w: 4.4, l: 6.0, isFloor: true, style: 'solidWhite' },
  { x:  3.8, y: -2.1, zStart: -13.0, passS: 0.22, w: 3.8, l: 5.2, isFloor: true, style: 'frostWhite' },
  { x: -1.4, y: -2.0, zStart: -16.0, passS: 0.28, w: 2.8, l: 4.0, isFloor: true, style: 'blackCyber' },
  { x:  6.4, y: -2.4, zStart: -20.0, passS: 0.34, w: 4.8, l: 6.5, isFloor: true, style: 'ghostGlass' },
  { x: -4.2, y: -2.2, zStart: -24.0, passS: 0.40, w: 3.4, l: 4.8, isFloor: true, style: 'charcoalPlate' },
  { x:  1.2, y: -2.0, zStart: -27.0, passS: 0.45, w: 2.6, l: 3.8, isFloor: true, style: 'solidWhite' },

  // Mid phase (s in [0.46, 0.68])
  { x: -6.8, y: -2.5, zStart: -31.0, passS: 0.50, w: 4.6, l: 6.2, isFloor: true, style: 'frostWhite' },
  { x:  4.6, y: -2.3, zStart: -35.0, passS: 0.55, w: 3.6, l: 5.0, isFloor: true, style: 'blackCyber' },
  { x: -2.2, y: -2.1, zStart: -39.0, passS: 0.60, w: 3.2, l: 4.5, isFloor: true, style: 'ghostGlass' },
  { x:  7.2, y: -2.6, zStart: -43.0, passS: 0.65, w: 5.0, l: 6.8, isFloor: true, style: 'solidWhite' },
  { x: -0.6, y: -2.0, zStart: -47.0, passS: 0.70, w: 3.0, l: 4.2, isFloor: true, style: 'frostWhite' },

  // Dense End phase (s in [0.70, 0.99]) - more white blocks passing, covering complete screen
  { x: -5.2, y: -2.3, zStart: -50.0, passS: 0.74, w: 4.8, l: 6.5, isFloor: true, style: 'solidWhite' },
  { x:  3.2, y: -2.1, zStart: -53.0, passS: 0.77, w: 4.2, l: 5.8, isFloor: true, style: 'frostWhite' },
  { x: -1.8, y: -2.0, zStart: -56.0, passS: 0.80, w: 3.8, l: 5.2, isFloor: true, style: 'solidWhite' },
  { x:  6.0, y: -2.4, zStart: -59.0, passS: 0.83, w: 5.2, l: 7.0, isFloor: true, style: 'frostWhite' },
  { x: -4.0, y: -2.2, zStart: -62.0, passS: 0.86, w: 4.5, l: 6.2, isFloor: true, style: 'solidWhite' },
  { x:  1.6, y: -2.0, zStart: -65.0, passS: 0.89, w: 4.0, l: 5.5, isFloor: true, style: 'frostWhite' },
  { x: -6.2, y: -2.4, zStart: -68.0, passS: 0.91, w: 5.0, l: 6.8, isFloor: true, style: 'solidWhite' },
  { x:  4.2, y: -2.2, zStart: -71.0, passS: 0.93, w: 4.6, l: 6.2, isFloor: true, style: 'solidWhite' },
  { x: -0.8, y: -2.0, zStart: -74.0, passS: 0.95, w: 4.2, l: 5.8, isFloor: true, style: 'frostWhite' },
  { x:  6.8, y: -2.5, zStart: -77.0, passS: 0.96, w: 5.6, l: 7.5, isFloor: true, style: 'solidWhite' },
  { x: -3.5, y: -2.1, zStart: -80.0, passS: 0.97, w: 5.0, l: 6.6, isFloor: true, style: 'solidWhite' },
  { x:  2.4, y: -2.0, zStart: -83.0, passS: 0.98, w: 4.8, l: 6.4, isFloor: true, style: 'frostWhite' },
  { x: -1.2, y: -2.0, zStart: -86.0, passS: 0.99, w: 4.4, l: 6.0, isFloor: true, style: 'solidWhite' },
  { x:  0.0, y: -2.0, zStart: -89.0, passS: 0.995, w: 5.5, l: 7.0, isFloor: true, style: 'solidWhite' },
  { x: -5.0, y: -2.3, zStart: -92.0, passS: 0.998, w: 6.0, l: 8.0, isFloor: true, style: 'solidWhite' },

  // ==================== CEILING PLANE (Y ≈ +2.2, facing down) ====================
  // Early phase (s in [0.14, 0.45]) - spaced out runway
  { x:  5.4, y:  2.3, zStart: -11.0, passS: 0.18, w: 4.5, l: 6.2, isFloor: false, style: 'solidWhite' },
  { x: -3.6, y:  2.1, zStart: -14.0, passS: 0.24, w: 3.6, l: 5.0, isFloor: false, style: 'frostWhite' },
  { x:  1.8, y:  2.0, zStart: -17.0, passS: 0.30, w: 2.6, l: 3.8, isFloor: false, style: 'blackCyber' },
  { x: -6.2, y:  2.4, zStart: -21.0, passS: 0.36, w: 4.8, l: 6.6, isFloor: false, style: 'ghostGlass' },
  { x:  4.4, y:  2.2, zStart: -25.0, passS: 0.42, w: 3.4, l: 4.8, isFloor: false, style: 'charcoalPlate' },
  { x: -1.0, y:  2.0, zStart: -28.0, passS: 0.47, w: 2.8, l: 4.0, isFloor: false, style: 'solidWhite' },

  // Mid phase (s in [0.48, 0.68])
  { x:  6.6, y:  2.5, zStart: -32.0, passS: 0.52, w: 4.6, l: 6.4, isFloor: false, style: 'frostWhite' },
  { x: -4.8, y:  2.3, zStart: -36.0, passS: 0.57, w: 3.8, l: 5.2, isFloor: false, style: 'blackCyber' },
  { x:  2.4, y:  2.1, zStart: -40.0, passS: 0.62, w: 3.2, l: 4.4, isFloor: false, style: 'ghostGlass' },
  { x: -7.2, y:  2.6, zStart: -44.0, passS: 0.67, w: 5.0, l: 6.8, isFloor: false, style: 'solidWhite' },
  { x:  0.8, y:  2.0, zStart: -48.0, passS: 0.71, w: 3.0, l: 4.2, isFloor: false, style: 'frostWhite' },

  // Dense End phase (s in [0.70, 0.99]) - more white blocks passing, covering complete screen
  { x:  5.0, y:  2.3, zStart: -51.0, passS: 0.75, w: 4.8, l: 6.5, isFloor: false, style: 'solidWhite' },
  { x: -3.0, y:  2.1, zStart: -54.0, passS: 0.78, w: 4.2, l: 5.8, isFloor: false, style: 'frostWhite' },
  { x:  2.0, y:  2.0, zStart: -57.0, passS: 0.81, w: 3.8, l: 5.2, isFloor: false, style: 'solidWhite' },
  { x: -5.8, y:  2.4, zStart: -60.0, passS: 0.84, w: 5.2, l: 7.0, isFloor: false, style: 'frostWhite' },
  { x:  3.8, y:  2.2, zStart: -63.0, passS: 0.87, w: 4.5, l: 6.2, isFloor: false, style: 'solidWhite' },
  { x: -1.4, y:  2.0, zStart: -66.0, passS: 0.90, w: 4.0, l: 5.5, isFloor: false, style: 'frostWhite' },
  { x:  6.0, y:  2.4, zStart: -69.0, passS: 0.92, w: 5.0, l: 6.8, isFloor: false, style: 'solidWhite' },
  { x: -4.0, y:  2.2, zStart: -72.0, passS: 0.94, w: 4.6, l: 6.2, isFloor: false, style: 'solidWhite' },
  { x:  1.0, y:  2.0, zStart: -75.0, passS: 0.955, w: 4.2, l: 5.8, isFloor: false, style: 'frostWhite' },
  { x: -6.6, y:  2.5, zStart: -78.0, passS: 0.965, w: 5.6, l: 7.5, isFloor: false, style: 'solidWhite' },
  { x:  3.2, y:  2.1, zStart: -81.0, passS: 0.975, w: 5.0, l: 6.6, isFloor: false, style: 'solidWhite' },
  { x: -2.2, y:  2.0, zStart: -84.0, passS: 0.985, w: 4.8, l: 6.4, isFloor: false, style: 'frostWhite' },
  { x:  1.4, y:  2.0, zStart: -87.0, passS: 0.992, w: 4.4, l: 6.0, isFloor: false, style: 'solidWhite' },
  { x:  0.0, y:  2.0, zStart: -90.0, passS: 0.996, w: 5.5, l: 7.0, isFloor: false, style: 'solidWhite' },
  { x:  4.8, y:  2.3, zStart: -93.0, passS: 0.999, w: 6.0, l: 8.0, isFloor: false, style: 'solidWhite' },
]

function createMonochromeTextures(): Record<string, THREE.CanvasTexture> {
  const width = 512
  const height = 512
  const r = 24

  const texMap: Record<string, THREE.CanvasTexture> = {}

  // 1. Solid White Plate (Pure brilliant white)
  {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(0, 0, width, height, r)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
    const tex = new THREE.CanvasTexture(canvas)
    texMap.solidWhite = tex
  }

  // 2. Frost White Glass Plate
  {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, width, height)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)')
    grad.addColorStop(1, 'rgba(240, 245, 255, 0.78)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(0, 0, width, height, r)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 4
    ctx.stroke()
    const tex = new THREE.CanvasTexture(canvas)
    texMap.frostWhite = tex
  }

  // 3. Ghost Glass Plate
  {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)'
    ctx.beginPath()
    ctx.roundRect(0, 0, width, height, r)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.lineWidth = 3
    ctx.stroke()
    const tex = new THREE.CanvasTexture(canvas)
    texMap.ghostGlass = tex
  }

  // 4. Black Cyber Plate (Deep black with crisp white grid and rim)
  {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#050505'
    ctx.beginPath()
    ctx.roundRect(0, 0, width, height, r)
    ctx.fill()
    // Fine technical grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.lineWidth = 1.2
    for (let x = 40; x < width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 40; y < height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    // Crisp white border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.roundRect(4, 4, width - 8, height - 8, r - 2)
    ctx.stroke()
    const tex = new THREE.CanvasTexture(canvas)
    texMap.blackCyber = tex
  }

  // 5. Charcoal Plate (Dark slate with white corner brackets)
  {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#111111'
    ctx.beginPath()
    ctx.roundRect(0, 0, width, height, r)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(4, 4, width - 8, height - 8, r - 2)
    ctx.stroke()
    // White corner ticks
    ctx.fillStyle = '#ffffff'
    const tick = 24
    ctx.fillRect(8, 8, tick, 4)
    ctx.fillRect(8, 8, 4, tick)
    ctx.fillRect(width - 8 - tick, height - 12, tick, 4)
    ctx.fillRect(width - 12, height - 8 - tick, 4, tick)
    const tex = new THREE.CanvasTexture(canvas)
    texMap.charcoalPlate = tex
  }

  return texMap
}

function createBloomTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)')
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)')
  grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.08)')
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  return tex
}

export function CardStreamBridge() {
  const groupRef = useRef<THREE.Group | null>(null)
  const windowMeshRef = useRef<THREE.Mesh | null>(null)
  const windowBloomMeshRef = useRef<THREE.Mesh | null>(null)
  const fullWhiteQuadRef = useRef<THREE.Mesh | null>(null)
  const plateMeshesRef = useRef<(THREE.Mesh | null)[]>([])

  const textures = useMemo(() => createMonochromeTextures(), [])
  const bloomTexture = useMemo(() => createBloomTexture(), [])

  // Geometries for each horizontal plate
  const geometries = useMemo(() => {
    return PLATES.map((p) => makeRoundedRect(p.w, p.l, 0.18, 8))
  }, [])

  // Materials for each plate
  const materials = useMemo(() => {
    return PLATES.map((p) => {
      const tex = textures[p.style] || textures.solidWhite
      const baseOp = p.style === 'ghostGlass' ? 0.55 : p.style === 'frostWhite' ? 0.90 : 1.0
      return new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: baseOp,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    })
  }, [textures])

  // Central glowing white window geometry & material
  const windowGeom = useMemo(() => new THREE.PlaneGeometry(1.0, 1.0), [])
  const windowMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    })
  }, [])

  // Radiant blooming aura around the window (additive blending)
  const bloomMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: bloomTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      opacity: 0.9,
      depthWrite: false,
    })
  }, [bloomTexture])

  // Fullscreen pure white flood quad right in front of camera at the handover
  const fullWhiteGeom = useMemo(() => new THREE.PlaneGeometry(100, 100), [])
  const fullWhiteMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  }, [])

  useFrame(() => {
    const raw = heroProgress.get()
    const pStart = FLIGHT_CONFIG.STREAM_START_P   // 0.138
    const pEnd   = FLIGHT_CONFIG.HANDOVER_P       // 0.240

    // Only active during the bridge transition interval
    const isActive = raw >= pStart && raw <= pEnd + 0.015
    if (!groupRef.current) return

    if (!isActive) {
      groupRef.current.visible = false
      return
    }

    groupRef.current.visible = true

    // Stream progress s in [0, 1]
    const s = Math.max(0, Math.min(1.0, (raw - pStart) / (pEnd - pStart)))
    const camZ = 8.0 // Camera is at Z = 8.0

    // Animate each flat horizontal plate streaming along the Z-axis towards and past the camera
    PLATES.forEach((plate, i) => {
      const mesh = plateMeshesRef.current[i]
      if (!mesh) return

      // Distance plate travels to pass camera Z = 8.0 at plate.passS
      const travelTotal = (camZ + 6.0) - plate.zStart
      const currentZ = plate.zStart + (s / plate.passS) * travelTotal

      // Distance to camera lens
      const distToCam = camZ - currentZ

      // Dissolve smoothly right as plate passes camera lens (fade zone distToCam in [0.2, 2.5])
      const baseOp = plate.style === 'ghostGlass' ? 0.55 : plate.style === 'frostWhite' ? 0.90 : 1.0
      let opacity = baseOp
      if (distToCam < 2.5) {
        opacity = baseOp * smoothstep(0.2, 2.5, distToCam)
      }
      if (distToCam > 60) {
        opacity *= smoothstep(75, 60, distToCam)
      }

      // Plate is visible when in front of or just passing camera
      const isVisible = distToCam >= 0.1 && distToCam <= 80.0 && opacity > 0.01
      mesh.visible = isVisible

      if (isVisible) {
        mesh.position.set(plate.x, FLIGHT_CONFIG.CAMERA_Y + plate.y, currentZ)

        // Flat horizontal orientation in X-Z plane:
        // Floor plates face UP (rotation.x = -PI/2)
        // Ceiling plates face DOWN (rotation.x = +PI/2)
        const rotX = plate.isFloor ? -Math.PI / 2 : Math.PI / 2
        mesh.rotation.set(rotX, 0, 0)

        materials[i].opacity = opacity
      }
    })

    // Glowing white horizon window that starts as a glowing slit and expands to cover 100% full screen
    // Matching gemini_generated_video_a1994a58.mp4 (frame 068 -> 239)
    if (windowMeshRef.current && windowBloomMeshRef.current) {
      if (s < 0.08) {
        windowMeshRef.current.visible = false
        windowBloomMeshRef.current.visible = false
      } else {
        windowMeshRef.current.visible = true
        windowBloomMeshRef.current.visible = true

        // Window expansion profile:
        // s in [0.08, 0.40]: glowing horizontal slit (W: 4.5 -> 14, H: 0.18 -> 0.75)
        // s in [0.40, 0.72]: bright rectangular portal (W: 14 -> 38, H: 0.75 -> 8.5)
        // s in [0.72, 1.00]: accelerates and expands to flood 100% of the screen (W: 38 -> 260, H: 8.5 -> 160)
        let w = 4.5
        let h = 0.2
        let op = 1.0

        if (s < 0.40) {
          const t = (s - 0.08) / (0.40 - 0.08)
          w = 4.5 + t * 9.5
          h = 0.18 + t * 0.57
          op = smoothstep(0.08, 0.20, s)
        } else if (s < 0.72) {
          const t = (s - 0.40) / (0.72 - 0.40)
          w = 14.0 + t * 24.0
          h = 0.75 + t * 7.75
          op = 1.0
        } else {
          const t = (s - 0.72) / (1.00 - 0.72)
          const easeExp = t * t * t * (t * (t * 6 - 15) + 10) // Quintic smoothstep for explosive bloom
          w = 38.0 + easeExp * 222.0
          h = 8.5 + easeExp * 151.5
          op = 1.0
        }

        const windowZ = -48.0
        windowMeshRef.current.position.set(0, FLIGHT_CONFIG.CAMERA_Y, windowZ)
        windowMeshRef.current.scale.set(w, h, 1.0)
        windowMat.opacity = op

        // Luminous radiant bloom halo (additive blending)
        windowBloomMeshRef.current.position.set(0, FLIGHT_CONFIG.CAMERA_Y, windowZ + 0.1)
        windowBloomMeshRef.current.scale.set(w * 1.8, Math.max(h * 2.2, 4.0), 1.0)
        bloomMat.opacity = op * (s < 0.72 ? 0.85 : 1.0)
      }
    }

    // Seamless full-screen pure white flood quad right at the handover (s in [0.88, 1.00])
    // Guarantees 100% pure white coverage without any seam or background pop
    if (fullWhiteQuadRef.current) {
      if (s < 0.88) {
        fullWhiteQuadRef.current.visible = false
      } else {
        fullWhiteQuadRef.current.visible = true
        const whiteT = (s - 0.88) / (1.00 - 0.88)
        const whiteOp = whiteT * whiteT * (3 - 2 * whiteT)
        fullWhiteMat.opacity = whiteOp
        // Position directly in front of camera
        fullWhiteQuadRef.current.position.set(0, FLIGHT_CONFIG.CAMERA_Y, camZ - 0.4)
      }
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* Expanding White Window of Light at Horizon with Additive Radiant Bloom */}
      <mesh ref={windowBloomMeshRef} geometry={windowGeom} material={bloomMat} visible={false} />
      <mesh ref={windowMeshRef} geometry={windowGeom} material={windowMat} visible={false} />

      {/* 52 Flat Horizontal Perspective Plates (Floor & Ceiling) */}
      {PLATES.map((_, i) => (
        <mesh
          key={`horizon-plate-${i}`}
          ref={(el) => {
            plateMeshesRef.current[i] = el
          }}
          geometry={geometries[i]}
          material={materials[i]}
          visible={false}
        />
      ))}

      {/* Seamless Full-Screen White Flood Quad at Handover */}
      <mesh ref={fullWhiteQuadRef} geometry={fullWhiteGeom} material={fullWhiteMat} visible={false} />
    </group>
  )
}
