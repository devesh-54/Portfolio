import { Environment, Lightformer, Sparkles } from '@react-three/drei'

interface SpaceProps {
  isMobile?: boolean
}

/**
 * 3D Space, Lighting, and Subtle Atmospheric Particles
 * - Background: #f2f1ed with THREE.Fog(18, 48)
 * - Lighting: HDR-free drei <Environment resolution={256}> with softbox Lightformers
 * - Subtle Directional Light: Warm, soft highlight
 * - Atmosphere: Floating ink-blue dust sparkles
 */
export function Space({ isMobile = false }: SpaceProps) {
  return (
    <>
      {/* Background color and soft depth fog */}
      <color attach="background" args={['#f2f1ed']} />
      <fog attach="fog" args={['#f2f1ed', 18, 48]} />

      {/* Lighting via HDR-free studio softboxes */}
      <Environment resolution={256}>
        {/* Large warm key softbox */}
        <Lightformer
          form="rect"
          intensity={1.8}
          color="#fff5e8"
          position={[-6, 6, 6]}
          scale={[12, 12, 1]}
          target={[0, 0, 0]}
        />
        {/* Cool fill softbox */}
        <Lightformer
          form="rect"
          intensity={1.0}
          color="#dbe6ff"
          position={[6, -3, -4]}
          scale={[10, 10, 1]}
          target={[0, 0, 0]}
        />
        {/* Top highlight strip */}
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#ffffff"
          position={[0, 10, 0]}
          scale={[16, 3, 1]}
          target={[0, 0, 0]}
        />
        {/* Under/bottom bounce fill */}
        <Lightformer
          form="circle"
          intensity={0.6}
          color="#f2f1ed"
          position={[0, -6, 6]}
          scale={[8, 8, 1]}
        />
      </Environment>

      {/* One soft directional key light without shadow maps */}
      <directionalLight
        position={[6, 8, 5]}
        intensity={1.2}
        color="#ffffff"
        castShadow={false}
      />

      {/* Floating subtle ink-blue dust sparkles */}
      <Sparkles
        count={isMobile ? 30 : 60}
        size={2}
        scale={[16, 10, 16]}
        speed={0.2}
        color="#1a1f9c"
        opacity={0.35}
      />
    </>
  )
}
