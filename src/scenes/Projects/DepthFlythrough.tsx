/**
 * DepthFlythrough.tsx
 *
 * 3D Projects Flythrough:
 * 1. Full grid formation (72 cards):
 *    - 48 grid slots (8 cols x 6 rows) + 24 depth cards filling the entire screen:
 *      left, right, in between (middle), top, and bottom.
 *    - Real projects distributed across left, right, and center-between positions.
 * 2. Depth brightness (matching 3D scroll template):
 *    - Front cards are bright (normal 1.0).
 *    - Backside cards are darker (down to 0.20), smoothly brightening to normal as they approach.
 * 3. Gentle roller coaster hill curve:
 *    - Cards climb up from the background, reach the flat viewing crest (d in [4.5, 6.5]) at eye level.
 *    - After the peak (d < 4.5), cards bend into a smooth, gentle downward curve (no sudden dropping).
 * 4. Placeholders:
 *    - OLED pitch-black boxes with the curved monitor's blue line border (#8fc4ff) and corner tick marks.
 */

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { projects, type ProjectItem } from '../../config/projects'
import { heroProgress } from '../Welcome/heroProgress'
import { FLIGHT_CONFIG } from './flightConfig'

// ─── Deterministic Seeded PRNG (Mulberry32) ──────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

// ─── Geometry: Rounded Rectangle with 8px equivalent corner radius ───────────

function makeRoundedRect(w: number, h: number, r: number, seg = 10): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)

  const geom = new THREE.ShapeGeometry(shape, seg)
  const pos = geom.attributes.position
  const uvs = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = (pos.getX(i) - x) / w
    uvs[i * 2 + 1] = (pos.getY(i) - y) / h
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geom.computeVertexNormals()
  return geom
}

