import { useMemo, useRef, memo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { OBJECTS_CONFIG } from '../../config/objects'
import { PS1_CONFIG } from '../../config/ps1'
import { createPs1Material } from './Ps1Material'

// ============================================================================
// 1. PROCEDURAL 64x64 NEAREST-FILTERED RETRO TEXTURES
// ============================================================================

/**
 * 64x64 Laptop Keyboard Texture:
 * Dark navy base, key grid with cream/blue keycaps, and orange Return/Escape keys.
 */
function createKeyboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  // Background: dark navy
  ctx.fillStyle = PS1_CONFIG.palette.navy
  ctx.fillRect(0, 0, 64, 64)

  // Keyboard inset area
  ctx.fillStyle = '#0a0d36'
  ctx.fillRect(3, 4, 58, 44)

  // Key grid: 5 rows
  const rowY = [6, 14, 22, 30, 38]
  rowY.forEach((y, rIdx) => {
    let x = 5
    while (x < 58) {
      const isSpace = rIdx === 4 && x >= 18 && x <= 42
      const isEnter = rIdx === 2 && x >= 46
      const isEsc = rIdx === 0 && x === 5
      const keyW = isSpace ? 24 : isEnter ? 10 : 3
      const keyH = 5

      if (isEnter || isEsc) {
        ctx.fillStyle = PS1_CONFIG.palette.accent // Orange accent key
      } else {
        ctx.fillStyle = rIdx % 2 === 0 ? PS1_CONFIG.palette.ink : '#2832a8'
      }

      ctx.fillRect(x, y, keyW, keyH)

      // Keycap highlight dot
      ctx.fillStyle = PS1_CONFIG.palette.paper
      ctx.fillRect(x + 1, y + 1, 1, 1)

      x += keyW + 2
    }
  })

  // Trackpad at bottom center
  ctx.fillStyle = '#141a52'
  ctx.fillRect(20, 50, 24, 11)
  ctx.strokeStyle = PS1_CONFIG.palette.inkLight
  ctx.strokeRect(20, 50, 24, 11)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  return texture
}

/**
 * 64x64 Laptop Code Screen Texture:
 * Dark navy IDE background, top window control dots, and glowing orange pixel-art syntax lines.
 */
function createCodeScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  // IDE background: dark navy
  ctx.fillStyle = PS1_CONFIG.palette.navy
  ctx.fillRect(0, 0, 64, 64)

  // Title bar
  ctx.fillStyle = '#0a0d36'
  ctx.fillRect(0, 0, 64, 8)

  // Window control dots
  ctx.fillStyle = PS1_CONFIG.palette.accent
  ctx.fillRect(3, 3, 2, 2)
  ctx.fillStyle = '#f0c638'
  ctx.fillRect(7, 3, 2, 2)
  ctx.fillStyle = PS1_CONFIG.palette.paper
  ctx.fillRect(11, 3, 2, 2)

  // Code lines (Pixel syntax highlighting)
  const lines: { y: number; segments: { w: number; color: string }[] }[] = [
    {
      y: 12,
      segments: [
        { w: 10, color: PS1_CONFIG.palette.accent }, // import
        { w: 14, color: PS1_CONFIG.palette.paper },  // * as tf
        { w: 8, color: PS1_CONFIG.palette.inkLight }, // from
      ],
    },
    {
      y: 18,
      segments: [
        { w: 8, color: PS1_CONFIG.palette.accent },  // const
        { w: 12, color: PS1_CONFIG.palette.paper },  // model
        { w: 4, color: PS1_CONFIG.palette.inkLight }, // =
        { w: 16, color: PS1_CONFIG.palette.accent }, // Sequential()
      ],
    },
    {
      y: 25,
      segments: [
        { w: 14, color: PS1_CONFIG.palette.paper },  // model.add(
        { w: 18, color: PS1_CONFIG.palette.accent }, // Dense({units:64})
        { w: 2, color: PS1_CONFIG.palette.paper },   // )
      ],
    },
    {
      y: 32,
      segments: [
        { w: 14, color: PS1_CONFIG.palette.paper },  // model.add(
        { w: 16, color: PS1_CONFIG.palette.accent }, // Activation('gelu')
      ],
    },
    {
      y: 39,
      segments: [
        { w: 12, color: PS1_CONFIG.palette.accent }, // await
        { w: 18, color: PS1_CONFIG.palette.paper },  // model.fit(train)
      ],
    },
    {
      y: 46,
      segments: [
        { w: 10, color: PS1_CONFIG.palette.inkLight }, // export
        { w: 14, color: PS1_CONFIG.palette.accent },  // default
        { w: 12, color: PS1_CONFIG.palette.paper },   // deveshAI
      ],
    },
    {
      y: 53,
      segments: [
        { w: 22, color: PS1_CONFIG.palette.inkLight }, // // 143 fps ready
      ],
    },
  ]

  lines.forEach((line) => {
    let curX = 6
    line.segments.forEach((seg) => {
      ctx.fillStyle = seg.color
      ctx.fillRect(curX, line.y, seg.w, 3)
      curX += seg.w + 3
    })
  })

  // Pulsing orange cursor
  ctx.fillStyle = PS1_CONFIG.palette.accent
  ctx.fillRect(38, 53, 3, 4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  return texture
}

