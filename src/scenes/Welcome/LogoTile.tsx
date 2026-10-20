import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'

interface LogoTileProps {
  id: string
  label: string
  texture: THREE.CanvasTexture
  position: [number, number, number]
  tilt: [number, number, number]
  scale?: number
  floatSpeed?: number
}

/**
 * 3D Pure Floating Software Logo
 * - No bulky rectangular box: The pure brand logo floats freely in 3D space
 * - Front & Back faces: Double-sided orientation so the logo reads correctly from any perspective
 * - Levitation: drei <Float> with gentle calm motion
 * - Hover: Smooth scale lerp to 1.15 with pointer cursor
 */
export function LogoTile({
  id,
  label,
  texture,
  position,
  tilt,
  scale = 0.85,
  floatSpeed = 1.2,
}: LogoTileProps) {
  const groupRef = useRef<THREE.Group>(null)
  const isHovered = useRef(false)
  const currentScale = useRef(scale)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const target = (isHovered.current ? 1.15 : 1.0) * scale
    // Smooth frame-rate independent scale damping
    currentScale.current = THREE.MathUtils.damp(currentScale.current, target, 12, delta)
    groupRef.current.scale.setScalar(currentScale.current)
  })

  return (
    <group name={id} position={position} rotation={tilt}>
      <Float
        speed={floatSpeed}
        rotationIntensity={0.25}
        floatIntensity={0.5}
        floatingRange={[-0.12, 0.12]}
      >
        <group
          ref={groupRef}
          onPointerOver={(e) => {
            e.stopPropagation()
            isHovered.current = true
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            isHovered.current = false
            document.body.style.cursor = 'auto'
          }}
          aria-label={label}
        >
          {/* Front Logo Face */}
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial
              map={texture}
              transparent
              toneMapped={false}
              depthWrite={false}
              side={THREE.FrontSide}
            />
          </mesh>

          {/* Back Logo Face (Rotated PI on Y so reads correctly when camera orbits behind) */}
          <mesh position={[0, 0, -0.005]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.95, 0.95]} />
            <meshBasicMaterial
              map={texture}
              transparent
              toneMapped={false}
              depthWrite={false}
              side={THREE.FrontSide}
            />
          </mesh>
        </group>
      </Float>
    </group>
  )
}