// ─── Button Drop Shadow (User Specification) ──────────────────────────────────
// box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px,
//             rgba(0, 0, 0, 0.12) 0px -12px 30px,
//             rgba(0, 0, 0, 0.12) 0px 4px 6px,
//             rgba(0, 0, 0, 0.17) 0px 12px 13px,
//             rgba(0, 0, 0, 0.09) 0px -3px 5px;

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function createButtonShadowTexture(): THREE.CanvasTexture {
  const width = 512
  const height = 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const cardW = 240
  const cardH = cardW / 1.5 // 160
  const cardX = (width - cardW) / 2 // 136
  const cardY = 190 // slightly above center so the downward 54px shadow falls cleanly within canvas
  const r = 12

  const shadowLayers = [
    { ox: 0, oy: 54, blur: 55, color: 'rgba(0, 0, 0, 0.95)' },
    { ox: 0, oy: -12, blur: 30, color: 'rgba(0, 0, 0, 0.55)' },
    { ox: 0, oy: 4, blur: 6, color: 'rgba(0, 0, 0, 0.60)' },
    { ox: 0, oy: 12, blur: 13, color: 'rgba(0, 0, 0, 0.75)' },
    { ox: 0, oy: -3, blur: 5, color: 'rgba(0, 0, 0, 0.40)' },
  ]

  const offX = 4000
  shadowLayers.forEach((s) => {
    ctx.save()
    ctx.shadowColor = s.color
    ctx.shadowBlur = s.blur
    ctx.shadowOffsetX = offX + s.ox
    ctx.shadowOffsetY = s.oy

    ctx.fillStyle = '#000000'
    drawRoundedRectPath(ctx, cardX - offX, cardY, cardW, cardH, r)
    ctx.fill()
    ctx.restore()
  })

  // Subtle cyan/blue accent rim halo so the button elevation stands out against pitch-black space
  ctx.save()
  ctx.shadowColor = 'rgba(143, 196, 255, 0.45)'
  ctx.shadowBlur = 14
  ctx.shadowOffsetX = offX
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(143, 196, 255, 0.60)'
  ctx.lineWidth = 1.5
  drawRoundedRectPath(ctx, cardX - offX, cardY, cardW, cardH, r)
  ctx.stroke()
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

// ─── Placeholder: Black Box with Blue Line (Matching Curved Monitor) ─────────

function createBlackBoxPlaceholderTextures(): THREE.CanvasTexture[] {
  const width = 384
  const height = 256
  const r = 16

  return Array.from({ length: 12 }).map((_, idx) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.CanvasTexture(canvas)

    // Clip rounded corners
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.arcTo(width, 0, width, height, r)
    ctx.arcTo(width, height, 0, height, r)
    ctx.arcTo(0, height, 0, 0, r)
    ctx.arcTo(0, 0, width, 0, r)
    ctx.closePath()
    ctx.clip()

    // 1. Pitch-black OLED fill (#03050a)
    ctx.fillStyle = '#03050a'
    ctx.fillRect(0, 0, width, height)

    // 2. Faint technical blueprint grid inside (#081226)
    ctx.strokeStyle = 'rgba(77, 115, 217, 0.08)'
    ctx.lineWidth = 1.0
    const stepX = width / 6
    const stepY = height / 4
    for (let x = stepX; x < width; x += stepX) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = stepY; y < height; y += stepY) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // 3. Technical Corner Tick Marks (L-brackets like monitor CAD lines)
    ctx.strokeStyle = '#8fc4ff' // darkTheme.outlineInk
    ctx.lineWidth = 2.0
    const tick = 18
    const inset = 12
    // Top-left
    ctx.beginPath()
    ctx.moveTo(inset, inset + tick)
    ctx.lineTo(inset, inset)
    ctx.lineTo(inset + tick, inset)
    // Top-right
    ctx.moveTo(width - inset - tick, inset)
    ctx.lineTo(width - inset, inset)
    ctx.lineTo(width - inset, inset + tick)
    // Bottom-left
    ctx.moveTo(inset, height - inset - tick)
    ctx.lineTo(inset, height - inset)
    ctx.lineTo(inset + tick, height - inset)
    // Bottom-right
    ctx.moveTo(width - inset - tick, height - inset)
    ctx.lineTo(width - inset, height - inset)
    ctx.lineTo(width - inset, height - inset - tick)
    ctx.stroke()

    // 4. Clean Blue Border Line around outer edge (#8fc4ff)
    ctx.strokeStyle = 'rgba(143, 196, 255, 0.85)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.arcTo(width, 0, width, height, r)
    ctx.arcTo(width, height, 0, height, r)
    ctx.arcTo(0, height, 0, 0, r)
    ctx.arcTo(0, 0, width, 0, r)
    ctx.closePath()
    ctx.stroke()

    // 5. Monospace ID stamp in corner
    const num = String(idx + 1).padStart(2, '0')
    ctx.fillStyle = 'rgba(143, 196, 255, 0.45)'
    ctx.font = '600 24px ui-monospace, monospace'
    ctx.textBaseline = 'top'
    ctx.fillText(`SYS//${num}`, 24, 22)

    // 6. Subtle horizontal telemetry line
    ctx.strokeStyle = 'rgba(77, 115, 217, 0.35)'
    ctx.lineWidth = 1.0
    ctx.beginPath()
    ctx.moveTo(24, height - 32)
    ctx.lineTo(width - 24, height - 32)
    ctx.stroke()

    const tex = new THREE.CanvasTexture(canvas)
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  })
}

// ─── Card Data Model ─────────────────────────────────────────────────────────

export interface CardData {
  id: string
  index: number
  isReal: boolean
  project?: ProjectItem
  cardW: number
  cardH: number
  localX: number
  localY: number
  z_start: number
  xPercent: number
  yPercent: number
  pFocus?: number
}

// ─── Build Card Field with 8x6 Grid (Left, Right, and Between) ───────────────

