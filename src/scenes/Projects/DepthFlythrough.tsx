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

// ─── Placeholder Shader Material with Optical Blur ────────────────────────────

function createPlaceholderShaderMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      uOpacity: { value: 0.0 },
      uBlur: { value: 0.0 },
      uBrightness: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float uOpacity;
      uniform float uBlur;
      uniform float uBrightness;
      varying vec2 vUv;

      vec4 sampleBlurred(sampler2D tex, vec2 uv, float blur) {
        if (blur <= 0.002) return texture2D(tex, uv);
        vec4 sum = texture2D(tex, uv) * 0.20;
        float weight = 0.20;
        float rBase = blur * 0.026;
        for (int i = 1; i <= 12; i++) {
          float fi = float(i);
          float angle = fi * 2.39996323;
          float rad = sqrt(fi / 12.0) * rBase;
          vec2 offset = vec2(cos(angle), sin(angle)) * rad;
          float w = 1.0 - (rad / (rBase * 1.25));
          sum += texture2D(tex, uv + offset) * w;
          weight += w;
        }
        return sum / weight;
      }

      void main() {
        vec4 texCol = sampleBlurred(map, vUv, uBlur);
        vec3 rgb = texCol.rgb * uBrightness;

        if (uBlur > 0.001) {
          float minEdge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
          float edgeSoft = smoothstep(0.0, 0.04 * uBlur, minEdge);
          rgb = mix(vec3(1.0, 1.0, 1.0), rgb, edgeSoft);
        }

        gl_FragColor = vec4(rgb, texCol.a * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  })
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

    // 2. Technical Blueprint Grid Lines (subtle dark lines, zero bright borders)
    ctx.strokeStyle = 'rgba(47, 208, 255, 0.08)'
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

    // 3. Monospace ID Stamp (Crisp Cyan #2fd0ff)
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
  waveWindow?: [number, number]
  pFocus?: number
}

// ─── Build Card Field with HTML Reference Placement & Gap Sizes ───────────────

