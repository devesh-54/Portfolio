import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { welcomeLayout } from '../../config/welcomeLayout'
import { revealUniforms } from './sketch/reveal'
import { darkTheme } from '../../config/theme'
import { buildCheckedPartsOutlineGeometry } from './sketch/MergedSketchOutline'

const MODEL_URL = '/models/gaming_computer.opt.glb'
const DRACO_PATH = '/draco/'

/** Strip extras and convert to non-indexed Float32 so mergeGeometries never mismatches */
function prepareSurfaceGeo(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  for (const key of Object.keys(g.attributes)) {
    if (key !== 'position' && key !== 'normal') {
      g.deleteAttribute(key)
    }
  }
  const pos = g.attributes.position
  if (pos && (pos.normalized || !(pos.array instanceof Float32Array))) {
    const f = new Float32Array(pos.count * 3)
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      f[i * 3] = v.x
      f[i * 3 + 1] = v.y
      f[i * 3 + 2] = v.z
    }
    g.setAttribute('position', new THREE.BufferAttribute(f, 3))
  }
  if (!g.attributes.normal) {
    g.computeVertexNormals()
  }
  return g
}

/** Ensure indexed part geometry has Float32 position before in-place matrix transforms */
function cloneAsFloat32Geo(src) {
  const g = new THREE.BufferGeometry()
  if (src.index) g.setIndex(src.index.clone())
  const pos = src.attributes.position
  if (pos) {
    const f = new Float32Array(pos.count * 3)
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      f[i * 3] = v.x
      f[i * 3 + 1] = v.y
      f[i * 3 + 2] = v.z
    }
    g.setAttribute('position', new THREE.BufferAttribute(f, 3))
  }
  const norm = src.attributes.normal
  if (norm) {
    const nf = new Float32Array(norm.count * 3)
    const nv = new THREE.Vector3()
    for (let i = 0; i < norm.count; i++) {
      nv.fromBufferAttribute(norm, i)
      nf[i * 3] = nv.x
      nf[i * 3 + 1] = nv.y
      nf[i * 3 + 2] = nv.z
    }
    g.setAttribute('normal', new THREE.BufferAttribute(nf, 3))
  }
  return g
}