export function createFlightCards(realProjects: ProjectItem[]): CardData[] {
  const cards: CardData[] = []
  const rng = mulberry32(123456)

  // Full 8 columns x 6 rows template grid layout
  const cols = 8
  const rows = 6
  const baseWidth = 21.0 // 2100px (105vw equivalent)
  const gap = 0.40       // 40px (2vw equivalent)
  const cardW = (baseWidth - (cols - 1) * gap) / cols // ~2.275
  const cardH = cardW / 1.5                           // ~1.517

  // Schedule for the 7 real projects:
  // Distributed across Left, Right, and in Between (center-left / center-right)
  const realSchedules = [
    { col: 2, row: 2, pTarget: 0.35, side: 'L' },   // 0: JeevaLink (mid-left)
    { col: 5, row: 3, pTarget: 0.44, side: 'R' },   // 1: ChitGuard (mid-right)
    { col: 3, row: 3, pTarget: 0.53, side: 'C-L' }, // 2: DR Detection (between center & left)
    { col: 4, row: 2, pTarget: 0.62, side: 'C-R' }, // 3: CashPilot (between center & right)
    { col: 1, row: 3, pTarget: 0.71, side: 'L' },   // 4: MediGuard AI (wide-left)
    { col: 6, row: 2, pTarget: 0.80, side: 'R' },   // 5: HireConnect (wide-right)
    { col: 3, row: 2, pTarget: 0.89, side: 'C-L' }, // 6: Campus IMS (between center & left)
  ]

  const realSlotMap = new Map<number, number>()
  realSchedules.forEach((sched, projIdx) => {
    const slotIdx = sched.row * cols + sched.col
    realSlotMap.set(slotIdx, projIdx)
  })

  let cardIndex = 0

  // 1. Primary 48-slot grid (8 columns x 6 rows)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const slotIdx = r * cols + c
      const localX = (c - 3.5) * (cardW + gap)
      const localY = (2.5 - r) * (cardH + gap)

      const isRealSlot = realSlotMap.has(slotIdx)
      const projIdx = isRealSlot ? realSlotMap.get(slotIdx)! : -1
      const proj = isRealSlot && projIdx < realProjects.length ? realProjects[projIdx] : undefined

      if (isRealSlot && proj) {
        const sched = realSchedules[projIdx]
        // Back-solve z_start so hero reaches peak distance 5.5 at pTarget
        const z_start = 9.5 - 65.0 * sched.pTarget

        cards.push({
          id: proj.id,
          index: cardIndex++,
          isReal: true,
          project: proj,
          cardW,
          cardH,
          localX,
          localY,
          z_start,
          xPercent: (c < 4 ? -1 : 1) * 15,
          yPercent: 0,
          pFocus: sched.pTarget,
        })
      } else {
        // Placeholder grid card: staggered depth
        // Spread between -50.0 and -16.0
        const randZ = -50.0 + rng() * 34.0
        const xPercent = (rng() * 2 - 1) * 60
        const yPercent = (rng() * 2 - 1) * 40

        cards.push({
          id: `ph_grid_${slotIdx}`,
          index: cardIndex++,
          isReal: false,
          cardW,
          cardH,
          localX,
          localY,
          z_start: randZ,
          xPercent,
          yPercent,
        })
      }
    }
  }

  // 2. 24 Depth Placeholders: spread across columns and rows in deeper space
  for (let k = 0; k < 24; k++) {
    const c = (k * 3 + 1) % cols
    const r = (k * 2 + 1) % rows
    const localX = (c - 3.5) * (cardW + gap) + (rng() * 2 - 1) * 0.9
    const localY = (2.5 - r) * (cardH + gap) + (rng() * 2 - 1) * 0.7
    const z_start = -58.0 + rng() * 26.0 // [-58.0, -32.0]
    const xPercent = (rng() * 2 - 1) * 70
    const yPercent = (rng() * 2 - 1) * 45

    cards.push({
      id: `ph_depth_${k}`,
      index: cardIndex++,
      isReal: false,
      cardW,
      cardH,
      localX,
      localY,
      z_start,
      xPercent,
      yPercent,
    })
  }

  return cards
}

// ─── Roller Coaster Hill Transform Function ──────────────────────────────────

