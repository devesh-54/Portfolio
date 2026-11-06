import { Suspense, useMemo, useState, useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import { Leva } from 'leva'
import { SketchMaterial } from './sketch/SketchMaterial'
import { SketchOutline } from './sketch/SketchOutline'
import { RevealEffect } from './sketch/RevealEffect'
import { ObjectGlow } from './sketch/ObjectGlow'
import { CurvedMonitor } from './CurvedMonitor'
import { GamingPC } from './GamingPC'
import { BlockText } from './BlockText'
import { CameraRig } from './CameraRig'
import { Header } from './Header'
import { Credits } from './Credits'
import { Loader } from './Loader'
import { useSketchControls } from './useSketchControls'
import cameraSettings from './camera-settings.json'
import { welcomeLayout } from '../../config/welcomeLayout'
import { darkTheme } from '../../config/theme'
import { ScreenDive } from './ScreenDive'
import { DepthFlythrough } from '../Projects/DepthFlythrough'
import { navigateWithFade } from '../../ui/navigateWithFade'

// the camera starts where the intro does, already looking at its point of interest
const INTRO_START = cameraSettings.intro.points[0]

const toRadians = (degrees) => degrees.map(THREE.MathUtils.degToRad)

/**
 * @param {{
 *   onIntroEnd?: () => void,
 *   screenMeshRef?: any,
 *   externalPose?: any,
 *   frameloop?: any,
 *   showChrome?: boolean,
 *   inHeroOverlayRef?: any,
 *   creditsRef?: any,
 *   scrollHintRef?: any,
 *   onThresholdChange?: (paused: boolean) => void,
 *   onSelectProject?: (project: any) => void,
 *   isDetailOpen?: boolean
 * }} [props]
 */
export default function App({
  onIntroEnd,
  screenMeshRef,
  externalPose,
  frameloop = 'always',
  showChrome = false,
  inHeroOverlayRef,
  creditsRef,
  scrollHintRef,
  onThresholdChange,
  onSelectProject,
  isDetailOpen = false,
} = {}) {
  const navigate = useNavigate()
  const [diveCompleted, setDiveCompleted] = useState(false)
  const [isCorridor, setIsCorridor] = useState(false)
  const [washed, setWashed] = useState(false)
  const [c] = useSketchControls(setWashed)
  const [sceneReady, setSceneReady] = useState(false)
  const [loaderHidden, setLoaderHidden] = useState(false)

  // Interactive hover states for Phase 10
  const [hoveredObject, setHoveredObject] = useState(null)

  const [introEnded, setIntroEnded] = useState(() => {
    if (typeof window === 'undefined') return false
    const forceReplay =
      window.location.search.includes('replay=1') || window.location.search.includes('reset=1')
    if (forceReplay) {
      sessionStorage.removeItem('welcomeIntroPlayed')
      return false
    }
    const visited = sessionStorage.getItem('welcomeIntroPlayed') === 'true'
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hasP = window.location.search.includes('p=')
    return visited || reducedMotion || hasP
  })

  const handleIntroEnd = useCallback(() => {
    setIntroEnded(true)
    sessionStorage.setItem('welcomeIntroPlayed', 'true')
    onIntroEnd?.()
  }, [onIntroEnd])

  useEffect(() => {
    if (introEnded) {
      onIntroEnd?.()
    }
  }, [introEnded, onIntroEnd])

  // Responsive framing: ensures whole word DEVESH (including H) fits with >= 5% margin
  const [aspect, setAspect] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9
  )

  useEffect(() => {
    const handleResize = () => setAspect(window.innerWidth / window.innerHeight)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const responsiveScale = useMemo(() => {
    if (aspect >= 1.25) return 1.0
    const visibleWidth = 2 * 9.8 * Math.tan((17.5 * Math.PI) / 180) * aspect
    const maxContentWidth = visibleWidth * 0.86
    return Math.min(1.0, maxContentWidth / 5.2)
  }, [aspect])

  // Cursor handling
  useEffect(() => {
    document.body.style.cursor = hoveredObject ? 'pointer' : 'auto'
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hoveredObject])

  const light = useMemo(() => {
    const a = THREE.MathUtils.degToRad(c.lightAngle)
    return new THREE.Vector3(Math.cos(a) * 0.85, c.lightHeight, Math.sin(a) * 0.85).normalize()
  }, [c.lightAngle, c.lightHeight])

  // dark-themed sketch material
  const material = (color = darkTheme.hatchInk) => (
    <SketchMaterial
      color={color}
      paper={darkTheme.surfaceFill}
      light={light}
      density={c.density}
      pressure={c.pressure}
      loops={c.loops}
      width={c.width}
      tooth={c.tooth}
      angle={THREE.MathUtils.degToRad(c.angle)}
      seed={c.seed}
    />
  )

  const outline = (color = darkTheme.outlineInk) =>
    c.outline && (
      <SketchOutline
        color={color}
        width={c.outlineWidth}
        opacity={c.outlineOpacity}
        jitter={c.jitter}
        seed={c.seed}
      />
    )

function BackgroundController({ isCorridor }) {
  const { gl } = useThree()
  useEffect(() => {
    gl.setClearColor(isCorridor ? 0xffffff : 0x000000, 1.0)
  }, [gl, isCorridor])
  return <color attach="background" args={[isCorridor ? '#ffffff' : '#000000']} />
}

  return (
    <div
      className="welcome-root theme-dark"
      style={{
        background: isCorridor ? '#ffffff' : '#000000',
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Canvas
        flat
        dpr={[1, 1.5]}
        gl={{ powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        frameloop={frameloop}
        camera={{ position: INTRO_START.position, fov: 35 }}
        style={{ background: isCorridor ? '#ffffff' : '#000000' }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(...INTRO_START.target)
          gl.setClearColor(isCorridor ? 0xffffff : 0x000000, 1.0)
          if (typeof window !== 'undefined') {
            window.__gl = gl
            window.__canvas = gl.domElement
          }
        }}
      >
        <BackgroundController isCorridor={isCorridor} />
        <directionalLight position={light.clone().multiplyScalar(8)} />
        {!isCorridor && (
          <RevealEffect
            washed={washed}
            duration={c.effectDuration}
            easing={c.effectEasing}
            sweep={c.effectSweep}
            scale={c.effectScale}
            edge={c.effectEdge}
            wet={c.effectWet}
            shadow={false}
            paper={false}
            lines={c.effectLines}
          />
        )}

        <Suspense fallback={null}>
          <group
            scale={responsiveScale}
            position={[0, (1 - responsiveScale) * 0.45, 0]}
            visible={!isCorridor}
          >
            {/* 1. Curved Ultrawide Monitor (Facing inward/center-right, fig 1 direction) */}
            <group
              position={welcomeLayout.monitor.position}
              rotation={welcomeLayout.monitor.rotation}
            >
              <CurvedMonitor
                screenMeshRef={screenMeshRef}
                hideBody={diveCompleted || isCorridor}
                material={material(darkTheme.hatchInk)}
                outlineColor={darkTheme.outlineInk}
              />
              {showChrome && !diveCompleted && (
                <>
                  <ObjectGlow
                    width={4.2}
                    height={welcomeLayout.monitor.targetHeight}
                    depth={0.8}
                    billboardOpacity={0.18}
                    discOpacity={0.14}
                    hovered={hoveredObject === 'monitor'}
                  />
                  {/* Invisible Hit Mesh */}
                  <mesh
                    position={[0, welcomeLayout.monitor.targetHeight * 0.5, 0]}
                    onPointerOver={(e) => {
                      e.stopPropagation()
                      setHoveredObject('monitor')
                    }}
                    onPointerOut={() => setHoveredObject(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigateWithFade('/projects', navigate)
                    }}
                  >
                    <boxGeometry args={[4.2, welcomeLayout.monitor.targetHeight, 0.9]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                  </mesh>
                </>
              )}
            </group>

            {/* 2. Gaming PC Tower (Outer lines only, sleek dark body) */}
            {!diveCompleted && (
              <group
                position={welcomeLayout.pcTower.position}
                rotation={welcomeLayout.pcTower.rotation}
              >
                <GamingPC
                  showInternals={c.showInternals ?? welcomeLayout.tower.showInternals ?? true}
                  material={material(darkTheme.hatchInk)}
                  outlineColor={darkTheme.outlineInk}
                />
                <ObjectGlow
                  width={2.2}
                  height={welcomeLayout.pcTower.targetHeight}
                  depth={1.4}
                  billboardOpacity={0.38}
                  discOpacity={0.20}
                  hovered={hoveredObject === 'pc'}
                />
                {/* Invisible Hit Mesh */}
                {showChrome && (
                  <mesh
                    position={[0, welcomeLayout.pcTower.targetHeight * 0.5, 0]}
                    onPointerOver={(e) => {
                      e.stopPropagation()
                      setHoveredObject('pc')
                    }}
                    onPointerOut={() => setHoveredObject(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigateWithFade('/skills', navigate)
                    }}
                  >
                    <boxGeometry args={[1.8, welcomeLayout.pcTower.targetHeight, 1.3]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                  </mesh>
                )}
              </group>
            )}

            {/* 3. DEVESH Block Text (Foreground right - Fig 2 dynamic angle) */}
            {!diveCompleted && (
              <group
                position={welcomeLayout.text.position}
                rotation={welcomeLayout.text.rotation}
              >
                <BlockText
                  text="DEVESH"
                  material={material(darkTheme.hatchInk)}
                  outline={outline(darkTheme.outlineInk)}
                  scale={welcomeLayout.text.scale}
                />
                <ObjectGlow
                  width={4.5 * welcomeLayout.text.scale}
                  height={0.8 * welcomeLayout.text.scale}
                  depth={0.4}
                  discOpacity={0.14}
                  billboardOpacity={0.12}
                  hovered={hoveredObject === 'text'}
                />
                {/* Invisible Hit Mesh */}
                {showChrome && (
                  <mesh
                    position={[0, 0.4 * welcomeLayout.text.scale, 0]}
                    onPointerOver={(e) => {
                      e.stopPropagation()
                      setHoveredObject('text')
                    }}
                    onPointerOut={() => setHoveredObject(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigateWithFade('/about', navigate)
                    }}
                  >
                    <boxGeometry
                      args={[
                        welcomeLayout.text.wordWidth * welcomeLayout.text.scale,
                        welcomeLayout.text.letterHeight * welcomeLayout.text.scale,
                        0.5,
                      ]}
                    />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                  </mesh>
                )}
              </group>
            )}
          </group>

          {/* Multi-plane Depth Flythrough at y = -1000 */}
          <DepthFlythrough
            visible={isCorridor}
            onSelectProject={onSelectProject}
            isDetailOpen={isDetailOpen}
          />

          {externalPose && (
            <ScreenDive
              screenMeshRef={screenMeshRef}
              externalPose={externalPose}
              onDiveCompleteChange={setDiveCompleted}
              onHandoverChange={setIsCorridor}
              inHeroOverlayRef={inHeroOverlayRef}
              creditsRef={creditsRef}
              scrollHintRef={scrollHintRef}
              introEnded={introEnded}
            />
          )}

          {/* Camera Rig (Inside Suspense so it waits for models to load) */}
          <CameraRig
            onReady={() => setSceneReady(true)}
            start={loaderHidden}
            onIntroEnd={handleIntroEnd}
            skipIntro={introEnded}
            externalPose={externalPose}
          />
        </Suspense>
      </Canvas>

      {showChrome && <Header actionsVisible={introEnded} />}
      <div
        className="leva-wrap"
        style={{
          display:
            typeof window !== 'undefined' && window.location.search.includes('dev=1')
              ? 'block'
              : 'none',
        }}
      >
        <Leva
          fill
          collapsed
          hidden={
            typeof window === 'undefined' || !window.location.search.includes('dev=1')
          }
        />
      </div>

      <Loader
        ready={sceneReady}
        onHidden={() => setLoaderHidden(true)}
        onTransitionEnd={() => setLoaderHidden(true)}
      />

      {showChrome && <Credits />}
    </div>
  )
}
