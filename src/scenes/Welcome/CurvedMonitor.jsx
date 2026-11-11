import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { MergedSketchOutline } from './sketch/MergedSketchOutline'
import { welcomeLayout } from '../../config/welcomeLayout'

const MODEL_URL = '/models/curved_monitor.opt.glb'
const DRACO_PATH = '/draco/'

export function CurvedMonitor({
  material,
  outline,
  outlineColor = '#ffffff',
  screenMeshRef,
  hideBody = false,
  ...props
}) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)

  // Separate body mesh from screen mesh and normalize their geometries
  const { bodyGeometry, screenGeometry } = useMemo(() => {
    let body = null
    let screen = null

    scene.traverse((o) => {
      if (o.isMesh) {
        const name = (o.name || '').toLowerCase()
        const matName = (o.material?.name || '').toLowerCase()
        if (name.includes('screen') || matName.includes('screen')) {
          screen = o
        } else {
          body = o
        }
      }
    })

    if (!body) return { bodyGeometry: null, screenGeometry: null }

    scene.updateMatrixWorld(true)
    const rotY = new THREE.Matrix4().makeRotationY(-Math.PI / 2)

    // Compute unified bounding box across all monitor meshes
    const bounds = new THREE.Box3()
    const rawBodyGeom = body.geometry.clone()
    rawBodyGeom.applyMatrix4(body.matrixWorld)
    rawBodyGeom.applyMatrix4(rotY)
    rawBodyGeom.computeBoundingBox()
    bounds.copy(rawBodyGeom.boundingBox)

    let rawScreenGeom = null
    if (screen) {
      rawScreenGeom = screen.geometry.clone()
      rawScreenGeom.applyMatrix4(screen.matrixWorld)
      rawScreenGeom.applyMatrix4(rotY)
      rawScreenGeom.computeBoundingBox()
      bounds.union(rawScreenGeom.boundingBox)
    }

    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const targetH = welcomeLayout.monitor.targetHeight // 2.08
    const scale = size.y > 0 ? targetH / size.y : 1

    // Normalize body geometry
    rawBodyGeom.translate(-center.x, -bounds.min.y, -center.z)
    rawBodyGeom.scale(scale, scale, scale)
    rawBodyGeom.computeVertexNormals()
    rawBodyGeom.computeBoundingBox()
    rawBodyGeom.computeBoundingSphere()

    // Normalize screen geometry identically
    if (rawScreenGeom) {
      rawScreenGeom.translate(-center.x, -bounds.min.y, -center.z)
      rawScreenGeom.scale(scale, scale, scale)
      rawScreenGeom.computeVertexNormals()
      rawScreenGeom.computeBoundingBox()
      rawScreenGeom.computeBoundingSphere()
    }

    return {
      bodyGeometry: rawBodyGeom,
      screenGeometry: rawScreenGeom,
    }
  }, [scene])

  // Fully opaque pitch-black OLED screen material (#000000)
  // transparent: false, depthWrite: true, colorWrite: true. Stand/back cannot bleed through.
  const screenMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
      colorWrite: true,
      toneMapped: false,
    })
  }, [])

  useEffect(() => {
    return () => {
      if (bodyGeometry) bodyGeometry.dispose()
      if (screenGeometry) screenGeometry.dispose()
      if (screenMaterial) screenMaterial.dispose()
    }
  }, [bodyGeometry, screenGeometry, screenMaterial])

  return (
    <group {...props}>
      {/* Monitor body geometry with sketch outline */}
      {bodyGeometry && !hideBody && (
        <mesh geometry={bodyGeometry} castShadow renderOrder={0}>
          {material}
          <MergedSketchOutline
            geometry={bodyGeometry}
            color={outlineColor}
            thresholdAngle={32}
            maxSegments={6000}
            jitter={0.018}
            seed={101}
          />
        </mesh>
      )}

      {/* Screen aperture mesh: solid opaque pitch-black OLED surface */}
      {screenGeometry && (
        <mesh
          ref={screenMeshRef}
          geometry={screenGeometry}
          material={screenMaterial}
          renderOrder={1}
          visible={!hideBody}
        />
      )}
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)

export default CurvedMonitor
