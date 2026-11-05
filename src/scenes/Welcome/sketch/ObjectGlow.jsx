import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { darkTheme } from '../../../config/theme'

function createRadialGradientTexture(colorHex = darkTheme.glowCyan) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  const color = new THREE.Color(colorHex)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)

  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1.0)`)
  gradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.65)`)
  gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.2)`)
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`)

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function ObjectGlow({
  width = 2.0,
  height = 2.0,
  depth = 1.0,
  color = darkTheme.glowCyan,
  billboardOpacity = 0.30,
  discOpacity = 0.28,
  hovered = false,
  ...props
}) {
  const texture = useMemo(() => createRadialGradientTexture(color), [color])
  const billboardMatRef = useRef()
  const discMatRef = useRef()

  useEffect(() => {
    return () => {
      if (texture) texture.dispose()
    }
  }, [texture])

  // Smooth hover transition for Phase 10
  useFrame((_, delta) => {
    const targetBillboard = hovered ? 0.60 : billboardOpacity
    const targetDisc = hovered ? 0.50 : discOpacity
    if (billboardMatRef.current) {
      billboardMatRef.current.opacity = THREE.MathUtils.damp(
        billboardMatRef.current.opacity,
        targetBillboard,
        6,
        delta
      )
    }
    if (discMatRef.current) {
      discMatRef.current.opacity = THREE.MathUtils.damp(
        discMatRef.current.opacity,
        targetDisc,
        6,
        delta
      )
    }
  })

  return (
    <group {...props}>
      {/* (a) Large additive-blended billboard behind the object facing the camera */}
      <Billboard
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
        position={[0, height * 0.5, -0.25]}
      >
        <planeGeometry args={[width * 1.8, height * 1.8]} />
        <meshBasicMaterial
          ref={billboardMatRef}
          map={texture}
          transparent
          opacity={billboardOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </Billboard>

      {/* (b) Flat additive elliptical glow disc on y = 0 under it */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
      >
        <planeGeometry args={[width * 1.5, Math.max(depth * 2.2, 1.2)]} />
        <meshBasicMaterial
          ref={discMatRef}
          map={texture}
          transparent
          opacity={discOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export default ObjectGlow
