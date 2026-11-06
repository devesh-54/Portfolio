/**
 * CardStreamBridge.tsx
 *
 * Welcome -> Projects 3D Card Fly-Through Transition Bridge.
 * Recreates the exact perspective corridor from the reference video (gemini_generated_video_a1994a58.mp4):
 * - Flat horizontal floor and ceiling perspective plates in black & white monochrome.
 * - Open center horizon (white center box removed as requested).
 * - Slower, smoother pacing (STREAM_SCROLL_VH = 90vh).
 * - In the final phase (s in [0.65, 1.00]), multiple white blocks appear across the field,
 *   streaming towards the camera and expanding to physically cover the entire screen in pure white.
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
  y: number          // vertical offset
  zStart: number
  passS: number      // progress s in [0, 1] when plate passes camera Z = 8.0
  w: number          // width along X
  l: number          // length along Z
  isFloor: boolean   // true = floor, false = ceiling
  style: 'solidWhite' | 'frostWhite' | 'ghostGlass' | 'blackCyber' | 'charcoalPlate'
  isTransitionCover?: boolean // whether this plate is part of the final screen-covering white wave
}

// 56 perspective plates matching gemini_generated_video_a1994a58.mp4
// With open center horizon and dense screen-covering white blocks at the end
const PLATES: HorizonPlateDef[] = [
  // ==================== FLOOR PLANE (Y ≈ -2.2, facing up) ====================
  // Early runway phase (s in [0.12, 0.45])
  { x: -5.6, y: -2.3, zStart: -10.0, passS: 0.15, w: 4.4, l: 6.0, isFloor: true, style: 'solidWhite' },
  { x:  3.8, y: -2.1, zStart: -13.0, passS: 0.20, w: 3.8, l: 5.2, isFloor: true, style: 'frostWhite' },
  { x: -1.4, y: -2.0, zStart: -16.0, passS: 0.26, w: 2.8, l: 4.0, isFloor: true, style: 'blackCyber' },
  { x:  6.4, y: -2.4, zStart: -20.0, passS: 0.32, w: 4.8, l: 6.5, isFloor: true, style: 'ghostGlass' },
  { x: -4.2, y: -2.2, zStart: -24.0, passS: 0.38, w: 3.4, l: 4.8, isFloor: true, style: 'charcoalPlate' },
  { x:  1.2, y: -2.0, zStart: -27.0, passS: 0.44, w: 2.6, l: 3.8, isFloor: true, style: 'solidWhite' },

  // Mid runway phase (s in [0.45, 0.65])
  { x: -6.8, y: -2.5, zStart: -31.0, passS: 0.49, w: 4.6, l: 6.2, isFloor: true, style: 'frostWhite' },
  { x:  4.6, y: -2.3, zStart: -35.0, passS: 0.54, w: 3.6, l: 5.0, isFloor: true, style: 'blackCyber' },
  { x: -2.2, y: -2.1, zStart: -39.0, passS: 0.59, w: 3.2, l: 4.5, isFloor: true, style: 'ghostGlass' },
  { x:  7.2, y: -2.6, zStart: -43.0, passS: 0.64, w: 5.0, l: 6.8, isFloor: true, style: 'solidWhite' },
  { x: -0.6, y: -2.0, zStart: -47.0, passS: 0.69, w: 3.0, l: 4.2, isFloor: true, style: 'frostWhite' },

  // ==================== CEILING PLANE (Y ≈ +2.2, facing down) ====================
  // Early runway phase (s in [0.12, 0.45])
  { x:  5.4, y:  2.3, zStart: -11.0, passS: 0.17, w: 4.5, l: 6.2, isFloor: false, style: 'solidWhite' },
  { x: -3.6, y:  2.1, zStart: -14.0, passS: 0.22, w: 3.6, l: 5.0, isFloor: false, style: 'frostWhite' },
  { x:  1.8, y:  2.0, zStart: -17.0, passS: 0.28, w: 2.6, l: 3.8, isFloor: false, style: 'blackCyber' },
  { x: -6.2, y:  2.4, zStart: -21.0, passS: 0.34, w: 4.8, l: 6.6, isFloor: false, style: 'ghostGlass' },
  { x:  4.4, y:  2.2, zStart: -25.0, passS: 0.40, w: 3.4, l: 4.8, isFloor: false, style: 'charcoalPlate' },
  { x: -1.0, y:  2.0, zStart: -28.0, passS: 0.46, w: 2.8, l: 4.0, isFloor: false, style: 'solidWhite' },

  // Mid runway phase (s in [0.45, 0.65])
  { x:  6.6, y:  2.5, zStart: -32.0, passS: 0.51, w: 4.6, l: 6.4, isFloor: false, style: 'frostWhite' },
  { x: -4.8, y:  2.3, zStart: -36.0, passS: 0.56, w: 3.8, l: 5.2, isFloor: false, style: 'blackCyber' },
  { x:  2.4, y:  2.1, zStart: -40.0, passS: 0.61, w: 3.2, l: 4.4, isFloor: false, style: 'ghostGlass' },
  { x: -7.2, y:  2.6, zStart: -44.0, passS: 0.66, w: 5.0, l: 6.8, isFloor: false, style: 'solidWhite' },
  { x:  0.8, y:  2.0, zStart: -48.0, passS: 0.70, w: 3.0, l: 4.2, isFloor: false, style: 'frostWhite' },

  // ==================== END TRANSITION: MULTIPLE WHITE BLOCKS COVERING SCREEN ====================
  // "make multiple block appear and that cover screen fully as it move later project show up"
  // Wave 1: Dense rushing white plates emerging across upper and lower fields (s in [0.70, 0.85])
  { x: -4.8, y: -1.8, zStart: -46.0, passS: 0.74, w: 5.5, l: 7.5, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  4.2, y:  1.8, zStart: -47.0, passS: 0.76, w: 5.5, l: 7.5, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x:  1.0, y: -1.6, zStart: -48.0, passS: 0.78, w: 4.8, l: 6.8, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x: -1.5, y:  1.6, zStart: -49.0, passS: 0.80, w: 4.8, l: 6.8, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x:  6.0, y: -1.7, zStart: -50.0, passS: 0.82, w: 5.8, l: 8.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x: -5.8, y:  1.7, zStart: -51.0, passS: 0.84, w: 5.8, l: 8.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },

  // Wave 2: Converging multi-quadrant large white blocks filling corners & center (s in [0.85, 0.95])
  { x: -3.2, y: -1.2, zStart: -52.0, passS: 0.87, w: 6.5, l: 9.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  3.0, y:  1.2, zStart: -53.0, passS: 0.89, w: 6.5, l: 9.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x:  5.2, y: -0.8, zStart: -54.0, passS: 0.91, w: 7.0, l: 9.5, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x: -5.0, y:  0.8, zStart: -55.0, passS: 0.93, w: 7.0, l: 9.5, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x: -0.5, y: -1.0, zStart: -56.0, passS: 0.94, w: 7.5, l: 10.0, isFloor: true, style: 'solidWhite', isTransitionCover: true },
  { x:  0.5, y:  1.0, zStart: -57.0, passS: 0.95, w: 7.5, l: 10.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },

  // Wave 3: Massive screen-blanketing white blocks passing camera lens (s in [0.94, 1.00])
  // These cover center, mid-level, and edges so every pixel of the screen is physically covered
  { x: -2.5, y: -0.25, zStart: -58.0, passS: 0.965, w: 10.0, l: 14.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  2.5, y:  0.25, zStart: -59.0, passS: 0.975, w: 10.0, l: 14.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x: -4.0, y:  0.0,  zStart: -60.0, passS: 0.985, w: 11.0, l: 16.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  4.0, y:  0.0,  zStart: -60.5, passS: 0.988, w: 11.0, l: 16.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x:  0.0, y: -0.1,  zStart: -61.0, passS: 0.992, w: 12.0, l: 18.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  0.0, y:  0.1,  zStart: -61.5, passS: 0.996, w: 12.0, l: 18.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },
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

export function CardStreamBridge() {
  const groupRef = useRef<THREE.Group | null>(null)
  const fullWhiteQuadRef = useRef<THREE.Mesh | null>(null)
  const plateMeshesRef = useRef<(THREE.Mesh | null)[]>([])

  const textures = useMemo(() => createMonochromeTextures(), [])

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

  // Fullscreen pure white flood quad right at the handover
  const fullWhiteGeom = useMemo(() => new THREE.PlaneGeometry(120, 120), [])
  const fullWhiteMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  }, [])

  // Progress damping ref for video-like fluid motion
  const sSmoothRef = useRef(0)

  useFrame((_, delta) => {
    const raw = heroProgress.get()
    const pStart = FLIGHT_CONFIG.STREAM_START_P
    const pEnd   = FLIGHT_CONFIG.HANDOVER_P

    // Only active during the bridge transition interval
    const isActive = raw >= pStart && raw <= pEnd + 0.015
    if (!groupRef.current) return

    if (!isActive) {
      groupRef.current.visible = false
      sSmoothRef.current = raw < pStart ? 0 : 1
      return
    }

    groupRef.current.visible = true

    // Target stream progress in [0, 1]
    const sTarget = Math.max(0, Math.min(1.0, (raw - pStart) / (pEnd - pStart)))
    const safeDelta = Math.min(delta, 0.05)

    // Smooth exponential damping: filters out discrete mousewheel steps into a velvety video glide
    sSmoothRef.current = THREE.MathUtils.damp(sSmoothRef.current, sTarget, 16, safeDelta)
    const s = sSmoothRef.current

    // Synchronized forward camera glide from Z = 8.8 to Z = 8.0
    const sEase = s * s * (3 - 2 * s)
    const camZ = 8.8 - sEase * 0.8

    // Animate each flat horizontal plate streaming along the Z-axis towards and past the camera
    PLATES.forEach((plate, i) => {
      const mesh = plateMeshesRef.current[i]
      if (!mesh) return

      // Distance plate travels to pass camera Z at plate.passS
      const travelTotal = (8.0 + 8.0) - plate.zStart
      const currentZ = plate.zStart + (s / plate.passS) * travelTotal

      // Distance to camera lens
      const distToCam = camZ - currentZ

      // Dissolve smoothly right as plate passes camera lens
      const baseOp = plate.style === 'ghostGlass' ? 0.55 : plate.style === 'frostWhite' ? 0.90 : 1.0
      let opacity = baseOp
      if (plate.isTransitionCover) {
        // Transition cover blocks stay solid white longer to cover the viewport
        if (distToCam < 1.0) {
          opacity = baseOp * smoothstep(0.0, 1.0, distToCam)
        }
      } else {
        if (distToCam < 2.5) {
          opacity = baseOp * smoothstep(0.2, 2.5, distToCam)
        }
      }
      if (distToCam > 65) {
        opacity *= smoothstep(80, 65, distToCam)
      }

      // Plate is visible when in front of or just passing camera
      const isVisible = distToCam >= -1.0 && distToCam <= 85.0 && opacity > 0.01
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

    // Seamless full-screen pure white flood quad right as multiple white blocks cover the screen (s in [0.88, 1.00])
    // Guarantees 100% pure white coverage without any seam or background pop
    if (fullWhiteQuadRef.current) {
      if (s < 0.88) {
        fullWhiteQuadRef.current.visible = false
      } else {
        fullWhiteQuadRef.current.visible = true
        const whiteT = (s - 0.88) / (1.00 - 0.88)
        const whiteOp = whiteT * whiteT * (3 - 2 * whiteT)
        fullWhiteMat.opacity = whiteOp
        // Position directly in front of camera lens
        fullWhiteQuadRef.current.position.set(0, FLIGHT_CONFIG.CAMERA_Y, camZ - 0.4)
      }
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* 56 Flat Horizontal Perspective Plates with End Screen-Covering Wave */}
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
