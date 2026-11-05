import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { projects, type ProjectItem } from '../../config/projects'
import { heroProgress } from '../Welcome/heroProgress'

// Seeded PRNG for deterministic card layout
function mulberry32(seed: number) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Generate rounded rectangle geometry (16:10 aspect ratio: 1.6 x 1.0)
function createUnitRoundedRectGeometry(radius = 0.08, segments = 12): THREE.ShapeGeometry {
  const w = 1.6
  const h = 1.0
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  shape.moveTo(x + radius, y)
  shape.lineTo(x + w - radius, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + radius)
  shape.lineTo(x + w, y + h - radius)
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  shape.lineTo(x + radius, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)

  const geom = new THREE.ShapeGeometry(shape, segments)
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

export interface RealCardData {
  id: string
  index: number
  project: ProjectItem
  texture: THREE.Texture
  scale: number
  restX: number
  restY: number
  restZ: number
  startX: number
  startY: number
  startZ: number
  startRotX: number
  rotZ: number
  staggerDelay: number
  staggerDuration: number
  freqX: number
  freqY: number
  freqRot: number
  phaseX: number
  phaseY: number
  phaseRot: number
  ampX: number
  ampY: number
  ampRot: number
}

export interface PlaceholderCardData {
  id: string
  index: number
  scale: number
  restX: number
  restY: number
  restZ: number
  startX: number
  startY: number
  startZ: number
  startRotX: number
  rotZ: number
  staggerDelay: number
  staggerDuration: number
  seed: number
  opacity: number
  hasLabel: number
  freqX: number
  freqY: number
  freqRot: number
  phaseX: number
  phaseY: number
  phaseRot: number
  ampX: number
  ampY: number
  ampRot: number
}

export interface CardFieldProps {
  onSelectProject?: (project: ProjectItem) => void
  isDetailOpen?: boolean
  isMasked?: boolean
}

const TOTAL_CARDS = 35
const Z_NEAR = 1.0
const Z_FAR = -32.0
const Z_SPAN = Z_NEAR - Z_FAR // 33.0

// Module-level scratch instances for zero per-frame garbage collection
const _dummyMatrix = new THREE.Matrix4()
const _tempPos = new THREE.Vector3()
const _tempQuat = new THREE.Quaternion()
const _tempEuler = new THREE.Euler()
const _tempScale = new THREE.Vector3()

export function CardField({
  onSelectProject,
  isDetailOpen = false,
  isMasked = true,
}: CardFieldProps) {
  const { pointer } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Shared geometry
  const sharedGeometry = useMemo(() => createUnitRoundedRectGeometry(0.08, 12), [])

  // Velocity skew uniform shared by all materials
  const skewUniform = useMemo(() => ({ value: 0 }), [])

  // Blueprint ShaderMaterial for all 28 placeholder cards in one InstancedMesh
  const blueprintMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: isMasked ? THREE.EqualStencilFunc : THREE.AlwaysStencilFunc,
      stencilFail: THREE.KeepStencilOp,
      stencilZFail: THREE.KeepStencilOp,
      stencilZPass: THREE.KeepStencilOp,
      uniforms: {
        uTime: { value: 0 },
        uSkewX: skewUniform,
      },
      vertexShader: `
        attribute float aSeed;
        attribute float aOpacity;
        attribute float aHasLabel;
        
        varying vec2 vUv;
        varying float vSeed;
        varying float vOpacity;
        varying float vHasLabel;
        
        uniform float uSkewX;
        
        void main() {
          vUv = uv;
          vSeed = aSeed;
          vOpacity = aOpacity;
          vHasLabel = aHasLabel;
          
          vec3 pos = position;
          pos.x += pos.y * uSkewX;
          
          vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vSeed;
        varying float vOpacity;
        varying float vHasLabel;
        
        uniform float uTime;
        
        void main() {
          // 1. Dark navy vertical/diagonal gradient fill (#070d1a to #0b1630)
          vec3 colBot = vec3(0.027, 0.051, 0.102);
          vec3 colTop = vec3(0.043, 0.086, 0.188);
          vec3 bg = mix(colBot, colTop, vUv.y * 0.7 + vUv.x * 0.3);
          
          // 2. Faint blueprint grid lines inside
          vec2 gridUv = fract(vec2(vUv.x * 10.0, vUv.y * 6.25));
          float gridLine = step(0.96, gridUv.x) + step(0.96, gridUv.y);
          vec3 gridCol = vec3(0.12, 0.28, 0.55);
          bg += gridCol * clamp(gridLine, 0.0, 1.0) * 0.14;
          
          // 3. Technical Corner Brackets (L-shaped tick marks at 4 corners)
          vec2 dCorner = min(vUv, 1.0 - vUv);
          float inBracketArea = step(dCorner.x, 0.10) * step(dCorner.y, 0.10);
          float bracketArmX = step(0.038, dCorner.y) * step(dCorner.y, 0.048) * step(dCorner.x, 0.10);
          float bracketArmY = step(0.024, dCorner.x) * step(dCorner.x, 0.030) * step(dCorner.y, 0.10);
          float bracket = clamp(bracketArmX + bracketArmY, 0.0, 1.0) * inBracketArea;
          
          // 4. Thin cyan/blue border with soft glow
          float edgeX = min(vUv.x, 1.0 - vUv.x);
          float edgeY = min(vUv.y, 1.0 - vUv.y);
          float edgeDist = min(edgeX, edgeY);
          float border = smoothstep(0.022, 0.010, edgeDist);
          float glow = exp(-edgeDist * 45.0) * 0.35;
          
          vec3 cyan = vec3(0.184, 0.816, 1.0);
          vec3 borderCol = cyan * (border + glow + bracket * 0.7);
          
          // 5. Very slow procedural shimmer sweep (offset by per-instance seed)
          float shimmerPos = fract(uTime * 0.07 + vSeed * 2.31);
          float diag = (vUv.x + vUv.y) * 0.5;
          float shimmer = smoothstep(0.18, 0.0, abs(diag - shimmerPos)) * 0.18;
          
          vec3 finalCol = bg + borderCol + cyan * shimmer;
          
          // 6. Center technical outline for cards with aHasLabel > 0.5
          if (vHasLabel > 0.5) {
            vec2 centerBox = abs(vUv - vec2(0.5, 0.5));
            if (centerBox.x < 0.34 && centerBox.y < 0.10) {
              float boxBorder = step(abs(centerBox.x - 0.33), 0.008) + step(abs(centerBox.y - 0.09), 0.008);
              finalCol = mix(finalCol, vec3(0.02, 0.05, 0.12), 0.7);
              finalCol += cyan * (boxBorder * 0.45 + 0.12);
            }
          }
          
          gl_FragColor = vec4(finalCol, vOpacity);
        }
      `,
    })
  }, [skewUniform, isMasked])

  // Update stencil func dynamically on mask change
  useEffect(() => {
    blueprintMaterial.stencilFunc = isMasked ? THREE.EqualStencilFunc : THREE.AlwaysStencilFunc
    blueprintMaterial.needsUpdate = true
  }, [blueprintMaterial, isMasked])

  // Load real project textures
  const projectTextures = useMemo(() => {
    const map = new Map<string, THREE.Texture>()
    const loader = new THREE.TextureLoader()
    projects.forEach((p) => {
      const tex = loader.load(p.image)
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.generateMipmaps = false
      map.set(p.id, tex)
    })
    return map
  }, [])

  // Create real project card materials (with skew & stencil)
  const realMaterials = useMemo(() => {
    const map = new Map<string, THREE.MeshBasicMaterial>()
    projects.forEach((p) => {
      const tex = projectTextures.get(p.id)
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 1.0,
        depthWrite: true,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: isMasked ? THREE.EqualStencilFunc : THREE.AlwaysStencilFunc,
        stencilFail: THREE.KeepStencilOp,
        stencilZFail: THREE.KeepStencilOp,
        stencilZPass: THREE.KeepStencilOp,
        toneMapped: false,
      })
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uSkewX = skewUniform
        shader.vertexShader = `
          uniform float uSkewX;
          ${shader.vertexShader}
        `
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          transformed.x += transformed.y * uSkewX;
          `
        )
      }
      map.set(p.id, mat)
    })
    return map
  }, [projectTextures, skewUniform, isMasked])

  // Update real card materials stencil func dynamically
  useEffect(() => {
    realMaterials.forEach((mat) => {
      mat.stencilFunc = isMasked ? THREE.EqualStencilFunc : THREE.AlwaysStencilFunc
      mat.needsUpdate = true
    })
  }, [realMaterials, isMasked])

  // Generate deterministic layout for both Real and Placeholder cards
  const { realCards, placeholderCards } = useMemo(() => {
    const rng = mulberry32(101)
    const realCount = projects.length // 7
    const placeholderCount = TOTAL_CARDS - realCount // 28

    const reals: RealCardData[] = []
    const placeholders: PlaceholderCardData[] = []

    // 1. Real Cards: distributed evenly throughout depth
    const realZStep = Z_SPAN / realCount
    for (let i = 0; i < realCount; i++) {
      const p = projects[i]
      const tex = projectTextures.get(p.id)!

      const restZ = Z_NEAR - 3.5 - i * realZStep - (rng() - 0.5) * 1.5
      const angle = (i / realCount) * Math.PI * 2 + 0.35
      const dist = 2.0 + rng() * 2.2
      const restX = Math.cos(angle) * dist
      const restY = Math.sin(angle) * dist * 0.65

      const scale = 1.35 + rng() * 0.35
      const rotZ = (rng() - 0.5) * 0.08

      // Start position: BELOW the bottom edge of the screen and deeper in z
      const startX = restX * 0.65
      const startY = restY - 5.5 - rng() * 1.5
      const startZ = restZ - (9.0 + rng() * 6.0)

      // Stagger delay across [0.28, 0.70]
      const cardIndex = i * 4 // interleaved
      const staggerDelay = 0.28 + (cardIndex / TOTAL_CARDS) * 0.36
      const staggerDuration = 0.34

      reals.push({
        id: `real-${p.id}`,
        index: i,
        project: p,
        texture: tex,
        scale,
        restX,
        restY,
        restZ,
        startX,
        startY,
        startZ,
        startRotX: -0.32,
        rotZ,
        staggerDelay,
        staggerDuration,
        freqX: 0.8 + rng() * 0.8,
        freqY: 0.7 + rng() * 0.8,
        freqRot: 0.6 + rng() * 0.6,
        phaseX: rng() * Math.PI * 2,
        phaseY: rng() * Math.PI * 2,
        phaseRot: rng() * Math.PI * 2,
        ampX: 0.14 + rng() * 0.14,
        ampY: 0.11 + rng() * 0.12,
        ampRot: 0.035,
      })
    }

    // 2. Placeholder Cards: fill the 3D volume
    // Pick 4 cards to have the COMING SOON label
    const labelIndices = new Set([3, 11, 18, 25])

    for (let i = 0; i < placeholderCount; i++) {
      const zFrac = (i + 0.5) / placeholderCount
      const restZ = Z_NEAR - 1.5 - zFrac * Z_SPAN + (rng() - 0.5) * 2.0
      const restX = (rng() - 0.5) * 13.0
      const restY = (rng() - 0.5) * 7.5
      const scale = 0.85 + rng() * 0.85
      const rotZ = (rng() - 0.5) * 0.10
      const opacity = 0.55 + rng() * 0.35 // 0.55 to 0.90
      const hasLabel = labelIndices.has(i) ? 1.0 : 0.0

      // Start position: BELOW bottom edge of screen and deeper in z
      const startX = restX * 0.6
      const startY = restY - 5.5 - rng() * 1.5
      const startZ = restZ - (8.5 + rng() * 6.5)

      const cardIndex = i + (i >= 7 ? 7 : 0)
      const staggerDelay = 0.28 + (cardIndex / TOTAL_CARDS) * 0.38
      const staggerDuration = 0.34

      placeholders.push({
        id: `placeholder-${i}`,
        index: i,
        scale,
        restX,
        restY,
        restZ,
        startX,
        startY,
        startZ,
        startRotX: -0.32,
        rotZ,
        staggerDelay,
        staggerDuration,
        seed: rng(),
        opacity,
        hasLabel,
        freqX: 0.7 + rng() * 1.0,
        freqY: 0.6 + rng() * 1.0,
        freqRot: 0.5 + rng() * 0.7,
        phaseX: rng() * Math.PI * 2,
        phaseY: rng() * Math.PI * 2,
        phaseRot: rng() * Math.PI * 2,
        ampX: 0.14 + rng() * 0.16,
        ampY: 0.12 + rng() * 0.14,
        ampRot: 0.04,
      })
    }

    return { realCards: reals, placeholderCards: placeholders }
  }, [projectTextures])

  // Set up InstancedBufferAttributes for placeholders (aSeed, aOpacity, aHasLabel)
  useEffect(() => {
    const mesh = instancedMeshRef.current
    if (!mesh) return

    const count = placeholderCards.length
    const aSeed = new Float32Array(count)
    const aOpacity = new Float32Array(count)
    const aHasLabel = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const c = placeholderCards[i]
      aSeed[i] = c.seed
      aOpacity[i] = c.opacity
      aHasLabel[i] = c.hasLabel
    }

    mesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1))
    mesh.geometry.setAttribute('aOpacity', new THREE.InstancedBufferAttribute(aOpacity, 1))
    mesh.geometry.setAttribute('aHasLabel', new THREE.InstancedBufferAttribute(aHasLabel, 1))
  }, [placeholderCards])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sharedGeometry.dispose()
      blueprintMaterial.dispose()
      realMaterials.forEach((m) => m.dispose())
    }
  }, [sharedGeometry, blueprintMaterial, realMaterials])

  // Real card mesh refs for useFrame updates
  const realMeshRefs = useRef<(THREE.Group | null)[]>([])
  // Coming soon label refs
  const labelRefs = useRef<(THREE.Group | null)[]>([])

  // Motion state refs
  const velocityRef = useRef(0.02)
  const targetVelRef = useRef(0.02)
  const travelRef = useRef(0)
  const parallaxRef = useRef(new THREE.Vector2(0, 0))
  const isDetailOpenRef = useRef(isDetailOpen)
  isDetailOpenRef.current = isDetailOpen

  // Reliable click gesture handling
  const lastSelectTimeRef = useRef(0)
  const downPosRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const triggerSelect = useCallback(
    (proj: ProjectItem) => {
      const now = performance.now()
      if (now - lastSelectTimeRef.current < 250) return
      lastSelectTimeRef.current = now
      onSelectProject?.(proj)
    },
    [onSelectProject]
  )

  // Listen to wheel and touch events on window for travel velocity
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isDetailOpenRef.current) return
      const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.0035, 0.4)
      targetVelRef.current = Math.max(-0.2, Math.min(1.2, targetVelRef.current + delta))
    }

    let touchStartY = 0
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) touchStartY = e.touches[0].clientY
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (isDetailOpenRef.current || e.touches.length === 0) return
      const deltaY = touchStartY - e.touches[0].clientY
      touchStartY = e.touches[0].clientY
      const delta = Math.sign(deltaY) * Math.min(Math.abs(deltaY) * 0.015, 0.5)
      targetVelRef.current = Math.max(-0.2, Math.min(1.2, targetVelRef.current + delta))
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  // Animation Loop: 60 FPS, zero allocations
  useFrame(({ clock }, delta) => {
    const p = heroProgress.get()

    // FIX 1: Nothing floats on Welcome page at scroll progress <= 0.02
    if (!groupRef.current) return
    if (p <= 0.02) {
      if (groupRef.current.visible) groupRef.current.visible = false
      return
    }
    if (!groupRef.current.visible) {
      groupRef.current.visible = true
    }

    const time = clock.getElapsedTime()
    blueprintMaterial.uniforms.uTime.value = time

    // FIX 2: Live field motion starts only once progress reaches about 0.90
    const liveFactor = THREE.MathUtils.clamp((p - 0.90) / 0.10, 0, 1)

    // 1. Forward travel velocity with damping
    if (isDetailOpenRef.current || liveFactor <= 0) {
      targetVelRef.current = 0
      velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, 0, 0.12)
    } else {
      const IDLE_FORWARD_SPEED = 0.022
      targetVelRef.current = THREE.MathUtils.lerp(targetVelRef.current, IDLE_FORWARD_SPEED, 0.04)
      velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, targetVelRef.current, 0.08)
    }

    const currentVel = velocityRef.current * liveFactor
    travelRef.current += currentVel * (delta * 60)

    // 2. Velocity skew (parallelogram in direction of travel)
    const targetSkew = Math.max(-0.35, Math.min(0.35, currentVel * 0.45))
    skewUniform.value = THREE.MathUtils.lerp(skewUniform.value, targetSkew, 0.1)

    // 3. Pointer parallax
    const targetParallaxX = pointer.x * 0.45 * liveFactor
    const targetParallaxY = pointer.y * 0.35 * liveFactor
    parallaxRef.current.x = THREE.MathUtils.lerp(parallaxRef.current.x, targetParallaxX, 0.08)
    parallaxRef.current.y = THREE.MathUtils.lerp(parallaxRef.current.y, targetParallaxY, 0.08)

    groupRef.current.position.x = parallaxRef.current.x
    groupRef.current.position.y = parallaxRef.current.y

    const travel = travelRef.current

    // 4. Update Placeholders in InstancedMesh
    const instancedMesh = instancedMeshRef.current
    if (instancedMesh) {
      let labelIdx = 0
      for (let i = 0; i < placeholderCards.length; i++) {
        const c = placeholderCards[i]

        // Entrance stream curve (0.28 to 0.95)
        const cardT = THREE.MathUtils.clamp((p - c.staggerDelay) / c.staggerDuration, 0, 1)
        const alpha = 1 - Math.pow(1 - cardT, 3) // cubic ease-out

        // Final wrapped Z position once alive
        let targetZ = c.restZ
        if (liveFactor > 0) {
          const relZ = c.restZ + travel - Z_FAR
          const wrappedZ = ((relZ % Z_SPAN) + Z_SPAN) % Z_SPAN + Z_FAR
          targetZ = THREE.MathUtils.lerp(c.restZ, wrappedZ, liveFactor)
        }

        // Idle drift
        const driftX = Math.sin(time * c.freqX + c.phaseX) * c.ampX * liveFactor
        const driftY = Math.cos(time * c.freqY + c.phaseY) * c.ampY * liveFactor
        const driftRot = Math.sin(time * c.freqRot + c.phaseRot) * c.ampRot * liveFactor

        // Interpolate along the entrance stream curve from below
        const curX = THREE.MathUtils.lerp(c.startX, c.restX, alpha) + driftX
        const curY = THREE.MathUtils.lerp(c.startY, c.restY, alpha) + driftY
        const curZ = THREE.MathUtils.lerp(c.startZ, targetZ, alpha)

        const curRotX = THREE.MathUtils.lerp(c.startRotX, 0, alpha)
        const curRotZ = THREE.MathUtils.lerp(c.rotZ * 0.5, c.rotZ, alpha) + driftRot

        _tempPos.set(curX, curY, curZ)
        _tempEuler.set(curRotX, 0, curRotZ)
        _tempQuat.setFromEuler(_tempEuler)
        _tempScale.set(c.scale, c.scale, 1)

        _dummyMatrix.compose(_tempPos, _tempQuat, _tempScale)
        instancedMesh.setMatrixAt(i, _dummyMatrix)

        // Position Coming Soon 3D text label if card has label
        if (c.hasLabel > 0.5) {
          const lblGrp = labelRefs.current[labelIdx]
          if (lblGrp) {
            lblGrp.position.copy(_tempPos)
            lblGrp.quaternion.copy(_tempQuat)
            lblGrp.scale.set(c.scale, c.scale, 1)
            lblGrp.visible = alpha > 0.05
          }
          labelIdx++
        }
      }
      instancedMesh.instanceMatrix.needsUpdate = true
    }

    // 5. Update Real Project Cards
    for (let i = 0; i < realCards.length; i++) {
      const c = realCards[i]
      const grp = realMeshRefs.current[i]
      if (!grp) continue

      // Entrance stream curve (0.28 to 0.95)
      const cardT = THREE.MathUtils.clamp((p - c.staggerDelay) / c.staggerDuration, 0, 1)
      const alpha = 1 - Math.pow(1 - cardT, 3)

      let targetZ = c.restZ
      if (liveFactor > 0) {
        const relZ = c.restZ + travel - Z_FAR
        const wrappedZ = ((relZ % Z_SPAN) + Z_SPAN) % Z_SPAN + Z_FAR
        targetZ = THREE.MathUtils.lerp(c.restZ, wrappedZ, liveFactor)
      }

      const driftX = Math.sin(time * c.freqX + c.phaseX) * c.ampX * liveFactor
      const driftY = Math.cos(time * c.freqY + c.phaseY) * c.ampY * liveFactor
      const driftRot = Math.sin(time * c.freqRot + c.phaseRot) * c.ampRot * liveFactor

      const curX = THREE.MathUtils.lerp(c.startX, c.restX, alpha) + driftX
      const curY = THREE.MathUtils.lerp(c.startY, c.restY, alpha) + driftY
      const curZ = THREE.MathUtils.lerp(c.startZ, targetZ, alpha)

      const curRotX = THREE.MathUtils.lerp(c.startRotX, 0, alpha)
      const curRotZ = THREE.MathUtils.lerp(c.rotZ * 0.5, c.rotZ, alpha) + driftRot

      grp.position.set(curX, curY, curZ)
      grp.rotation.set(curRotX, 0, curRotZ)

      // Hover scale 1.05
      const isHovered = hoveredId === c.id
      const targetScale = isHovered ? c.scale * 1.05 : c.scale
      grp.scale.x = THREE.MathUtils.lerp(grp.scale.x, targetScale, 0.15)
      grp.scale.y = THREE.MathUtils.lerp(grp.scale.y, targetScale, 0.15)
      grp.scale.z = 1
    }
  })

  // Body cursor on hover
  useEffect(() => {
    document.body.style.cursor = hoveredId ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hoveredId])

  // Count coming soon cards for label render
  const comingSoonCount = useMemo(() => {
    return placeholderCards.filter((c) => c.hasLabel > 0.5).length
  }, [placeholderCards])

  return (
    <group ref={groupRef} renderOrder={2}>
      {/* 1. All 28 Placeholder Cards in ONE InstancedMesh (Zero raycast blocking) */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[sharedGeometry, blueprintMaterial, placeholderCards.length]}
        raycast={() => null}
        renderOrder={2}
      />

      {/* 2. Sharp Monospace "COMING SOON" text labels for the 4 labeled placeholder cards */}
      {Array.from({ length: comingSoonCount }).map((_, idx) => (
        <group
          key={idx}
          ref={(el) => {
            labelRefs.current[idx] = el
          }}
          renderOrder={3}
        >
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.065}
            color="#8fc4ff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.08}
            material-depthTest={false}
            renderOrder={4}
          >
            COMING SOON
          </Text>
        </group>
      ))}

      {/* 3. The 7 Real Project Cards: Individual interactive meshes */}
      {realCards.map((card, idx) => {
        const material = realMaterials.get(card.project.id)
        const isHovered = hoveredId === card.id

        return (
          <group
            key={card.id}
            ref={(el) => {
              realMeshRefs.current[idx] = el
            }}
            scale={[card.scale, card.scale, 1]}
            renderOrder={2}
          >
            <mesh
              geometry={sharedGeometry}
              material={material}
              renderOrder={2}
              onPointerOver={(e) => {
                e.stopPropagation()
                setHoveredId(card.id)
              }}
              onPointerOut={() => {
                setHoveredId(null)
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
                const native = e.nativeEvent as PointerEvent | MouseEvent | undefined
                downPosRef.current = {
                  x: native ? native.clientX : 0,
                  y: native ? native.clientY : 0,
                  time: performance.now(),
                }
              }}
              onPointerUp={(e) => {
                e.stopPropagation()
                if (downPosRef.current) {
                  const native = e.nativeEvent as PointerEvent | MouseEvent | undefined
                  const cx = native ? native.clientX : 0
                  const cy = native ? native.clientY : 0
                  const dist = Math.hypot(cx - downPosRef.current.x, cy - downPosRef.current.y)
                  const dt = performance.now() - downPosRef.current.time
                  if (dist < 15 && dt < 450) {
                    triggerSelect(card.project)
                  }
                }
              }}
              onClick={(e) => {
                e.stopPropagation()
                triggerSelect(card.project)
              }}
            />

            {/* Hover project-name label */}
            {isHovered && (
              <group position={[0, -0.62, 0.08]} renderOrder={25}>
                <mesh position={[0, 0, -0.01]} renderOrder={25}>
                  <planeGeometry args={[card.project.title.length * 0.09 + 0.35, 0.26]} />
                  <meshBasicMaterial color="#03050a" transparent opacity={0.92} depthTest={false} />
                </mesh>
                <Text
                  fontSize={0.11}
                  color="#e8f1ff"
                  anchorX="center"
                  anchorY="middle"
                  letterSpacing={0.02}
                  material-depthTest={false}
                  renderOrder={26}
                >
                  {card.project.title}
                </Text>
              </group>
            )}
          </group>
        )
      })}
    </group>
  )
}

export default CardField
