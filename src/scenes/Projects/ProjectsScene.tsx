import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { LOGOS_CONFIG } from '../../config/logos'
import { useLogoTextures } from './useLogoTexture'
import { LogoTile } from './LogoTile'
import { Space } from './Space'
import { CameraRig } from './CameraRig'

interface ProjectsSceneProps {
  startIntro: boolean
  isSkipped: boolean
  reducedMotion: boolean
  resetTrigger?: number
  onSceneReady: () => void
  onIntroComplete: () => void
  onWaypointChange: (index: number) => void
}

/**
 * 3D Projects Logo Scene
 *
 * Implements:
 * - Empty, bright, airy paper void (#f2f1ed) with soft depth fog (18..48)
 * - 7 floating software tool logos with front & back brand faces
 * - Drei Environment softbox lightformers + gentle ink-blue sparkle dust
 * - Full antialiased Canvas dpr={[1, 1.75]} (mobile [1, 1.25])
 * - Cinematic flythrough stopping at Python, React, and Flutter
 * - Seamless handoff to 360-degree free orbit controls + reset view
 */
export function ProjectsScene({
  startIntro,
  isSkipped,
  reducedMotion,
  resetTrigger = 0,
  onSceneReady,
  onIntroComplete,
  onWaypointChange,
}: ProjectsSceneProps) {
  const [isMobile, setIsMobile] = useState(false)
  const { textures, ready: texturesReady } = useLogoTextures()

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Notify parent scene is ready once all textures are cached
  useEffect(() => {
    if (texturesReady) {
      onSceneReady()
    }
  }, [texturesReady, onSceneReady])

  // Frameloop is "always" because floating tiles levitate continuously
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        dpr={isMobile ? [1, 1.25] : [1, 1.75]}
        frameloop="always"
        camera={{ position: [0.0, 6.0, 20.0], fov: 45, near: 0.1, far: 60 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
      >
        {/* Softbox lighting, background void, fog, and ink dust */}
        <Space isMobile={isMobile} />

        {/* Floating Software Tool Logo Tiles */}
        {texturesReady &&
          LOGOS_CONFIG.map((logo, idx) => {
            const tex = textures[logo.id]
            if (!tex) return null
            // Individual gentle float speed (1.0 to 1.55) to prevent synchronous movement
            const floatSpeed = 1.0 + ((idx * 67 + 13) % 11) * 0.05
            return (
              <LogoTile
                key={logo.id}
                id={logo.id}
                label={logo.label}
                texture={tex}
                position={logo.position}
                tilt={logo.tilt}
                scale={logo.scale}
                floatSpeed={floatSpeed}
              />
            )
          })}

        {/* Cinematic Camera Rig & Free Orbit Explorer */}
        <CameraRig
          start={startIntro}
          isSkipped={isSkipped}
          reducedMotion={reducedMotion}
          resetTrigger={resetTrigger}
          onReady={onSceneReady}
          onIntroComplete={onIntroComplete}
          onWaypointChange={onWaypointChange}
        />
      </Canvas>
    </div>
  )
}
