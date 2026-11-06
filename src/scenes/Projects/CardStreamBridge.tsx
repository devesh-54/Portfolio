/**
 * CardStreamBridge.tsx
 *
 * Welcome -> Projects 3D Card Fly-Through Transition Bridge.
 * Recreates the exact perspective corridor from the reference video (gemini_generated_video_a1994a58.mp4):
 * - Flat horizontal floor and ceiling perspective plates in black & white monochrome.
 * - Open center horizon (white center box removed as requested).
 * - Slower, smoother pacing (STREAM_SCROLL_VH = 90vh).
 * - Center horizontal gap covering blocks added right at the user's yellow marks.
 * - In the final phase (s in [0.70, 1.00]), multiple white blocks appear across the field,
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
  l: number          // length / height
  isFloor: boolean   // true = floor, false = ceiling
  style: 'solidWhite' | 'frostWhite' | 'ghostGlass' | 'blackCyber' | 'charcoalPlate'
  isTransitionCover?: boolean // whether this plate is part of the final screen-covering white wave
  isCenterBlock?: boolean     // blocks facing camera directly to seal the horizontal center slit (user yellow marks)
}

// 60 perspective plates matching gemini_generated_video_a1994a58.mp4
// With open center horizon and dense screen-covering white blocks at the end
const PLATES: HorizonPlateDef[] = [
  // ==================== FLOOR PLANE (Y ≈ -2.2, facing up) ====================
  // Early runway phase (s in [0.12, 0.45])
  // All plates start far back in depth (zStart <= -45) so they stream naturally from the horizon
  { x: -5.2, y: -2.3, zStart: -45.0, passS: 0.15, w: 4.4, l: 6.0, isFloor: true, style: 'solidWhite' },
  { x:  3.6, y: -2.1, zStart: -47.0, passS: 0.20, w: 3.8, l: 5.2, isFloor: true, style: 'solidWhite' },
  { x: -1.4, y: -2.0, zStart: -49.0, passS: 0.26, w: 2.8, l: 4.0, isFloor: true, style: 'blackCyber' },
  { x:  6.0, y: -2.4, zStart: -51.0, passS: 0.32, w: 4.8, l: 6.5, isFloor: true, style: 'solidWhite' },
  { x: -3.8, y: -2.2, zStart: -53.0, passS: 0.38, w: 3.4, l: 4.8, isFloor: true, style: 'charcoalPlate' },
  { x:  1.2, y: -2.0, zStart: -55.0, passS: 0.44, w: 2.8, l: 4.0, isFloor: true, style: 'solidWhite' },

  // Mid runway phase (s in [0.45, 0.65])
  { x: -6.4, y: -2.5, zStart: -52.0, passS: 0.50, w: 4.6, l: 6.2, isFloor: true, style: 'solidWhite' },
  { x:  4.4, y: -2.3, zStart: -54.0, passS: 0.55, w: 3.6, l: 5.0, isFloor: true, style: 'blackCyber' },
  { x: -2.0, y: -2.1, zStart: -55.0, passS: 0.60, w: 3.2, l: 4.5, isFloor: true, style: 'solidWhite' },
  { x:  6.8, y: -2.6, zStart: -56.0, passS: 0.65, w: 5.0, l: 6.8, isFloor: true, style: 'solidWhite' },
  { x: -0.6, y: -2.0, zStart: -57.0, passS: 0.69, w: 3.0, l: 4.2, isFloor: true, style: 'solidWhite' },

  // ==================== CEILING PLANE (Y ≈ +2.2, facing down) ====================
  // Early runway phase (s in [0.12, 0.45])
  // All plates start far back in depth (zStart <= -46) so they stream naturally from the horizon
  { x:  5.0, y:  2.3, zStart: -46.0, passS: 0.17, w: 4.4, l: 6.0, isFloor: false, style: 'solidWhite' },
  { x: -3.4, y:  2.1, zStart: -48.0, passS: 0.22, w: 3.6, l: 5.0, isFloor: false, style: 'solidWhite' },
  { x:  1.6, y:  2.0, zStart: -50.0, passS: 0.28, w: 2.6, l: 3.8, isFloor: false, style: 'blackCyber' },
  { x: -5.8, y:  2.4, zStart: -52.0, passS: 0.34, w: 4.8, l: 6.6, isFloor: false, style: 'solidWhite' },
  { x:  4.0, y:  2.2, zStart: -54.0, passS: 0.40, w: 3.4, l: 4.8, isFloor: false, style: 'charcoalPlate' },
  { x: -1.0, y:  2.0, zStart: -56.0, passS: 0.46, w: 2.8, l: 4.0, isFloor: false, style: 'solidWhite' },

  // Mid runway phase (s in [0.45, 0.65])
  { x:  6.4, y:  2.5, zStart: -53.0, passS: 0.52, w: 4.6, l: 6.4, isFloor: false, style: 'solidWhite' },
  { x: -4.6, y:  2.3, zStart: -55.0, passS: 0.57, w: 3.8, l: 5.2, isFloor: false, style: 'blackCyber' },
  { x:  2.2, y:  2.1, zStart: -56.0, passS: 0.62, w: 3.2, l: 4.4, isFloor: false, style: 'solidWhite' },
  { x: -6.8, y:  2.6, zStart: -57.0, passS: 0.67, w: 5.0, l: 6.8, isFloor: false, style: 'solidWhite' },
  { x:  0.8, y:  2.0, zStart: -58.0, passS: 0.70, w: 3.0, l: 4.2, isFloor: false, style: 'solidWhite' },

  // ==================== END TRANSITION: MULTIPLE WHITE BLOCKS COVERING SCREEN ====================
  // Wave 1: Rushing white plates emerging across upper and lower fields (s in [0.72, 0.85])
  { x: -4.8, y: -2.0, zStart: -46.0, passS: 0.74, w: 5.5, l: 8.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  4.2, y:  2.0, zStart: -47.0, passS: 0.76, w: 5.5, l: 8.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x:  1.0, y: -1.8, zStart: -48.0, passS: 0.78, w: 5.0, l: 7.5, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x: -1.5, y:  1.8, zStart: -49.0, passS: 0.80, w: 5.0, l: 7.5, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x:  6.0, y: -1.9, zStart: -50.0, passS: 0.82, w: 6.0, l: 8.5, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x: -5.8, y:  1.9, zStart: -51.0, passS: 0.84, w: 6.0, l: 8.5, isFloor: false, style: 'solidWhite', isTransitionCover: true },

  // Wave 2: Converging floor & ceiling blocks (s in [0.85, 0.94])
  { x: -3.2, y: -1.2, zStart: -45.0, passS: 0.87, w: 6.5, l: 9.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  3.0, y:  1.2, zStart: -46.0, passS: 0.89, w: 6.5, l: 9.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x:  4.8, y: -0.8, zStart: -47.0, passS: 0.91, w: 7.0, l: 9.5, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x: -4.6, y:  0.8, zStart: -48.0, passS: 0.93, w: 7.0, l: 9.5, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x:  0.0, y: -0.5, zStart: -49.0, passS: 0.94, w: 8.0, l: 10.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  0.0, y:  0.5, zStart: -50.0, passS: 0.95, w: 8.0, l: 10.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },

  // ==================== CENTER HORIZONTAL GAP COVERING BLOCKS (USER YELLOW MARKS) ====================
  // Directly seals the horizontal black slit marked by the user in Image 4.
  // Oriented facing camera (rotX = 0) right along Y ≈ 0 with substantial vertical height
  // so they physically wipe across and obliterate the horizontal black slit!
  // 1. Left yellow mark from user's drawing:
  { x: -3.2, y:  0.0, zStart: -38.0, passS: 0.920, w: 5.2, l: 2.6, isFloor: false, style: 'solidWhite', isTransitionCover: true, isCenterBlock: true },
  // 2. Right yellow mark from user's drawing:
  { x:  3.2, y:  0.0, zStart: -39.0, passS: 0.935, w: 5.2, l: 2.6, isFloor: false, style: 'solidWhite', isTransitionCover: true, isCenterBlock: true },
  // 3. Center overlap block sealing the middle between left and right:
  { x:  0.0, y:  0.0, zStart: -40.0, passS: 0.955, w: 6.5, l: 3.2, isFloor: false, style: 'solidWhite', isTransitionCover: true, isCenterBlock: true },
  // 4. Staggered wide left block:
  { x: -1.8, y:  0.0, zStart: -42.0, passS: 0.970, w: 8.0, l: 4.0, isFloor: false, style: 'solidWhite', isTransitionCover: true, isCenterBlock: true },
  // 5. Staggered wide right block:
  { x:  1.8, y:  0.0, zStart: -43.0, passS: 0.975, w: 8.0, l: 4.0, isFloor: false, style: 'solidWhite', isTransitionCover: true, isCenterBlock: true },
  // 6. Final screen-blanketing pure white wave covering 100% of viewport:
  { x:  0.0, y:  0.0, zStart: -45.0, passS: 0.985, w: 9.5, l: 6.0, isFloor: false, style: 'solidWhite', isTransitionCover: true, isCenterBlock: true },

  // Wave 3: Screen-blanketing floor & ceiling white blocks passing camera lens (s in [0.96, 1.00])
  { x: -2.0, y: -0.20, zStart: -48.0, passS: 0.975, w: 8.0, l: 12.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  2.0, y:  0.20, zStart: -49.0, passS: 0.980, w: 8.0, l: 12.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },
  { x:  0.0, y: -0.08, zStart: -50.0, passS: 0.990, w: 9.0, l: 14.0, isFloor: true,  style: 'solidWhite', isTransitionCover: true },
  { x:  0.0, y:  0.08, zStart: -51.0, passS: 0.995, w: 9.0, l: 14.0, isFloor: false, style: 'solidWhite', isTransitionCover: true },
]

function createMonochromeTextures(): Record<string, THREE.CanvasTexture> {
  const width = 512
  const height = 512
  const r = 24

  const texMap: Record<string, THREE.CanvasTexture> = {}

  // 1. Solid White Plate (Pure brilliant crisp white, 100% luminous)
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
    ctx.lineWidth = 4
    ctx.stroke()
    const tex = new THREE.CanvasTexture(canvas)
    texMap.solidWhite = tex
    texMap.frostWhite = tex
    texMap.ghostGlass = tex
  }

  // 2. Black Cyber Plate (Deep black with crisp white grid and rim)
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

  // 3. Charcoal Plate (Dark slate with white corner brackets)
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

  // Materials for each plate - ALL white plates have 1.0 opacity, never dim!
  const materials = useMemo(() => {
    return PLATES.map((p) => {
      const tex = textures[p.style] || textures.solidWhite
      return new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    })
  }, [textures])

  // Fullscreen pure white flood quad right at the final frame (s in [0.97, 1.00])
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

  useFrame(() => {
    const raw = heroProgress.get()
    const pStart = FLIGHT_CONFIG.STREAM_START_P   // 0.128
    const pEnd   = FLIGHT_CONFIG.HANDOVER_P       // 0.2963

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

    // Smooth corridor entry fade:
    // Seamlessly fades in the stream over s in [0.0, 0.08] so blocks never pop in abruptly
    const entryFade = smoothstep(0.0, 0.08, s)

    // Animate each plate streaming along the Z-axis towards and past the camera
    PLATES.forEach((plate, i) => {
      const mesh = plateMeshesRef.current[i]
      if (!mesh) return

      // Visibility gating:
      // Center blocks (yellow marks) only appear during the final gap-covering phase (s >= 0.82)
      // to keep the center horizon completely open and box-free during early corridor flight!
      if (plate.isCenterBlock && s < 0.82) {
        mesh.visible = false
        return
      }

      // Wave 1 and Wave 2 transition cover plates only appear when s >= 0.65
      if (plate.isTransitionCover && !plate.isCenterBlock && s < 0.65) {
        mesh.visible = false
        return
      }

      // Distance plate travels so its leading edge/center reaches camera lens Z = 8.0 at plate.passS
      const travelToCam = camZ - plate.zStart
      const currentZ = plate.zStart + (s / plate.passS) * travelToCam

      // Distance to camera lens (positive = in front of lens, negative = passed behind lens)
      const distToCam = camZ - currentZ

      let opacity = 1.0 * entryFade

      if (plate.isCenterBlock) {
        // Soft emergence from distance at s in [0.82, 0.87]
        opacity *= smoothstep(0.82, 0.87, s)
      }

      if (plate.isTransitionCover) {
        // Transition cover blocks stay 100% solid white all the way to and through the camera lens
        // so they physically wipe over and cover the screen without pre-fading!
        if (distToCam < 0) {
          // Fade quickly once fully behind the lens
          opacity *= smoothstep(-1.8, 0.0, distToCam)
        }
      } else {
        if (distToCam < 2.5) {
          opacity *= smoothstep(0.2, 2.5, distToCam)
        }
      }
      if (distToCam > 65) {
        opacity *= smoothstep(80, 65, distToCam)
      }

      // Plate is visible when approaching, at lens, or just passing behind camera
      const isVisible = distToCam >= -2.0 && distToCam <= 85.0 && opacity > 0.01
      mesh.visible = isVisible

      if (isVisible) {
        mesh.position.set(plate.x, FLIGHT_CONFIG.CAMERA_Y + plate.y, currentZ)

        // Orientation:
        // Center blocks directly face camera (rotX = 0) to cover the horizontal center gap
        // Floor plates face UP (rotX = -PI/2)
        // Ceiling plates face DOWN (rotX = +PI/2)
        const rotX = plate.isCenterBlock ? 0 : plate.isFloor ? -Math.PI / 2 : Math.PI / 2
        mesh.rotation.set(rotX, 0, 0)

        materials[i].opacity = opacity
      }
    })

    // Seamless full-screen pure white flood quad right at the very end of block passage (s in [0.98, 1.00])
    if (fullWhiteQuadRef.current) {
      if (s < 0.98) {
        fullWhiteQuadRef.current.visible = false
      } else {
        fullWhiteQuadRef.current.visible = true
        const whiteT = (s - 0.98) / (1.00 - 0.98)
        const whiteOp = whiteT * whiteT * (3 - 2 * whiteT)
        fullWhiteMat.opacity = whiteOp
        fullWhiteQuadRef.current.position.set(0, FLIGHT_CONFIG.CAMERA_Y, camZ - 0.4)
      }
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* 60 Perspective Plates with Center Gap Cover Blocks & End Screen-Covering Wave */}
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
