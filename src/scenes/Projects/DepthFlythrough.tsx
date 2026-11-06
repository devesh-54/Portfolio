/**
 * DepthFlythrough.tsx
 *
 * Selected Work depth flythrough implementing the golden-angle spiral placement
 * and linear tunnel flight from the reference prototype.
 * Pure function of scroll progress, zero falling motion, perfectly reversible.
 */

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { FLIGHT_CONFIG } from './flightConfig'
import { projects, type ProjectItem } from '../../config/projects'
import { heroProgress } from '../Welcome/heroProgress'
import { createCardPixelMaterial } from './CardPixelMaterial'
import { createPlaceholderPixelMaterial } from './PlaceholderPixelMaterial'

// ─── Deterministic PRNG ───────────────────────────────────────────────────────

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

// ─── Rounded Rectangle Geometry Helper ────────────────────────────────────────

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

// ─── Button Drop Shadow Texture ───────────────────────────────────────────────

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
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function createButtonShadowTexture(): THREE.CanvasTexture {
  const width = 512
  const height = 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const cardW = 320
  const cardH = cardW / 1.6
  const cardX = (width - cardW) / 2
  const cardY = (height - cardH) / 2
  const r = 16

  const shadowLayers = [
    { ox: 0, oy: 24, blur: 40, color: 'rgba(0, 0, 0, 0.40)' },
    { ox: 0, oy: 12, blur: 20, color: 'rgba(0, 0, 0, 0.25)' },
    { ox: 0, oy: 4,  blur: 8,  color: 'rgba(0, 0, 0, 0.20)' },
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

  const tex = new THREE.CanvasTexture(canvas)
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

// ─── Placeholder: Deep OLED Black Cyber Block with High-Contrast Blue/Cyan Details ──

function createBlackBoxPlaceholderTextures(): THREE.CanvasTexture[] {
  const width = 384
  const height = 256
  const r = 16

  return [0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    // 1. Deep Solid Jet Black Background (#000000)
    ctx.fillStyle = '#000000'
    drawRoundedRectPath(ctx, 0, 0, width, height, r)
    ctx.fill()

    // 2. Technical Blueprint Grid Lines (crisp cyan-tinted cyber lines)
    ctx.strokeStyle = 'rgba(47, 208, 255, 0.16)'
    ctx.lineWidth = 1.0
    const step = 32
    for (let x = step; x < width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = step; y < height; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // 3. Technical Corner Tick Marks (Electric Cyan #2fd0ff + Pure White Accents)
    ctx.strokeStyle = '#2fd0ff'
    ctx.lineWidth = 2.5
    const tick = 20
    const inset = 12
    ctx.beginPath()
    ctx.moveTo(inset, inset + tick)
    ctx.lineTo(inset, inset)
    ctx.lineTo(inset + tick, inset)

    ctx.moveTo(width - inset - tick, inset)
    ctx.lineTo(width - inset, inset)
    ctx.lineTo(width - inset, inset + tick)

    ctx.moveTo(inset, height - inset - tick)
    ctx.lineTo(inset, height - inset)
    ctx.lineTo(inset + tick, height - inset)

    ctx.moveTo(width - inset - tick, height - inset)
    ctx.lineTo(width - inset, height - inset)
    ctx.lineTo(width - inset, height - inset - tick)
    ctx.stroke()

    // White corner dots for high-contrast technical precision
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(inset - 1, inset - 1, 3, 3)
    ctx.fillRect(width - inset - 2, inset - 1, 3, 3)
    ctx.fillRect(inset - 1, height - inset - 2, 3, 3)
    ctx.fillRect(width - inset - 2, height - inset - 2, 3, 3)

    // 4. Subtle Outer Border Line (Dark Blue-Cyan)
    ctx.strokeStyle = 'rgba(77, 115, 217, 0.65)'
    ctx.lineWidth = 1.8
    drawRoundedRectPath(ctx, 0, 0, width, height, r)
    ctx.stroke()

    // 5. Monospace ID Stamp (Crisp Cyan #2fd0ff)
    const num = String(idx + 1).padStart(2, '0')
    ctx.fillStyle = '#2fd0ff'
    ctx.font = '700 24px ui-monospace, monospace'
    ctx.textBaseline = 'top'
    ctx.fillText(`SYS//${num}`, 24, 22)

    // 6. Technical Status Label
    ctx.fillStyle = 'rgba(143, 210, 255, 0.60)'
    ctx.font = '600 12px ui-monospace, monospace'
    ctx.fillText('NODE // ONLINE', 24, 52)

    // 7. Micro Data Hash on Bottom Right
    const hex = (idx * 0x3d + 0x4a).toString(16).toUpperCase().padStart(4, '0')
    ctx.fillStyle = 'rgba(255, 255, 255, 0.40)'
    ctx.font = '500 11px ui-monospace, monospace'
    ctx.fillText(`0x${hex} · V2.4`, width - 110, height - 28)

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
  geomIdx: number
  x: number
  y: number
  z: number
  rotX: number
  rotY: number
  rotZ?: number
  scale?: number
  pFocus?: number
}

// ─── Build Card Field with Reference Placement ────────────────────────────────

export function createFlightCards(realProjects: ProjectItem[]): CardData[] {
  const cards: CardData[] = []
  const rng = mulberry32(123456)
  const rnd = (min: number, max: number) => min + rng() * (max - min)

  const DEPTH = 150.0
  const realList = realProjects.slice(0, 7)
  let cardIndex = 0

  // 1. 70 Placeholders flanking at the SIDES, periphery and deep tunnel
  // Center corridor (|x| < 6.2 && |y| < 4.0 && z > -28) is kept 100% CLEAR for real projects!
  const PLACEHOLDERS = 70
  for (let i = 0; i < PLACEHOLDERS; i++) {
    const w = rnd(2.0, 4.2)
    const h = w * rnd(0.6, 0.75)

    // Side selection: 0 = Left Wing, 1 = Right Wing, 2 = Top Flank, 3 = Bottom Flank, 4 = Deep Periphery
    const sideChoice = i % 5
    let x = 0
    let y = 0
    let z = 0

    if (sideChoice === 0) {
      // Left Wing
      x = rnd(-18.0, -7.0)
      y = rnd(-5.5, 5.5)
      z = -rnd(8.0, 75.0)
    } else if (sideChoice === 1) {
      // Right Wing
      x = rnd(7.0, 18.0)
      y = rnd(-5.5, 5.5)
      z = -rnd(8.0, 75.0)
    } else if (sideChoice === 2) {
      // Top Flank
      x = rnd(-14.0, 14.0)
      y = rnd(4.6, 10.5)
      z = -rnd(14.0, 95.0)
    } else if (sideChoice === 3) {
      // Bottom Flank
      x = rnd(-14.0, 14.0)
      y = rnd(-10.5, -4.6)
      z = -rnd(14.0, 95.0)
    } else {
      // Deep tunnel periphery
      const a = rnd(0, Math.PI * 2)
      const r = rnd(6.5, 18.0)
      x = Math.cos(a) * r * 1.5
      y = Math.sin(a) * r * 0.9
      z = -rnd(28.0, DEPTH)
    }

    // Safety: ensure no placeholder ever overlaps the center sofa cluster
    if (Math.abs(x) < 6.4 && Math.abs(y) < 4.2 && z > -28.0) {
      x += x >= 0 ? 6.8 : -6.8
    }

    const rotY = rnd(-0.35, 0.35)
    const rotX = rnd(-0.15, 0.15)
    const rotZ = rnd(-0.08, 0.08)

    cards.push({
      id: `ph_${i}`,
      index: cardIndex++,
      isReal: false,
      cardW: w,
      cardH: h,
      geomIdx: i % 4,
      x,
      y,
      z,
      rotX,
      rotY,
      rotZ,
    })
  }

  // 2. Real Project Cards in Floating 3D "Invisible Sofa" Layout
  // Based on user specification and reference image (media_1793958850046_b4186054.jpg):
  // - Slot 0 (Project 01): Prominent center focal card, largest, slightly in front
  // - Slot 1 (Project 02): Top headrest, angled slightly forward/down
  // - Slot 2 (Project 03): Middle-left armrest, angled inward/right
  // - Slot 3 (Project 04): Middle-right backrest, angled inward/left
  // - Slot 4 (Project 05): Bottom-right lounge cushion, angled up/left
  // - Slot 5 (Project 06): Bottom-left lounge cushion, angled up/right
  // - Slot 6 (Project 07): Upper-right accent backrest
  const sofaSlots = [
    {
      // Slot 0: Center / Middle (Project 01 - largest focal card)
      x: -0.3,
      y: -0.1,
      z: -15.0,
      rotX: 0.06,
      rotY: -0.06,
      rotZ: -0.04,
      scale: 1.05,
    },
    {
      // Slot 1: Top / Headrest (Project 02)
      x: -2.2,
      y: 3.4,
      z: -18.5,
      rotX: -0.16,
      rotY: 0.08,
      rotZ: 0.05,
      scale: 0.90,
    },
    {
      // Slot 2: Mid-Left Armrest (Project 03)
      x: -5.2,
      y: 1.0,
      z: -17.5,
      rotX: 0.05,
      rotY: 0.22,
      rotZ: 0.06,
      scale: 0.88,
    },
    {
      // Slot 3: Mid-Right Backrest (Project 04)
      x: 4.4,
      y: 1.8,
      z: -19.5,
      rotX: -0.06,
      rotY: -0.22,
      rotZ: -0.04,
      scale: 0.92,
    },
    {
      // Slot 4: Bottom-Right Cushion (Project 05)
      x: 5.4,
      y: -2.5,
      z: -17.0,
      rotX: 0.12,
      rotY: -0.18,
      rotZ: 0.04,
      scale: 0.95,
    },
    {
      // Slot 5: Bottom-Left Cushion (Project 06)
      x: -5.2,
      y: -2.8,
      z: -16.0,
      rotX: 0.14,
      rotY: 0.18,
      rotZ: -0.05,
      scale: 0.92,
    },
    {
      // Slot 6: Upper-Right Accent (Project 07)
      x: 5.8,
      y: 3.6,
      z: -21.0,
      rotX: -0.08,
      rotY: -0.15,
      rotZ: 0.03,
      scale: 0.82,
    },
  ]

  const projW = 5.6
  const projH = projW / 1.6 // 3.5 (16:10 aspect ratio)

  realList.forEach((p, i) => {
    const slot = sofaSlots[i % sofaSlots.length]

    // Subtle deterministic organic jitter so each card feels naturally hand-placed
    const jitterX = rnd(-0.12, 0.12)
    const jitterY = rnd(-0.12, 0.12)
    const jitterZ = rnd(-0.35, 0.35)
    const jitterRot = rnd(-0.02, 0.02)

    const x = slot.x + jitterX
    const y = slot.y + jitterY
    const z = slot.z + jitterZ
    const rotX = slot.rotX + jitterRot
    const rotY = slot.rotY + jitterRot
    const rotZ = slot.rotZ + jitterRot
    const scale = slot.scale

    // Focus moment progress: where camZ reaches z + 6.0
    // camZ = 8.0 - flightP * 160.0
    const pFocus = Math.max(0, Math.min(1.0, (8.0 - (z + 6.0)) / 160.0))

    cards.push({
      id: p.id,
      index: cardIndex++,
      isReal: true,
      project: p,
      cardW: projW,
      cardH: projH,
      geomIdx: 0,
      x,
      y,
      z,
      rotX,
      rotY,
      rotZ,
      scale,
      pFocus,
    })
  })

  return cards
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

  // Real project card geometry
  const realCardGeom = useMemo(() => {
    return makeRoundedRect(5.6, 3.5, 0.18, 12)
  }, [])

  // 4 variants of placeholder geometries
  const phGeoms = useMemo(() => [
    makeRoundedRect(2.6, 1.7, 0.10, 8),
    makeRoundedRect(3.4, 2.2, 0.12, 8),
    makeRoundedRect(4.2, 2.8, 0.14, 8),
    makeRoundedRect(4.8, 3.2, 0.16, 8),
  ], [])

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

  // Placeholder textures
  const placeholderTextures = useMemo(() => createBlackBoxPlaceholderTextures(), [])

  // Generate cards
  const cards = useMemo(() => createFlightCards(projects), [])

  // Create materials for all cards
  const cardMaterials = useMemo(() => {
    return cards.map((card) => {
      if (card.isReal && card.project) {
        const tex = projectTextures.get(card.project.id)
        if (tex) {
          return createCardPixelMaterial(
            tex,
            card.index * 0.17,
            card.cardW / card.cardH,
            20.0
          )
        }
        return new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: true,
          depthTest: true,
          side: THREE.DoubleSide,
          color: new THREE.Color(0xffffff),
        })
      } else {
        const tex = placeholderTextures[card.index % placeholderTextures.length]
        return createPlaceholderPixelMaterial(
          tex,
          card.index * 0.17,
          card.cardW / card.cardH,
          20.0
        )
      }
    })
  }, [cards, projectTextures, placeholderTextures])

  // Multi-tier button drop shadow texture and materials
  const shadowTexture = useMemo(() => createButtonShadowTexture(), [])
  const shadowGeom = useMemo(() => new THREE.PlaneGeometry(6.4, 4.2), [])
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realCardGeom.dispose()
      shadowGeom.dispose()
      phGeoms.forEach((g) => g.dispose())
      shadowTexture.dispose()
      shadowMaterials.forEach((m) => m?.dispose())
      cardMaterials.forEach((m) => m.dispose())
      projectTextures.forEach((t) => t.dispose())
      placeholderTextures.forEach((t) => t.dispose())
    }
  }, [
    realCardGeom,
    shadowGeom,
    phGeoms,
    shadowTexture,
    shadowMaterials,
    cardMaterials,
    projectTextures,
    placeholderTextures,
  ])

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
        const w = Math.min(360, window.innerWidth * 0.4)
        const h = w / 1.6
        return {
          left: (window.innerWidth - w) / 2,
          top: (window.innerHeight - h) / 2,
          width: w,
          height: h,
        }
      }

      const cardScale = cards[index]?.scale || 1.0
      const cardW = 5.6 * cardScale
      const cardH = 3.5 * cardScale
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

  // ─── Render Loop (Pure Function of Scroll, Zero Falling Motion) ────────────
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

    const DEPTH = 150.0
    const camZ = 8.0 - flightP * (DEPTH + 10.0)

    let activeCount = 0
    let nearProject: ProjectItem | null = null
    let minProjectDist = 1e9

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const obj = cardContainerRefs.current[i]
      const mat = cardMaterials[i]
      if (!obj || !mat) continue

      // Distance in front of camera
      const d = camZ - card.z

      // Visible when in front of lens and within fog distance
      const isVisible = d > 0.4 && d < 95.0

      if (!isVisible) {
        obj.visible = false
        continue
      }

      obj.visible = true
      activeCount++

      // Card stays at its floating 3D placement (zero falling movement!)
      obj.position.set(card.x, card.y, card.z)
      obj.rotation.set(card.rotX, card.rotY, card.rotZ || 0)

      // Smooth lens dissolve right as card passes camera lens
      // Keeps cards 100% solid, fully opaque in reading zone [1.8, 55.0]
      const lensDissolve = smoothstep(0.4, 1.8, d)

      // Distant fog fade to white
      let distFade = 1.0
      if (d > 55.0) {
        distFade = Math.max(0, 1.0 - (d - 55.0) / 25.0)
      }

      const totalOpacity = lensDissolve * distFade

      if (card.isReal && card.project) {
        const pMat = mat as THREE.ShaderMaterial
        if (pMat.uniforms) {
          pMat.uniforms.uOpacity.value = totalOpacity
          pMat.uniforms.uBrightness.value = 1.0
          pMat.uniforms.uFlickerStep.value = Math.floor(flightP * 120)

          // Distance-based Left-to-Right Graham Mast pixel wipe:
          // In sofa view (d in [14, 34]), cards have their pixel wave smoothly sweeping across,
          // revealing the project photos just like in the reference image!
          let waveProg = 0.0
          if (d <= 14.0) {
            waveProg = 1.0
          } else if (d < 34.0) {
            waveProg = 1.0 - (d - 14.0) / 20.0
          } else {
            waveProg = 0.0
          }
          pMat.uniforms.uWaveProgress.value = waveProg
        }

        const isHovered = hoveredId === card.project.id
        const targetHover = isHovered ? 1.0 : 0.0
        const curHover = hoverProgressRef.current[i] || 0
        const nextHover = THREE.MathUtils.damp(curHover, targetHover, 14, safeDelta)
        hoverProgressRef.current[i] = nextHover

        if (pMat.uniforms) {
          pMat.uniforms.uHover.value = nextHover
        }

        // Button scale pop on hover (1.0 -> 1.05) with individual card scale
        const baseScale = card.scale || 1.0
        const s = baseScale * (1.0 + 0.05 * nextHover)
        obj.scale.set(s, s, s)

        // Drop shadow mesh behind card
        const sMesh = shadowMeshRefs.current[i]
        const sMat = shadowMaterials[i]
        if (sMesh && sMat) {
          sMesh.visible = totalOpacity > 0.01
          sMat.opacity = totalOpacity * (0.85 + 0.15 * nextHover)
        }

        // Nearest project detection for active title label (matches reference code)
        if (d > 2.0 && d < 34.0 && d < minProjectDist) {
          minProjectDist = d
          nearProject = card.project
        }
      } else {
        // Placeholder card material: dynamic Left-to-Right Graham Mast pixel wipe on dark black
        const phMat = mat as THREE.ShaderMaterial
        if (phMat.uniforms) {
          // Keep placeholders solid OLED black (opacity 1.0) while in view
          const phLensDissolve = smoothstep(0.4, 1.8, d)
          const phDistFade = d > 60.0 ? Math.max(0, 1.0 - (d - 60.0) / 25.0) : 1.0
          const phOpacity = phLensDissolve * phDistFade

          phMat.uniforms.uOpacity.value = phOpacity
          phMat.uniforms.uBrightness.value = 1.0
          phMat.uniforms.uFlickerStep.value = Math.floor(flightP * 120)

          // Distance-based Left-to-Right Graham Mast pixel wipe on placeholders:
          // d >= 28.0: dormant deep OLED black
          // d in [6.0, 28.0]: pixel wave sweeps across placeholder face
          // d <= 6.0: 100% illuminated technical cyber matrix
          let phWave = 0.0
          if (d <= 6.0) {
            phWave = 1.0
          } else if (d < 28.0) {
            phWave = 1.0 - (d - 6.0) / 22.0
          } else {
            phWave = 0.0
          }
          phMat.uniforms.uWaveProgress.value = phWave
        }
      }
    }

    heroProgress.debug.activeCards = activeCount
    heroProgress.activeProjectTitle = nearProject ? nearProject.title : ''
    heroProgress.activeProjectOpacity = nearProject ? 1.0 : 0.0
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
              geometry={phGeoms[card.geomIdx]}
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
                position={[0, 0.12, -0.02]}
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
              geometry={realCardGeom}
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
