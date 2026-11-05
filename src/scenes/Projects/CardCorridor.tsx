import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { projects, type ProjectItem } from '../../config/projects'

// Generate rounded rectangle geometry (16:10 aspect ratio: 1.6 x 1.0)
function createUnitRoundedRectGeometry(radius = 0.06, segments = 8): THREE.ShapeGeometry {
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

export interface CardCorridorProps {
  visible?: boolean
  onSelectProject?: (project: ProjectItem) => void
  isDetailOpen?: boolean
}

// Module-level scratch instances for zero allocation
const _dummyMatrix = new THREE.Matrix4()
const _dummyPos = new THREE.Vector3()
const _dummyQuat = new THREE.Quaternion()
const _dummyEuler = new THREE.Euler()
const _dummyScale = new THREE.Vector3()

export function CardCorridor({
  visible = true,
  onSelectProject,
  isDetailOpen = false,
}: CardCorridorProps) {
  const { gl, camera } = useThree()
  const corridorGroupRef = useRef<THREE.Group>(null)
  const instancedPlaceholdersRef = useRef<THREE.InstancedMesh>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // 1. Shared unit geometry
  const sharedGeometry = useMemo(() => createUnitRoundedRectGeometry(0.06, 8), [])

  // 2. Uniforms shared across vertex shaders for GPU drift & skew
  const corridorUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSkewX: { value: 0 },
    }),
    []
  )

  // 3. Opaque flat dark-navy placeholder ShaderMaterial with 1px cyan border
  // Zero overdraw: depthWrite true, depthTest true, transparent false.
  const placeholderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: false,
      depthWrite: true,
      depthTest: true,
      uniforms: corridorUniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uSkewX;
        attribute float aSeed;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // GPU idle drift (small %, ~2-3% of card size)
          pos.x += sin(uTime * 1.4 + aSeed * 6.28) * 0.035;
          pos.y += cos(uTime * 1.1 + aSeed * 4.15) * 0.025;
          
          // Velocity skew
          pos.x += pos.y * uSkewX;
          
          vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        
        void main() {
          // Flat dark navy card #070d1a
          vec3 bg = vec3(0.027, 0.051, 0.102);
          
          // 1px cyan border (#2fd0ff)
          vec2 edge = min(vUv, 1.0 - vUv);
          float d = min(edge.x * 1.6, edge.y * 1.0);
          float border = smoothstep(0.016, 0.006, d);
          
          vec3 cyan = vec3(0.184, 0.816, 1.0);
          vec3 color = mix(bg, cyan, border * 0.8);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
  }, [corridorUniforms])

  // 4. Preload and pre-warm project textures
  const projectTextures = useMemo(() => {
    const map = new Map<string, THREE.Texture>()
    const loader = new THREE.TextureLoader()
    projects.forEach((p) => {
      const tex = loader.load(p.image, (loadedTex) => {
        // Pre-warm texture to GPU
        gl.initTexture(loadedTex)
      })
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.generateMipmaps = false
      map.set(p.id, tex)
    })
    return map
  }, [gl])

  // 5. Pre-warm corridor scene with camera
  useEffect(() => {
    if (corridorGroupRef.current) {
      gl.compile(corridorGroupRef.current, camera)
    }
  }, [gl, camera])

  // 6. Real project cards configuration
  // Evenly spaced in Z: Z = -12.0 - i * 8.5
  // Real cards in CENTER lane (x ~ 0 ± 0.16)
  const realCardsData = useMemo(() => {
    const realScale = 2.0 // 3.2 x 2.0
    return projects.map((p, i) => {
      const z = -12.0 - i * 8.5
      const x = i % 2 === 0 ? -0.16 : 0.16
      const y = i % 2 === 0 ? 0.04 : -0.04
      return {
        id: p.id,
        index: i,
        project: p,
        position: new THREE.Vector3(x, y, z),
        scale: realScale,
        texture: projectTextures.get(p.id),
      }
    })
  }, [projectTextures])

  // 7. Real card materials with velocity skew
  const realMaterials = useMemo(() => {
    const map = new Map<string, THREE.MeshBasicMaterial>()
    projects.forEach((p) => {
      const tex = projectTextures.get(p.id)
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: false,
        depthWrite: true,
        depthTest: true,
        toneMapped: false,
      })
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uSkewX = corridorUniforms.uSkewX
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
  }, [projectTextures, corridorUniforms])

  // 8. Placeholder cards: 14 total (7 left, 7 right)
  // Pushed to sides (|x| ~ 2.4 to 3.8), smaller scale (1.35)
  const placeholderCount = 14
  useEffect(() => {
    const mesh = instancedPlaceholdersRef.current
    if (!mesh) return

    const seeds = new Float32Array(placeholderCount)
    let pIdx = 0

    // 7 on the left
    for (let i = 0; i < 7; i++) {
      const z = -8.0 - i * 8.5
      const x = -2.8 - ((i * 3) % 4) * 0.28
      const y = ((i % 3) - 1) * 0.65
      const scale = 1.35

      _dummyPos.set(x, y, z)
      _dummyEuler.set(0, 0, (i % 2 === 0 ? 0.03 : -0.03))
      _dummyQuat.setFromEuler(_dummyEuler)
      _dummyScale.set(scale, scale, 1)
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale)
      mesh.setMatrixAt(pIdx, _dummyMatrix)

      seeds[pIdx] = (i * 0.17 + 0.11) % 1.0
      pIdx++
    }

    // 7 on the right
    for (let i = 0; i < 7; i++) {
      const z = -10.0 - i * 8.5
      const x = 2.8 + ((i * 3) % 4) * 0.28
      const y = (((i + 1) % 3) - 1) * 0.65
      const scale = 1.35

      _dummyPos.set(x, y, z)
      _dummyEuler.set(0, 0, (i % 2 === 0 ? -0.03 : 0.03))
      _dummyQuat.setFromEuler(_dummyEuler)
      _dummyScale.set(scale, scale, 1)
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale)
      mesh.setMatrixAt(pIdx, _dummyMatrix)

      seeds[pIdx] = (i * 0.23 + 0.55) % 1.0
      pIdx++
    }

    mesh.geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
    mesh.instanceMatrix.needsUpdate = true
  }, [placeholderCount])

  // Cleanup geometries and materials on unmount
  useEffect(() => {
    return () => {
      sharedGeometry.dispose()
      placeholderMaterial.dispose()
      realMaterials.forEach((m) => m.dispose())
    }
  }, [sharedGeometry, placeholderMaterial, realMaterials])

  // Real card mesh references for hover scaling
  const realMeshRefs = useRef<(THREE.Mesh | null)[]>([])

  // Track velocity for skew
  const prevCamZRef = useRef(camera.position.z)
  const smoothedVelRef = useRef(0)

  // useFrame updates uniforms and hover scale
  useFrame(({ clock }, delta) => {
    if (!visible) return

    // Update time uniform for GPU idle drift
    corridorUniforms.uTime.value = clock.elapsedTime

    // Calculate camera velocity along Z for skew
    const currentCamZ = camera.position.z
    const rawVel = (currentCamZ - prevCamZRef.current) / Math.max(delta, 0.001)
    prevCamZRef.current = currentCamZ

    // Smooth velocity
    smoothedVelRef.current = THREE.MathUtils.damp(
      smoothedVelRef.current,
      rawVel * 0.003,
      10,
      delta
    )
    // Clamp skew to subtle range [-0.15, 0.15]
    corridorUniforms.uSkewX.value = Math.max(-0.15, Math.min(0.15, smoothedVelRef.current))

    // Smooth hover scale on real cards
    realCardsData.forEach((card, idx) => {
      const mesh = realMeshRefs.current[idx]
      if (!mesh) return
      const targetScale = hoveredIndex === idx ? card.scale * 1.06 : card.scale
      mesh.scale.x = THREE.MathUtils.damp(mesh.scale.x, targetScale, 12, delta)
      mesh.scale.y = THREE.MathUtils.damp(mesh.scale.y, targetScale, 12, delta)
    })
  })

  // Cursor handling
  useEffect(() => {
    if (hoveredIndex !== null) {
      document.body.style.cursor = 'pointer'
    } else {
      document.body.style.cursor = 'auto'
    }
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hoveredIndex])

  const downPosRef = useRef<{ x: number; y: number; time: number } | null>(null)

  const handleClick = useCallback(
    (card: (typeof realCardsData)[0]) => {
      if (isDetailOpen) return
      onSelectProject?.(card.project)
    },
    [isDetailOpen, onSelectProject]
  )

  return (
    <group
      ref={corridorGroupRef}
      position={[0, -1000, 0]}
      visible={visible}
    >
      {/* 1. All 14 Placeholders rendered in ONE InstancedMesh (Zero overdraw, raycast null) */}
      <instancedMesh
        ref={instancedPlaceholdersRef}
        args={[sharedGeometry, placeholderMaterial, placeholderCount]}
        raycast={() => null}
        frustumCulled={false}
      />

      {/* 2. Real Project Cards in center lane */}
      {realCardsData.map((card, idx) => {
        const mat = realMaterials.get(card.id)
        return (
          <mesh
            key={card.id}
            ref={(el) => {
              realMeshRefs.current[idx] = el
            }}
            geometry={sharedGeometry}
            material={mat}
            position={card.position}
            scale={[card.scale, card.scale, 1]}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHoveredIndex(idx)
            }}
            onPointerOut={() => {
              setHoveredIndex((curr) => (curr === idx ? null : curr))
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              downPosRef.current = { x: e.clientX, y: e.clientY, time: performance.now() }
            }}
            onPointerUp={(e) => {
              e.stopPropagation()
              if (downPosRef.current) {
                const dx = Math.abs(e.clientX - downPosRef.current.x)
                const dy = Math.abs(e.clientY - downPosRef.current.y)
                const dt = performance.now() - downPosRef.current.time
                if (dx < 15 && dy < 15 && dt < 600) {
                  handleClick(card)
                }
                downPosRef.current = null
              }
            }}
            onClick={(e) => {
              e.stopPropagation()
              handleClick(card)
            }}
          />
        )
      })}
    </group>
  )
}

export default CardCorridor