export function GamingPC({
  showInternals = welcomeLayout.tower.showInternals,
  material,
  outlineColor = darkTheme.outlineInk,
  ...props
}) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const lineMatRef = useRef()
  const lineGroupRef = useRef()
  const internalMatRef = useRef()
  const internalGroupRef = useRef()

  const {
    keptGeometry,
    internalGeometry,
    outerOutlineGeo,
    internalOutlineGeo,
    stats,
  } = useMemo(() => {
    scene.updateMatrixWorld(true)

    const towerConfig = welcomeLayout.tower
    const targetH = welcomeLayout.pcTower.targetHeight

    // 1. Tower bbox = bbox of the whole model
    const towerBBox = new THREE.Box3().setFromObject(scene)
    const towerSize = new THREE.Vector3()
    towerBBox.getSize(towerSize)
    const towerVolume = Math.max(1e-6, towerSize.x * towerSize.y * towerSize.z)

    // 2. Shrunk bbox by internalInset on every side
    const shrunkBox = towerBBox.clone()
    shrunkBox.min.x += towerSize.x * towerConfig.internalInset
    shrunkBox.min.y += towerSize.y * towerConfig.internalInset
    shrunkBox.min.z += towerSize.z * towerConfig.internalInset
    shrunkBox.max.x -= towerSize.x * towerConfig.internalInset
    shrunkBox.max.y -= towerSize.y * towerConfig.internalInset
    shrunkBox.max.z -= towerSize.z * towerConfig.internalInset

    const scale = towerSize.y > 0 ? targetH / towerSize.y : 1
    const towerCenter = new THREE.Vector3()
    towerBBox.getCenter(towerCenter)

    const keptSurfaces = []
    const internalSurfaces = []
    const outerParts = []
    const internalParts = []

    let glassCount = 0
    let internalCount = 0
    let clutterCount = 0
    let keptCount = 0

    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry) return

      const name = (o.name || '').toLowerCase()
      const matName = (o.material?.name || '').toLowerCase()
      const isGlass =
        name.includes('glass') ||
        name.includes('window') ||
        matName.includes('glass') ||
        o.material?.alphaMode === 'BLEND' ||
        o.material?.transparent === true

      if (isGlass) {
        glassCount++
        return
      }

      const meshBox = new THREE.Box3().setFromObject(o)
      const meshSize = new THREE.Vector3()
      meshBox.getSize(meshSize)

      // Separate true outer chassis frame (for crisp 2-pass outer silhouette outlines) from internal parts.
      // Check exact object_4 / object_2183 names (not regex-stripped) so the outer frame gets crisp outerOutlineGeo,
      // while all surfaces use darkFillMaterial so no diagonal /// hatch lines clutter the window or fan openings.
      const isOuterFrame =
        name === 'object_4' ||
        name.startsWith('object_4_') ||
        name === 'object_2183' ||
        name.startsWith('object_2183_') ||
        meshBox.min.y <= towerBBox.min.y + towerSize.y * 0.055 ||
        !shrunkBox.intersectsBox(meshBox)

      // Preserve indexed Float32 topology in normalized world coords for clean per-part EdgesGeometry
      const partGeo = cloneAsFloat32Geo(o.geometry)
      partGeo.applyMatrix4(o.matrixWorld)
      partGeo.translate(-towerCenter.x, -towerBBox.min.y, -towerCenter.z)
      partGeo.scale(scale, scale, scale)

      const surfGeo = prepareSurfaceGeo(partGeo)

      if (!isOuterFrame) {
        const meshVolume = meshSize.x * meshSize.y * meshSize.z
        if (meshVolume < towerConfig.minPartVolumeRatio * towerVolume) clutterCount++
        else internalCount++
        internalSurfaces.push(surfGeo)
        internalParts.push({
          geometry: partGeo,
          passes: 1,
          overshootScale: 0.14,
          jitterScale: 0.25,
        })
      } else {
        keptCount++
        keptSurfaces.push(surfGeo)
        outerParts.push({
          geometry: partGeo,
          thresholdAngle: towerConfig.edgeAngle ?? 26,
          maxEdges: 140,
          passes: 2,
          overshootScale: 0.65,
          jitterScale: 0.7,
        })
      }
    })

    const mergedKept =
      keptSurfaces.length > 0 ? BufferGeometryUtils.mergeGeometries(keptSurfaces, false) : null
    const mergedInternal =
      internalSurfaces.length > 0
        ? BufferGeometryUtils.mergeGeometries(internalSurfaces, false)
        : null

    keptSurfaces.forEach((g) => g.dispose())
    internalSurfaces.forEach((g) => g.dispose())

    if (mergedKept) {
      mergedKept.computeVertexNormals()
      mergedKept.computeBoundingBox()
      mergedKept.computeBoundingSphere()
    }

    if (mergedInternal) {
      mergedInternal.computeVertexNormals()
      mergedInternal.computeBoundingBox()
      mergedInternal.computeBoundingSphere()
    }

    // Per-part checked outlines so EVERY outer chassis & internal CPU/GPU/RAM/fan/tube/heatsink part reads cleanly
    const outerRes = buildCheckedPartsOutlineGeometry(outerParts, {
      thresholdAngle: 26,
      minLenRatio: 0.022,
      maxMinLen: 0.012,
      absMinLen: 0.0012,
      jitter: 0.007,
      seed: 202,
      defaultMaxEdgesPerPart: 140,
      minOutwardPush: 0.0008,
    })

    const internalRes = showInternals
      ? buildCheckedPartsOutlineGeometry(internalParts, {
          thresholdAngle: 32,
          minLenRatio: 0.055,
          maxMinLen: 0.015,
          absMinLen: 0.0005,
          jitter: 0.0022,
          seed: 303,
          defaultMaxEdgesPerPart: 10,
          minOutwardPush: 0.0007,
        })
      : {
          geometry: null,
          stats: { totalParts: 0, partsWithLines: 0, partsWithZeroLines: 0, totalEdges: 0, totalSegments: 0 },
        }

    outerParts.forEach((p) => p.geometry.dispose())
    internalParts.forEach((p) => p.geometry.dispose())

    const fullStats = {
      keptCount,
      internalCount,
      clutterCount,
      glassCount,
      outerOutline: outerRes.stats,
      internalOutline: internalRes.stats,
    }
    if (typeof window !== 'undefined') {
      window.__pcOutlineStats = fullStats
    }

    return {
      keptGeometry: mergedKept,
      internalGeometry: mergedInternal,
      outerOutlineGeo: outerRes.geometry,
      internalOutlineGeo: internalRes.geometry,
      stats: fullStats,
    }
  }, [scene, showInternals])

  // Deep dark matte surface fill for internal components (no diagonal hatch stripes cluttering the window)
  const darkFillMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0x070b14,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
  }, [])

  useEffect(() => {
    return () => {
      if (keptGeometry) keptGeometry.dispose()
      if (internalGeometry) internalGeometry.dispose()
      if (outerOutlineGeo) outerOutlineGeo.dispose()
      if (internalOutlineGeo) internalOutlineGeo.dispose()
      if (darkFillMaterial) darkFillMaterial.dispose()
    }
  }, [keptGeometry, internalGeometry, outerOutlineGeo, internalOutlineGeo, darkFillMaterial])

  useFrame(() => {
    const k = revealUniforms.uRevealLines.value
      ? THREE.MathUtils.smoothstep(revealUniforms.uReveal.value, 0, 0.5)
      : 1
    if (lineGroupRef.current) lineGroupRef.current.visible = k > 0.001
    if (lineMatRef.current) lineMatRef.current.opacity = 0.88 * k
    if (internalGroupRef.current) internalGroupRef.current.visible = showInternals && k > 0.001
    if (internalMatRef.current) internalMatRef.current.opacity = 0.56 * k
  })

  return (
    <group {...props} data-parts={stats.keptCount + stats.internalCount + stats.clutterCount}>
      {/* Outer Shell Mesh with clean dark matte fill (no noisy diagonal hatch lines over the PC body/window) */}
      {keptGeometry && (
        <mesh geometry={keptGeometry} material={darkFillMaterial} castShadow />
      )}

      {/* Checked Outer Outline (every outer part covered) */}
      {outerOutlineGeo && (
        <group ref={lineGroupRef}>
          <lineSegments geometry={outerOutlineGeo}>
            <lineBasicMaterial
              ref={lineMatRef}
              color={outlineColor}
              transparent
              opacity={0.88}
              depthWrite={false}
            />
          </lineSegments>
        </group>
      )}

      {/* Internal Components: clean dark matte fill (no noisy hatch stripes inside window) */}
      {showInternals && internalGeometry && (
        <mesh geometry={internalGeometry} material={darkFillMaterial} />
      )}

      {/* Checked Internal Outlines (every RAM stick, GPU fan, AIO pump, radiator fin, motherboard part, cable) */}
      {showInternals && internalOutlineGeo && (
        <group ref={internalGroupRef}>
          <lineSegments geometry={internalOutlineGeo}>
            <lineBasicMaterial
              ref={internalMatRef}
              color={outlineColor}
              transparent
              opacity={0.56}
              depthWrite={false}
            />
          </lineSegments>
        </group>
      )}
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)

export default GamingPC