/**
 * 64x64 Smartphone Screen Texture:
 * Status bar, 4x3 app-icon grid in cream, blue, and glowing orange accent, plus dock.
 */
function createPhoneScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  // Screen background: deep navy
  ctx.fillStyle = PS1_CONFIG.palette.navy
  ctx.fillRect(0, 0, 64, 64)

  // Status bar: time and indicators
  ctx.fillStyle = PS1_CONFIG.palette.paper
  ctx.fillRect(6, 3, 8, 2)  // Clock 9:41
  ctx.fillRect(48, 3, 3, 2) // Wifi
  ctx.fillRect(53, 3, 5, 2) // Battery

  // 4x3 App icon grid
  const iconColors = [
    PS1_CONFIG.palette.accent, PS1_CONFIG.palette.paper, PS1_CONFIG.palette.inkLight,
    PS1_CONFIG.palette.ink, PS1_CONFIG.palette.accent, PS1_CONFIG.palette.paper,
    PS1_CONFIG.palette.paper, PS1_CONFIG.palette.inkLight, PS1_CONFIG.palette.accent,
    PS1_CONFIG.palette.accent, PS1_CONFIG.palette.paper, PS1_CONFIG.palette.ink,
  ]

  let iconIdx = 0
  for (let row = 0; row < 4; row++) {
    const y = 9 + row * 11
    for (let col = 0; col < 3; col++) {
      const x = 9 + col * 17
      const color = iconColors[iconIdx % iconColors.length]
      iconIdx++

      // Icon background box
      ctx.fillStyle = color
      ctx.fillRect(x, y, 11, 8)

      // Inner pixel emblem
      ctx.fillStyle = color === PS1_CONFIG.palette.paper ? PS1_CONFIG.palette.navy : PS1_CONFIG.palette.paper
      ctx.fillRect(x + 3, y + 2, 5, 4)
    }
  }

  // Dock separator line
  ctx.fillStyle = '#18206b'
  ctx.fillRect(6, 53, 52, 1)

  // Bottom dock with 3 primary action apps
  ctx.fillStyle = PS1_CONFIG.palette.accent
  ctx.fillRect(10, 56, 10, 6)
  ctx.fillStyle = PS1_CONFIG.palette.paper
  ctx.fillRect(27, 56, 10, 6)
  ctx.fillStyle = PS1_CONFIG.palette.inkLight
  ctx.fillRect(44, 56, 10, 6)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  return texture
}

/**
 * 64x64 Plinth Top Texture:
 * Base cream with subtle dither crosshatching and a dark navy border.
 */
function createPlinthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = PS1_CONFIG.palette.paper
  ctx.fillRect(0, 0, 64, 64)

  // 4x4 subtle dither pattern
  ctx.fillStyle = 'rgba(26, 31, 156, 0.06)'
  for (let y = 0; y < 64; y += 4) {
    for (let x = 0; x < 64; x += 4) {
      if ((x + y) % 8 === 0) {
        ctx.fillRect(x, y, 2, 2)
      }
    }
  }

  // Inset boundary border
  ctx.strokeStyle = PS1_CONFIG.palette.ink
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, 60, 60)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  return texture
}

/**
 * 64x64 Fake Contact Shadow Blob:
 * Dark dithered oval blob with alpha falloff. No shadow maps needed.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  ctx.clearRect(0, 0, 64, 64)

  const imgData = ctx.createImageData(64, 64)
  const data = imgData.data

  // 4x4 Bayer matrix
  const bayer4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ]

  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const dx = (x - 32) / 28
      const dy = (y - 32) / 22
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 1.0) {
        const threshold = bayer4[y % 4][x % 4] / 16.0
        const strength = 1.0 - dist
        if (strength > threshold * 0.7) {
          const idx = (y * 64 + x) * 4
          data[idx] = 15     // R (navy)
          data[idx + 1] = 18 // G
          data[idx + 2] = 80 // B
          data[idx + 3] = Math.floor(190 * strength) // Alpha
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  return texture
}

// ============================================================================
// 2. SHOWCASE PLINTH WITH FAKE CONTACT SHADOW
// ============================================================================

interface PlinthProps {
  width: number
  depth: number
  shadowWidth?: number
  shadowDepth?: number
}

function ShowcasePlinth({ width, depth, shadowWidth, shadowDepth }: PlinthProps) {
  const plinthTexture = useMemo(() => createPlinthTexture(), [])
  const shadowTexture = useMemo(() => createContactShadowTexture(), [])

  const sW = shadowWidth ?? width * 1.35
  const sD = shadowDepth ?? depth * 1.35

  const bodyMat = useMemo(
    () => createPs1Material({ color: new THREE.Color(PS1_CONFIG.palette.navy) }),
    []
  )
  const topMat = useMemo(
    () => createPs1Material({ map: plinthTexture, color: new THREE.Color(PS1_CONFIG.palette.paper) }),
    [plinthTexture]
  )
  const shadowMat = useMemo(
    () =>
      createPs1Material({
        map: shadowTexture,
        transparent: true,
        opacity: 0.75,
        color: new THREE.Color('#ffffff'),
      }),
    [shadowTexture]
  )

  const height = 0.06

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Fake Contact Shadow on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} material={shadowMat}>
        <planeGeometry args={[sW, sD]} />
      </mesh>

      {/* 2. Plinth Base Box */}
      <mesh position={[0, height / 2, 0]} material={bodyMat}>
        <boxGeometry args={[width, height, depth]} />
      </mesh>

      {/* 3. Dithered Cream Top Surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height + 0.001, 0]} material={topMat}>
        <planeGeometry args={[width * 0.96, depth * 0.96]} />
      </mesh>
    </group>
  )
}

// ============================================================================
// 3. DETAILED PROCEDURAL LAPTOP
// ============================================================================

function DetailedLaptop({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number | [number, number, number]
}) {
  const kbTexture = useMemo(() => createKeyboardTexture(), [])
  const codeTexture = useMemo(() => createCodeScreenTexture(), [])

  const baseMat = useMemo(
    () => createPs1Material({ color: new THREE.Color(PS1_CONFIG.palette.navy) }),
    []
  )
  const lidMat = useMemo(
    () => createPs1Material({ color: new THREE.Color(PS1_CONFIG.palette.ink) }),
    []
  )
  const hingeMat = useMemo(
    () => createPs1Material({ color: new THREE.Color(PS1_CONFIG.palette.inkLight) }),
    []
  )
  const kbMat = useMemo(
    () => createPs1Material({ map: kbTexture, color: new THREE.Color('#ffffff') }),
    [kbTexture]
  )
  const screenMat = useMemo(
    () =>
      createPs1Material({
        map: codeTexture,
        color: new THREE.Color('#ffffff'),
        emissive: new THREE.Color(PS1_CONFIG.palette.accent).multiplyScalar(0.25), // Glowing orange screen
      }),
    [codeTexture]
  )

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Plinth sitting on ground */}
      <ShowcasePlinth width={1.05} depth={0.85} shadowWidth={1.4} shadowDepth={1.15} />

      {/* Laptop sitting on plinth surface (y = 0.06) */}
      <group position={[0, 0.06, 0.04]}>
        {/* Main Base chassis slab */}
        <mesh position={[0, 0.016, 0]} material={baseMat}>
          <boxGeometry args={[0.74, 0.032, 0.52]} />
        </mesh>

        {/* Keyboard surface facing up */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.033, 0]} material={kbMat}>
          <planeGeometry args={[0.68, 0.46]} />
        </mesh>

        {/* Cylindrical hinge connecting base to lid */}
        <mesh
          position={[0, 0.032, -0.25]}
          rotation={[0, 0, Math.PI / 2]}
          material={hingeMat}
        >
          <cylinderGeometry args={[0.014, 0.014, 0.62, 8]} />
        </mesh>

        {/* Lid & Screen, pivoted open at ~100 degrees (tilted slightly back past vertical) */}
        <group position={[0, 0.032, -0.25]} rotation={[-0.20, 0, 0]}>
          {/* Outer Lid shell */}
          <mesh position={[0, 0.26, -0.01]} material={lidMat}>
            <boxGeometry args={[0.74, 0.52, 0.02]} />
          </mesh>

          {/* Glowing Code Screen on front face of lid */}
          <mesh position={[0, 0.26, 0.002]} material={screenMat}>
            <planeGeometry args={[0.68, 0.46]} />
          </mesh>

          {/* Thin Bezel Accent around screen */}
          <mesh position={[0, 0.505, 0.003]} material={baseMat}>
            <boxGeometry args={[0.72, 0.025, 0.004]} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ============================================================================
