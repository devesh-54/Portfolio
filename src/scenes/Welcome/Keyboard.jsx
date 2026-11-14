import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { welcomeLayout } from '../../config/welcomeLayout'
import { revealUniforms } from './sketch/reveal'
import { darkTheme } from '../../config/theme'
import { buildCheckedPartsOutlineGeometry } from './sketch/MergedSketchOutline'

const MODEL_URL = '/models/keyboard.opt.glb'
const DRACO_PATH = '/draco/'

function prepareSurfaceGeo(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  for (const key of Object.keys(g.attributes)) {
    if (key !== 'position' && key !== 'normal') {
      g.deleteAttribute(key)
    }
  }
  if (!g.attributes.normal) {
    g.computeVertexNormals()
  }
  return g
}

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

export function Keyboard({
  material,
  outlineColor = darkTheme.outlineInk,
  ...props
}) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH)
  const lineMatRef = useRef()
  const lineGroupRef = useRef()

  const { mergedGeometry, outlineGeometry, stats } = useMemo(() => {
    scene.updateMatrixWorld(true)

    const targetWidth = welcomeLayout.keyboard.targetWidth
    const bounds = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    const scale = size.x > 0 ? targetWidth / size.x : 1

    const surfaceGeos = []
    const partEntries = []

    scene.traverse((o) => {
      if (!o.isMesh || !o.geometry) return
      const name = (o.name || '').toLowerCase()
      if (name.includes('plane001') || name.includes('plane.001')) return

      const partGeo = cloneAsFloat32Geo(o.geometry)
      partGeo.applyMatrix4(o.matrixWorld)
      partGeo.translate(-center.x, -bounds.min.y, -center.z)
      partGeo.scale(scale, scale, scale)

      surfaceGeos.push(prepareSurfaceGeo(partGeo))

      const isMainBodyAndKeys = name.includes('cube001') || name.includes('cube.001')
      const isFrontLip = name.includes('cube002') || name.includes('cube.002')
      partEntries.push({
        geometry: partGeo,
        thresholdAngle: isMainBodyAndKeys ? 25 : isFrontLip ? 20 : 35,
        minLen: isMainBodyAndKeys ? 0.0028 : isFrontLip ? 0.004 : 0.0014,
        maxEdges: isMainBodyAndKeys ? 5200 : isFrontLip ? 120 : 6,
        passes: isFrontLip ? 2 : 1,
        overshootScale: isFrontLip ? 0.55 : 0.12,
        jitterScale: isFrontLip ? 0.45 : 0.18,
      })
    })

    const merged =
      surfaceGeos.length > 0 ? BufferGeometryUtils.mergeGeometries(surfaceGeos, false) : null
    surfaceGeos.forEach((g) => g.dispose())

    if (merged) {
      merged.computeVertexNormals()
      merged.computeBoundingBox()
      merged.computeBoundingSphere()
    }

    const outlineRes = buildCheckedPartsOutlineGeometry(partEntries, {
      thresholdAngle: 22,
      minLenRatio: 0.015,
      maxMinLen: 0.0045,
      absMinLen: 0.0008,
      jitter: 0.0055,
      seed: 404,
      defaultMaxEdgesPerPart: 48,
      minOutwardPush: 0.0006,
    })

    partEntries.forEach((p) => p.geometry.dispose())

    if (typeof window !== 'undefined') {
      window.__keyboardOutlineStats = outlineRes.stats
    }

    return {
      mergedGeometry: merged,
      outlineGeometry: outlineRes.geometry,
      stats: outlineRes.stats,
    }
  }, [scene])

  const darkFillMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: 0x090d18 })
  }, [])

  useEffect(() => {
    return () => {
      if (mergedGeometry) mergedGeometry.dispose()
      if (outlineGeometry) outlineGeometry.dispose()
      if (darkFillMaterial) darkFillMaterial.dispose()
    }
  }, [mergedGeometry, outlineGeometry, darkFillMaterial])

  useFrame(() => {
    const k = revealUniforms.uRevealLines.value
      ? THREE.MathUtils.smoothstep(revealUniforms.uReveal.value, 0, 0.5)
      : 1
    if (lineGroupRef.current) lineGroupRef.current.visible = k > 0.001
    if (lineMatRef.current) lineMatRef.current.opacity = 0.88 * k
  })

  return (
    <group {...props} data-parts={stats.totalParts}>
      {mergedGeometry && (
        <mesh geometry={mergedGeometry} castShadow>
          {material || darkFillMaterial}
        </mesh>
      )}
      {outlineGeometry && (
        <group ref={lineGroupRef}>
          <lineSegments geometry={outlineGeometry}>
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
    </group>
  )
}

useGLTF.preload(MODEL_URL, DRACO_PATH)

export default Keyboard