export function createFlightCards(realProjects: ProjectItem[]): CardData[] {
  const cards: CardData[] = []
  const rng = mulberry32(123456)
  const rnd = (min: number, max: number) => min + rng() * (max - min)

  const DEPTH = FLIGHT_CONFIG.DEPTH || 126.0
  const realList = realProjects.slice(0, 7)
  let cardIndex = 0

  // 1. Compute project positions first (matching HTML gap sizes)
  // EXACT gaps size, aspect ratio, and positioning from the HTML reference:
  // w = 6.4, h = 4.0
  // a = i * 2.4, r = 3.4 + (i % 3) * 0.8
  // x = Math.cos(a) * r * 1.4
  // y = Math.sin(a) * r * 0.7
  // z = -(14 + i * ((150 - 30) / PROJECTS.length)) -> 17.142857 depth gap
  // rotY = -Math.cos(a) * 0.18
  const projW = 6.4
  const projH = 4.0
  const Z_START = 14.0
  const Z_GAP = (150.0 - 30.0) / 7.0 // 17.142857 from HTML

  const projSlots = realList.map((p, i) => {
    const a = i * 2.4
    const r = 3.4 + (i % 3) * 0.8
    const x = Math.cos(a) * r * 1.4
    const y = Math.sin(a) * r * 0.7
    const z = -(Z_START + i * Z_GAP)
    const rotY = -Math.cos(a) * 0.18
    const rotX = 0
    const rotZ = 0
    const pFocus = Math.max(0, Math.min(1.0, (8.0 - (z + 6.0)) / (DEPTH + 10.0)))
    return { p, i, x, y, z, rotX, rotY, rotZ, pFocus }
  })

  // 2. Static Placeholders: spread radially around tunnel axis (from HTML file)
  // Kept off the centre axis (r >= 3.5) so the camera flies between them
  // Crucial: remove any placeholder that sits in front of or blocks any project!
  const PLACEHOLDERS = 60
  for (let i = 0; i < PLACEHOLDERS; i++) {
    const w = rnd(2.2, 5.0)
    const h = w * rnd(0.6, 0.8)
    const a = rnd(0, Math.PI * 2)
    const r = rnd(3.5, 16.0)
    const x = Math.cos(a) * r * 1.6
    const y = Math.sin(a) * r * 0.9
    const z = -rnd(14.0, 122.0)
    const rotY = rnd(-0.35, 0.35)
    const rotX = rnd(-0.1, 0.1)

    // Check if this placeholder sits in the line of sight in front of any project card
    let isBlocked = false
    for (const slot of projSlots) {
      const dz = z - slot.z
      // In front if between camera and project: z is greater than slot.z (closer to camera)
      if (dz > -2.0 && dz < 30.0) {
        const dx = Math.abs(x - slot.x)
        const dy = Math.abs(y - slot.y)
        if (dx < 6.8 && dy < 4.5) {
          isBlocked = true
          break
        }
      }
    }
    if (isBlocked) continue // Remove placeholder that is in front of a project!

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
    })
  }

  // 3. Add Real Projects
  projSlots.forEach((slot) => {
    cards.push({
      id: slot.p.id,
      index: cardIndex++,
      isReal: true,
      project: slot.p,
      cardW: projW,
      cardH: projH,
      geomIdx: 0,
      x: slot.x,
      y: slot.y,
      z: slot.z,
      rotX: slot.rotX,
      rotY: slot.rotY,
      rotZ: slot.rotZ,
      scale: 1.0,
      pFocus: slot.pFocus,
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

  // Real project card geometry matching HTML w=6.4, h=4.0
  const realCardGeom = useMemo(() => {
    return makeRoundedRect(6.4, 4.0, 0.22, 12)
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
        return createPlaceholderShaderMaterial(tex)
      }
    })
  }, [cards, projectTextures, placeholderTextures])

  // Multi-tier button drop shadow texture and materials
  const shadowTexture = useMemo(() => createButtonShadowTexture(), [])
  const shadowGeom = useMemo(() => new THREE.PlaneGeometry(7.2, 4.8), [])
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
      const cardW = 6.4 * cardScale
      const cardH = 4.0 * cardScale
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
    const raw = heroProgress.get()
    const handover = FLIGHT_CONFIG.HANDOVER_P
    // Emergence begins as multiple white blocks are rushing and covering the screen
    const emergenceStart = handover - 0.012

    if (!visible || raw < emergenceStart) {
      if (groupRef.current) {
        groupRef.current.visible = false
      }
      for (let i = 0; i < cards.length; i++) {
        const obj = cardContainerRefs.current[i]
        if (obj) obj.visible = false
      }
      heroProgress.debug.activeCards = 0
      heroProgress.activeProjectTitle = ''
      heroProgress.activeProjectOpacity = 0
      return
    }

    if (groupRef.current) {
      groupRef.current.visible = true
    }

    // Emergence progression into full white screen (0.0 at emergenceStart -> 1.0 at handover)
    const isEmerging = raw < handover
    const tEmerge = isEmerging
      ? Math.max(0, Math.min(1.0, (raw - emergenceStart) / (handover - emergenceStart)))
      : 1.0

    // Smooth emergence opacity: Project 01 and nearby cards slowly appear with soft blur
    const entryOpacity = isEmerging ? smoothstep(0.0, 1.0, tEmerge) : 1.0
    // Initial emergence blur: slowly goes off as white screen covers the monitor, clearing by tEmerge ~ 0.95
    const entryBlur = isEmerging ? (1.0 - smoothstep(0.10, 0.95, tEmerge)) : 0.0

    const flightP = raw >= handover ? Math.max(0, Math.min(1.0, (raw - handover) / (1 - handover))) : 0
    const safeDelta = Math.min(delta, 0.05)

    const DEPTH = FLIGHT_CONFIG.DEPTH || 126.0
    const camZ = 8.0 - flightP * (DEPTH + 10.0)

    let activeCount = 0
    let nearProject: ProjectItem | null = null
    let minProjectDist = 1e9

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const obj = cardContainerRefs.current[i]
      const mat = cardMaterials[i]
      if (!obj || !mat) continue

      // Distance in front of camera lens
      const d = camZ - card.z

      // Visible when in front of lens and within viewing depth
      const isVisible = d > 0.4 && d < 70.0

      if (!isVisible) {
        obj.visible = false
        continue
      }

      obj.visible = true
      activeCount++

      // Card stays at its placement (zero falling movement!)
      obj.position.set(card.x, card.y, card.z)
      obj.rotation.set(card.rotX, card.rotY, card.rotZ || 0)

      // Smooth lens dissolve right as card passes camera lens (matches HTML ss(0.4, 4, d))
      const lensDissolve = smoothstep(0.4, 4.0, d)

      // Distance fade: distant cards far back in depth gently fade in from the white background
      // Cards beyond d = 50 are invisible so they don't pop in all at once!
      const distFade = 1.0 - smoothstep(28.0, 50.0, d)

      // Combined card opacity
      const totalOpacity = lensDissolve * distFade * entryOpacity

      // Optical blur effect for each individual project and placeholder:
      // 1. Distance blur for this specific card based strictly on its own distance d to the camera:
      // - When close to camera (d <= 21.0), blur is 0.0 (clean, crisp focus)
      // - When mid-distance (d in [21.0, 36.0]), blur density increases smoothly from 0.0 to 1.0
      // - When far away in depth (d >= 36.0), blur density is 1.0 (softly blurred in distance)
      const distBlur = smoothstep(21.0, 36.0, d)

      // 2. Individual card blur:
      // - As white screen covers the monitor, Project 01 (nearest card at d ~ 22.0) starts with soft blur
      //   and slowly clears up to 0.0 right as white covers the screen (showing in correct and clean form).
      // - Projects and placeholders behind it (Project 02 at d ~ 39, Project 03 at d ~ 56) maintain their own distance blur!
      // - Each picture has its own blur density that goes away ONLY as that specific card gets close to the screen!
      let cardBlur = distBlur
      if (isEmerging) {
        // Near cards have extra emergence blur that clears as tEmerge -> 1.0
        const fgWeight = 1.0 - smoothstep(18.0, 28.0, d)
        cardBlur = Math.min(1.0, Math.max(distBlur, entryBlur * fgWeight))
      } else {
        cardBlur = distBlur
      }

      if (card.isReal && card.project) {
        const pMat = mat as THREE.ShaderMaterial
        if (pMat.uniforms) {
          pMat.uniforms.uOpacity.value = totalOpacity
          pMat.uniforms.uBrightness.value = 1.0
          pMat.uniforms.uFlickerStep.value = Math.floor(flightP * 120)
          pMat.uniforms.uBlur.value = cardBlur

          // Graham Mast Left-to-Right pixel wave as camera approaches this card:
          // In the tunnel, projects are spaced 17.14 units apart along Z (from HTML reference).
          // As camera approaches (d in [10.0, 26.0]), the pixel wave sweeps across from left to right.
          // When d <= 10.0, it is 100% revealed!
          let waveProg = 0.0
          if (d <= 10.0) {
            waveProg = 1.0
          } else if (d < 26.0) {
            waveProg = 1.0 - (d - 10.0) / 16.0
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

        // Button scale pop on hover (1.0 -> 1.05)
        const baseScale = card.scale || 1.0
        const s = baseScale * (1.0 + 0.05 * nextHover)
        obj.scale.set(s, s, s)

        // Drop shadow mesh behind card (softened when blurred)
        const sMesh = shadowMeshRefs.current[i]
        const sMat = shadowMaterials[i]
        if (sMesh && sMat) {
          sMesh.visible = totalOpacity > 0.01
          sMat.opacity = totalOpacity * (0.85 + 0.15 * nextHover) * (1.0 - cardBlur * 0.4)
        }

        // Nearest project detection for active title label (matches HTML d in [3, 22])
        if (d > 1.5 && d < 22.0 && d < minProjectDist) {
          minProjectDist = d
          nearProject = card.project
        }
      } else {
        // Placeholder ShaderMaterial with optical blur effect
        const phMat = mat as THREE.ShaderMaterial
        if (phMat.uniforms) {
          phMat.uniforms.uOpacity.value = totalOpacity
          phMat.uniforms.uBrightness.value = 1.0
          phMat.uniforms.uBlur.value = cardBlur
        }
      }
    }

    heroProgress.debug.activeCards = activeCount
    const showTitle = raw >= handover && flightP < 0.94 && nearProject !== null
    heroProgress.activeProjectTitle = showTitle && nearProject ? nearProject.title : ''
    heroProgress.activeProjectOpacity = showTitle ? 1.0 : 0.0
  })

  return (
    <group ref={groupRef} position={[0, FLIGHT_CONFIG.CAMERA_Y, 0]} visible={false}>
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