// 4. DETAILED PROCEDURAL SMARTPHONE
// ============================================================================

function DetailedSmartphone({
  position,
  rotation,
  scale,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number | [number, number, number]
}) {
  const phoneTexture = useMemo(() => createPhoneScreenTexture(), [])

  const bodyMat = useMemo(
    () => createPs1Material({ color: new THREE.Color(PS1_CONFIG.palette.navy) }),
    []
  )
  const bezelMat = useMemo(
    () => createPs1Material({ color: new THREE.Color(PS1_CONFIG.palette.ink) }),
    []
  )
  const screenMat = useMemo(
    () =>
      createPs1Material({
        map: phoneTexture,
        color: new THREE.Color('#ffffff'),
        emissive: new THREE.Color(PS1_CONFIG.palette.accent).multiplyScalar(0.2),
      }),
    [phoneTexture]
  )
  const cameraMat = useMemo(
    () => createPs1Material({ color: new THREE.Color(PS1_CONFIG.palette.inkLight) }),
    []
  )

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Plinth sitting on ground */}
      <ShowcasePlinth width={0.7} depth={0.65} shadowWidth={0.95} shadowDepth={0.9} />

      {/* Phone Body standing upright on plinth, tilted back ~9 degrees */}
      <group position={[0, 0.06, 0]} rotation={[-0.15, 0, 0]}>
        {/* Rounded-box chassis */}
        <mesh position={[0, 0.38, 0]} material={bodyMat}>
          <boxGeometry args={[0.38, 0.72, 0.038]} />
        </mesh>

        {/* Front Bezel frame */}
        <mesh position={[0, 0.38, 0.02]} material={bezelMat}>
          <boxGeometry args={[0.35, 0.69, 0.002]} />
        </mesh>

        {/* Glowing App-Icon Screen */}
        <mesh position={[0, 0.38, 0.022]} material={screenMat}>
          <planeGeometry args={[0.33, 0.65]} />
        </mesh>

        {/* Speaker slit at top */}
        <mesh position={[0, 0.71, 0.023]} material={bodyMat}>
          <boxGeometry args={[0.08, 0.008, 0.002]} />
        </mesh>

        {/* Back Camera module */}
        <mesh position={[-0.1, 0.62, -0.022]} material={bezelMat}>
          <boxGeometry args={[0.12, 0.14, 0.01]} />
        </mesh>
        {/* Camera lenses */}
        <mesh
          position={[-0.1, 0.65, -0.028]}
          rotation={[Math.PI / 2, 0, 0]}
          material={cameraMat}
        >
          <cylinderGeometry args={[0.022, 0.022, 0.008, 8]} />
        </mesh>
        <mesh
          position={[-0.1, 0.59, -0.028]}
          rotation={[Math.PI / 2, 0, 0]}
          material={cameraMat}
        >
          <cylinderGeometry args={[0.022, 0.022, 0.008, 8]} />
        </mesh>
      </group>
    </group>
  )
}