export function getCardTransform(card: CardData, flightProgress: number) {
  const p = Math.max(0, Math.min(1.0, flightProgress))

  // 1. Z Travel along flight path (z: 0 -> 65.0)
  const z = card.z_start + 65.0 * p
  const d = 15.0 - z // Distance in front of camera (camera is at z = 15.0)
  const hasPassed = d <= 0.4

  // 2. Smooth Roller Coaster Hill Trajectory Y(d) & Pitch Angle rotX(d):
  // Peak viewing crest is broad and comfortable across d in [4.5, 6.5] at eye level.
  let hillDeltaY = 0
  let hillRotXDeg = 0

  if (d > 6.5) {
    // Climbing up from the background:
    // Cards start lower down in the darkness and smoothly rise to 0 as they approach
    const climb = d - 6.5
    hillDeltaY = -0.12 * climb
    hillRotXDeg = Math.max(-28.0, -1.8 * climb)
  } else if (d < 4.5) {
    // Gentle downward curve past the peak (no sudden cliff drop):
    // Smooth, slow bend as the card sweeps down past the viewer
    const drop = 4.5 - d
    hillDeltaY = -0.16 * Math.pow(drop, 1.5)
    hillRotXDeg = Math.min(14.0, 3.2 * drop)
  } else {
    // Flat peak crest (d in [4.5, 6.5]): upright, level at eye level
    hillDeltaY = 0
    hillRotXDeg = 0
  }

  // 3. Lateral position X:
  // Each card maintains its individual track (left, right, between)
  const driftX = ((card.xPercent * p) / 100) * card.cardW
  const x = card.localX + driftX

  // 4. Vertical position Y:
  // Base localY + smooth roller coaster hill trajectory
  const y = card.localY + hillDeltaY

  // 5. Dynamic banking roll and pitch
  const rotXRad = (hillRotXDeg * Math.PI) / 180
  const rotZRad = (x / 8.0) * Math.sin(-rotXRad) * 0.22

  // 6. Depth Brightness:
  // Front cards are bright (normal 1.0).
  // Backside cards are darker (down to 0.20 at d >= 35.0), smoothly brightening to normal as they approach!
  let brightness = 1.0
  if (d > 5.5) {
    const t = Math.min(1.0, (d - 5.5) / 28.0)
    brightness = 1.0 - t * 0.80 // 1.0 down to 0.20
  }

  // 7. Distance fade:
  // Cards remain visible as darker silhouettes up to d = 38.0, gently fading to 0 by d = 45.0
  let distFade = 1.0
  if (d > 38.0) {
    distFade = Math.max(0, 1.0 - (d - 38.0) / 7.0)
  }

  // 8. Near-lens dissolve (as card gently exits below camera lens)
  let lensDissolve = 1.0
  if (d < 2.0) {
    lensDissolve = smoothstep(0.4, 2.0, d)
  }
  if (d <= 0.4) lensDissolve = 0

  // 9. Intro fade smoothly from pure black (handover from monitor)
  const introFactor = smoothstep(0.0, 0.05, p)

  // Total opacity
  const totalOpacity = introFactor * distFade * lensDissolve * (card.isReal ? 1.0 : 0.90)
  const visible = !hasPassed && totalOpacity > 0.01 && p < 1.0

  return {
    x,
    y,
    z,
    d,
    rotXRad,
    rotYRad: 0,
    rotZRad,
    brightness,
    totalOpacity,
    visible,
  }
}

// ─── React Component: DepthFlythrough ────────────────────────────────────────

export interface CardRect {
  left: number
  top: number
  width: number
  height: number
}

interface DepthFlythroughProps {
  visible?: boolean
  onSelectProject?: (project: ProjectItem, startRect?: CardRect) => void
  isDetailOpen?: boolean
}

export function DepthFlythrough({
  visible = true,
  onSelectProject,
  isDetailOpen = false,
}: DepthFlythroughProps) {
  const { gl, camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  const isDetailOpenRef = useRef(isDetailOpen)
  useEffect(() => {
    isDetailOpenRef.current = isDetailOpen
  }, [isDetailOpen])

  // Interactive state
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastSelectRef = useRef(0)

  // Card geometry: rounded rectangle
  const cardGeom = useMemo(() => {
    const cardW = 2.275
    const cardH = cardW / 1.5
    return makeRoundedRect(cardW, cardH, 0.08, 10)
  }, [])

  // Load real project textures
  const projectTextures = useMemo(() => {
    const map = new Map<string, THREE.Texture>()
    const loader = new THREE.TextureLoader()
    projects.forEach((p) => {
      const tex = loader.load(p.image, (t) => {
        t.generateMipmaps = true
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.magFilter = THREE.LinearFilter
        gl.initTexture(t)
      })
      map.set(p.id, tex)
    })
    return map
  }, [gl])

  // Placeholder textures: Black boxes with blue outline (matching monitor)
  const placeholderTextures = useMemo(() => createBlackBoxPlaceholderTextures(), [])

  // Generate cards with 8x6 grid layout
  const cards = useMemo(() => createFlightCards(projects), [])

  // Create materials for all cards
  const cardMaterials = useMemo(() => {
    return cards.map((card) => {
      if (card.isReal && card.project) {
        return new THREE.MeshBasicMaterial({
          map: projectTextures.get(card.project.id),
          transparent: true,
          opacity: 0,
          depthWrite: true,
          depthTest: true,
          side: THREE.DoubleSide,
          color: new THREE.Color(0xffffff),
        })
      } else {
        const tex = placeholderTextures[card.index % placeholderTextures.length]
        return new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          depthTest: true,
          side: THREE.DoubleSide,
        })
      }
    })
  }, [cards, projectTextures, placeholderTextures])

  // Multi-tier button drop shadow texture and materials (user specification)
  const shadowTexture = useMemo(() => createButtonShadowTexture(), [])
  const shadowGeom = useMemo(() => new THREE.PlaneGeometry(4.8533, 4.8533), [])
  const shadowMaterials = useMemo(() => {
    return cards.map((card) => {
      if (card.isReal) {
        return new THREE.MeshBasicMaterial({
          map: shadowTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          depthTest: true,
          side: THREE.DoubleSide,
        })
      }
      return null
    })
  }, [cards, shadowTexture])

  // Object and mesh refs
  const cardContainerRefs = useRef<(THREE.Object3D | null)[]>([])
  const projectMeshRefs = useRef<(THREE.Mesh | null)[]>([])
  const shadowMeshRefs = useRef<(THREE.Mesh | null)[]>([])
  const hoverProgressRef = useRef<number[]>([])

  // Pre-warm WebGL shaders
  useEffect(() => {
    if (groupRef.current) {
      gl.compile(groupRef.current, camera)
    }
  }, [gl, camera])

  // Disposal
  useEffect(() => {
    return () => {
      cardGeom.dispose()
      shadowGeom.dispose()
      shadowTexture.dispose()
      shadowMaterials.forEach((m) => m?.dispose())
      cardMaterials.forEach((m) => m.dispose())
      projectTextures.forEach((t) => t.dispose())
      placeholderTextures.forEach((t) => t.dispose())
    }
  }, [cardGeom, shadowGeom, shadowTexture, shadowMaterials, cardMaterials, projectTextures, placeholderTextures])

  // Pointer cursor handling
  useEffect(() => {
    document.body.style.cursor = hoveredId ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hoveredId])

  const getCardScreenRect = useCallback(
    (index: number): CardRect => {
      const mesh = projectMeshRefs.current[index]
      if (!mesh || !camera) {
        const w = Math.min(320, window.innerWidth * 0.3)
        const h = w / 1.5
        return {
          left: (window.innerWidth - w) / 2,
          top: (window.innerHeight - h) / 2,
          width: w,
          height: h,
        }
      }

      const cardW = 2.275
      const cardH = cardW / 1.5
      mesh.updateMatrixWorld(true)

      const corners = [
        new THREE.Vector3(-cardW / 2, -cardH / 2, 0).applyMatrix4(mesh.matrixWorld).project(camera),
        new THREE.Vector3( cardW / 2, -cardH / 2, 0).applyMatrix4(mesh.matrixWorld).project(camera),
        new THREE.Vector3( cardW / 2,  cardH / 2, 0).applyMatrix4(mesh.matrixWorld).project(camera),
        new THREE.Vector3(-cardW / 2,  cardH / 2, 0).applyMatrix4(mesh.matrixWorld).project(camera),
      ]

      const screenPts = corners.map((v) => ({
        x: (v.x * 0.5 + 0.5) * window.innerWidth,
        y: (-v.y * 0.5 + 0.5) * window.innerHeight,
      }))

      const minX = Math.min(...screenPts.map((p) => p.x))
      const maxX = Math.max(...screenPts.map((p) => p.x))
      const minY = Math.min(...screenPts.map((p) => p.y))
      const maxY = Math.max(...screenPts.map((p) => p.y))

      return {
        left: Math.max(0, minX),
        top: Math.max(0, minY),
        width: Math.max(80, maxX - minX),
        height: Math.max(50, maxY - minY),
      }
    },
    [camera]
  )

  const triggerSelect = useCallback(
    (proj: ProjectItem, index: number) => {
      const now = performance.now()
      if (now - lastSelectRef.current < 250) return
      lastSelectRef.current = now
      const rect = getCardScreenRect(index)
      onSelectProject?.(proj, rect)
    },
    [onSelectProject, getCardScreenRect]
  )

  // ─── Render Loop ───────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!visible) return

    const raw = heroProgress.get()
    const handover = FLIGHT_CONFIG.HANDOVER_P
    if (raw < handover) {
      for (let i = 0; i < cards.length; i++) {
        const obj = cardContainerRefs.current[i]
        if (obj) obj.visible = false
      }
      heroProgress.debug.activeCards = 0
      heroProgress.activeProjectTitle = ''
      heroProgress.activeProjectOpacity = 0
      return
    }

    const flightP = Math.max(0, Math.min(1.0, (raw - handover) / (1 - handover)))
    const safeDelta = Math.min(delta, 0.05)

    let activeCount = 0
    let closestDist = Infinity
    let activeTitle = ''
    let activeLabelOpacity = 0

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const obj = cardContainerRefs.current[i]
      const mat = cardMaterials[i]
      if (!obj || !mat) continue

      const t = getCardTransform(card, flightP)

      if (!t.visible) {
        obj.visible = false
      } else {
        obj.visible = true
        activeCount++

        obj.position.set(t.x, t.y, t.z)
        obj.rotation.set(t.rotXRad, 0, t.rotZRad)

        mat.opacity = t.totalOpacity

        // Front cards are normal brightness (1.0), back ones are darker (down to 0.20)
        const b = t.brightness
        mat.color.setRGB(b, b, b)

        if (card.isReal && card.project) {
          const isHovered = hoveredId === card.project.id
          const targetHover = isHovered ? 1.0 : 0.0
          const curHover = hoverProgressRef.current[i] || 0
          const nextHover = THREE.MathUtils.damp(curHover, targetHover, 14, safeDelta)
          hoverProgressRef.current[i] = nextHover

          // Button scale pop on hover (1.0 -> 1.05)
          const s = 1.0 + 0.05 * nextHover
          obj.scale.set(s, s, s)

          // Card mesh lifts forward toward user on hover
          const pMesh = projectMeshRefs.current[i]
          if (pMesh) {
            pMesh.position.z = 0.08 * nextHover
          }

          // Button multi-tier shadow plane behind card
          const sMesh = shadowMeshRefs.current[i]
          const sMat = shadowMaterials[i]
          if (sMesh && sMat) {
            sMesh.visible = nextHover > 0.005 && t.totalOpacity > 0.01
            sMat.opacity = t.totalOpacity * nextHover
          }

          const distToFocus = Math.abs(flightP - card.pFocus!)
          if (distToFocus < closestDist) {
            closestDist = distToFocus
            if (distToFocus < 0.05) {
              activeTitle = card.project?.title || ''
              activeLabelOpacity = 1.0 - smoothstep(0.015, 0.05, distToFocus)
            }
          }
        }
      }
    }

    heroProgress.debug.activeCards = activeCount
    heroProgress.activeProjectTitle = activeTitle
    heroProgress.activeProjectOpacity = activeLabelOpacity
  })

  return (
    <group ref={groupRef} position={[0, FLIGHT_CONFIG.CAMERA_Y, 0]} visible={visible}>
      {cards.map((card, i) => {
        const mat = cardMaterials[i]
        const isReal = card.isReal && card.project

        if (!isReal) {
          return (
            <mesh
              key={`ph-${card.id}-${card.index}`}
              ref={(el) => {
                cardContainerRefs.current[i] = el
              }}
              geometry={cardGeom}
              material={mat}
              renderOrder={1}
              raycast={() => null}
              frustumCulled={false}
            />
          )
        }

        const proj = card.project!
        const sMat = shadowMaterials[i]
        return (
          <group
            key={`real-${proj.id}`}
            ref={(el) => {
              cardContainerRefs.current[i] = el
            }}
          >
            {/* 1. Multi-tier Button Shadow (Only on Projects) */}
            {sMat && (
              <mesh
                ref={(el) => {
                  shadowMeshRefs.current[i] = el
                }}
                position={[0, 0.1326, -0.015]}
                geometry={shadowGeom}
                material={sMat}
                renderOrder={9}
                raycast={() => null}
                frustumCulled={false}
              />
            )}

            {/* 2. Interactive Real Project Card */}
            <mesh
              ref={(el) => {
                projectMeshRefs.current[i] = el
              }}
              geometry={cardGeom}
              material={mat}
              renderOrder={10}
              frustumCulled={false}
              onPointerEnter={(e) => {
                e.stopPropagation()
                if (!isDetailOpenRef.current) setHoveredId(proj.id)
              }}
              onPointerLeave={(e) => {
                e.stopPropagation()
                setHoveredId((curr) => (curr === proj.id ? null : curr))
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
                downRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
              }}
              onPointerUp={(e) => {
                e.stopPropagation()
                if (!downRef.current) return
                const dx = Math.abs(e.clientX - downRef.current.x)
                const dy = Math.abs(e.clientY - downRef.current.y)
                const dt = performance.now() - downRef.current.t
                downRef.current = null
                if (dx < 6 && dy < 6 && dt < 450) {
                  triggerSelect(proj, i)
                }
              }}
            />
          </group>
        )
      })}
    </group>
  )
}

export default DepthFlythrough