// ============================================================================
// 5. DETAILED PROCEDURAL NEURAL NETWORK (Stepped 12 FPS + Pulsing Nodes)
// ============================================================================

interface NodePoint {
  pos: THREE.Vector3
  layer: number
  isActive: boolean
}

function DetailedNeuralNetwork({
  position,
  scale = 1.0,
}: {
  position: [number, number, number]
  scale?: number | [number, number, number]
}) {
  const groupRef = useRef<THREE.Group>(null)
  const activeNodesRef = useRef<THREE.Mesh[]>([])

  // 1. Create nodes: 3 layers of 4, 5, 4 low-poly icospheres
  const { nodes, connections } = useMemo(() => {
    const layerCounts = [4, 5, 4]
    const layerSpacing = 0.95
    const heightSpacing = 0.48
    const allNodes: NodePoint[] = []

    // Select 3-4 specific active nodes that pulse
    const activeIndices = new Set([1, 6, 8, 11])

    let globalIdx = 0
    layerCounts.forEach((count, lIdx) => {
      const x = (lIdx - 1) * layerSpacing
      const yOffset = -((count - 1) * heightSpacing) / 2
      for (let i = 0; i < count; i++) {
        const y = yOffset + i * heightSpacing
        const z = Math.sin(lIdx * 1.5 + i * 0.8) * 0.18
        allNodes.push({
          pos: new THREE.Vector3(x, y, z),
          layer: lIdx,
          isActive: activeIndices.has(globalIdx),
        })
        globalIdx++
      }
    })

    // Connections between adjacent layers
    const allConns: { start: THREE.Vector3; end: THREE.Vector3; mid: THREE.Vector3; quat: THREE.Quaternion; len: number }[] = []
    const layer0 = allNodes.filter((n) => n.layer === 0)
    const layer1 = allNodes.filter((n) => n.layer === 1)
    const layer2 = allNodes.filter((n) => n.layer === 2)

    const connectLayers = (fromList: NodePoint[], toList: NodePoint[]) => {
      fromList.forEach((from) => {
        toList.forEach((to) => {
          const mid = new THREE.Vector3().addVectors(from.pos, to.pos).multiplyScalar(0.5)
          const dir = new THREE.Vector3().subVectors(to.pos, from.pos)
          const len = dir.length()
          dir.normalize()
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
          allConns.push({ start: from.pos, end: to.pos, mid, quat, len })
        })
      })
    }

    connectLayers(layer0, layer1)
    connectLayers(layer1, layer2)

    return { nodes: allNodes, connections: allConns }
  }, [])

  // Geometries: Low-poly icosahedron (detail 0 = 20 triangular facets for PS1 look)
  const nodeGeo = useMemo(() => new THREE.IcosahedronGeometry(0.12, 0), [])
  // Wireframe edges for the ink-blue "rim" outline
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(nodeGeo, 15), [nodeGeo])
  const wireGeo = useMemo(() => new THREE.BoxGeometry(0.004, 1, 0.004), []) // Very thin wires so nodes read clearly

  // Materials
  // Cream nodes as the primary visible body, with emissive to ensure they read as cream even in shadow
  const creamNodeMat = useMemo(
    () => createPs1Material({
      color: new THREE.Color(PS1_CONFIG.palette.paper),
      emissive: new THREE.Color(PS1_CONFIG.palette.paper).multiplyScalar(0.2),
    }),
    []
  )
  // Ink-blue wireframe line material for node rim outlines
  const rimLineMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: PS1_CONFIG.palette.ink, linewidth: 1 }),
    []
  )
  // Active pulsing nodes in glowing orange
  const activeNodeMat = useMemo(
    () =>
      createPs1Material({
        color: new THREE.Color(PS1_CONFIG.palette.accent),
        emissive: new THREE.Color(PS1_CONFIG.palette.accent).multiplyScalar(0.8),
      }),
    []
  )
  // Very thin, faded wires so nodes read clearly against the connections
  const wireMat = useMemo(
    () => createPs1Material({
      color: new THREE.Color(PS1_CONFIG.palette.inkLight),
      opacity: 0.4,
      transparent: true,
    }),
    []
  )

  // Stepped 12 FPS PS1 retro animation + pulse
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const time = clock.getElapsedTime()

    // 12 FPS discrete time step
    const fps12Step = Math.floor(time * 12)
    groupRef.current.rotation.y = fps12Step * 0.02
    groupRef.current.rotation.x = Math.sin(fps12Step * 0.035) * 0.06

    // Pulsing active nodes (stepped at 12 FPS)
    const pulse = 1.0 + Math.sin(fps12Step * 0.3) * 0.18
    activeNodesRef.current.forEach((mesh) => {
      if (mesh) {
        mesh.scale.set(pulse, pulse, pulse)
      }
    })
  })

  return (
    <group position={position} scale={scale}>
      {/* Plinth sitting on the ground (y = 0) */}
      <ShowcasePlinth width={2.2} depth={1.1} shadowWidth={2.6} shadowDepth={1.4} />

      {/* Rotating 12 FPS network floating above the plinth at y = 1.0 */}
      <group ref={groupRef} position={[0, 1.0, 0]}>
        {/* Nodes */}
        {nodes.map((node, i) => (
          <group key={`node-grp-${i}`} position={node.pos}>
            {/* Solid node body (Cream or Pulsing Orange Accent) */}
            <mesh
              ref={(el) => {
                if (node.isActive && el) {
                  activeNodesRef.current[i] = el
                }
              }}
              geometry={nodeGeo}
              material={node.isActive ? activeNodeMat : creamNodeMat}
            />

            {/* Ink-blue wireframe edge overlay for "rim" effect */}
            <lineSegments geometry={edgesGeo} material={rimLineMat} />
          </group>
        ))}

        {/* Thin wire connections */}
        {connections.map((conn, i) => (
          <mesh
            key={`wire-${i}`}
            geometry={wireGeo}
            material={wireMat}
            position={conn.mid}
            quaternion={conn.quat}
            scale={[1, conn.len, 1]}
          />
        ))}
      </group>
    </group>
  )
}

// ============================================================================
// 6. MAIN OBJECTS EXPORT
// ============================================================================

export const Objects = memo(() => {
  const laptop = OBJECTS_CONFIG.find((o) => o.id === 'laptop')!
  const neuralNet = OBJECTS_CONFIG.find((o) => o.id === 'neural-network')!
  const phone = OBJECTS_CONFIG.find((o) => o.id === 'smartphone')!

  return (
    <group name="ps1-scene-objects">
      {/* 1. Detailed Laptop */}
      {laptop && (
        <DetailedLaptop
          position={laptop.position}
          rotation={laptop.rotation}
          scale={laptop.scale}
        />
      )}

      {/* 2. Detailed Neural Network */}
      {neuralNet && (
        <DetailedNeuralNetwork
          position={neuralNet.position}
          scale={neuralNet.scale}
        />
      )}

      {/* 3. Detailed Smartphone */}
      {phone && (
        <DetailedSmartphone
          position={phone.position}
          rotation={phone.rotation}
          scale={phone.scale}
        />
      )}
    </group>
  )
})

Objects.displayName = 'Objects'
