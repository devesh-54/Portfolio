import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { welcomeLayout } from '../../config/welcomeLayout'
import { revealUniforms } from './sketch/reveal'
import { darkTheme } from '../../config/theme'

const MODEL_URL = '/models/gaming_computer.opt.glb'
const DRACO_PATH = '/draco/'

function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 2-pass hand-drawn strokes matching MergedSketchOutline
const PASSES = [
  { wobble: 0.8, overshoot: [0.005, 0.025] },
  { wobble: 1.1, overshoot: [-0.005, 0.020] },
]

/**
 * Builds sketch line segments for geometry with threshold angle, edge length filter,
 * wobble and overshoot passes, capped at maxSegments.
 */
function buildWobblyOutline(geometry, options = {}) {
  const {
    thresholdAngle = 45,
    minLen = 0.0368,
    maxSegments = 1500,
    jitter = 0.012,
    seed = 42,
  } = options

  if (!geometry) return new THREE.BufferGeometry()

  const edgesGeo = new THREE.EdgesGeometry(geometry, thresholdAngle)
  const posArray = edgesGeo.attributes.position ? edgesGeo.attributes.position.array : null
  if (!posArray || posArray.length === 0) {
    edgesGeo.dispose()
    return new THREE.BufferGeometry()
  }

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  const center = geometry.boundingSphere ? geometry.boundingSphere.center : new THREE.Vector3()

  const candidateEdges = []
  for (let i = 0; i < posArray.length; i += 6) {
    const a = new THREE.Vector3(posArray[i], posArray[i + 1], posArray[i + 2])
    const b = new THREE.Vector3(posArray[i + 3], posArray[i + 4], posArray[i + 5])
    const len = a.distanceTo(b)
    if (len >= minLen) {
      candidateEdges.push({ a, b, len })
    }
  }
  edgesGeo.dispose()

  // Prioritize longer structural edges
  candidateEdges.sort((e1, e2) => e2.len - e1.len)

  const subsegmentsPerPass = 2
  const segmentsPerEdge = PASSES.length * subsegmentsPerPass
  const allowedEdges = Math.min(candidateEdges.length, Math.floor(maxSegments / segmentsPerEdge))

  const selectedEdges = candidateEdges.slice(0, allowedEdges)
  const totalSegments = selectedEdges.length * segmentsPerEdge
  const positions = new Float32Array(totalSegments * 6)
  let offset = 0

  const random = mulberry32(seed * 9973 + 17)
  const between = ([min, max]) => min + (max - min) * random()

  for (const { a, b, len } of selectedEdges) {
    const d = b.clone().sub(a).normalize()
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const out = mid.sub(center)
    out.addScaledVector(d, -out.dot(d)).normalize()
    const side = new THREE.Vector3().crossVectors(d, out)

    for (const pass of PASSES) {
      const start = a.clone().addScaledVector(d, -between(pass.overshoot) * len)
      const end = b.clone().addScaledVector(d, between(pass.overshoot) * len)
      const amplitude = jitter * Math.min(len * 0.4, 0.02) * pass.wobble
      const phase = [random(), random(), random()].map((v) => v * Math.PI * 2)
      const bow = (random() - 0.5) * 0.8
      const shift = (random() - 0.5) * 0.4

      let prevPoint = null
      const pointsCount = subsegmentsPerPass + 1
      for (let k = 0; k < pointsCount; k++) {
        const t = k / (pointsCount - 1)
        const w = bow * Math.sin(Math.PI * t) + 0.25 * Math.sin(t * 8.2 + phase[0]) + shift
        const lift = 0.08 + 0.06 * Math.sin(t * 7.1 + phase[2])
        const p = start
          .clone()
          .lerp(end, t)
          .addScaledVector(side, w * amplitude)
          .addScaledVector(out, (Math.abs(w) + lift) * amplitude)

        if (prevPoint) {
          positions[offset++] = prevPoint.x
          positions[offset++] = prevPoint.y
          positions[offset++] = prevPoint.z
          positions[offset++] = p.x
          positions[offset++] = p.y
          positions[offset++] = p.z
        }
        prevPoint = p
      }
    }
  }

  const mergedGeo = new THREE.BufferGeometry()
  mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, offset), 3))
  return mergedGeo
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
    stats,
  } = useMemo(() => {
    scene.updateMatrixWorld(true)

    const towerConfig = welcomeLayout.tower
    const targetH = welcomeLayout.pcTower.targetHeight

    // 1. Tower bbox = bbox of the whole model
    const towerBBox = new THREE.Box3().setFromObject(scene)
    const towerSize = new THREE.Vector3()
    towerBBox.getSize(towerSize)
    const towerVolume = towerSize.x * towerSize.y * towerSize.z

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

    const keptGeometries = []
    const internalGeometries = []
    let glassCount = 0
    let internalCount = 0
    let clutterCount = 0
    let keptCount = 0

    scene.traverse((o) => {
      if (!o.isMesh) return

      const name = (o.name || '').toLowerCase()
      const matName = (o.material?.name || '').toLowerCase()
      const isGlass =
        name.includes('glass') ||
        name.includes('window') ||
        matName.includes('glass') ||
        o.material?.transparent

      if (isGlass) {
        glassCount++
        return
      }

      const meshBox = new THREE.Box3().setFromObject(o)
      const meshSize = new THREE.Vector3()
      meshBox.getSize(meshSize)
      const meshVolume = meshSize.x * meshSize.y * meshSize.z

      const isInternal = shrunkBox.containsBox(meshBox)
      const isClutter = meshVolume < towerConfig.minPartVolumeRatio * towerVolume

      const geo = o.geometry.clone()
      geo.applyMatrix4(o.matrixWorld)
      geo.translate(-towerCenter.x, -towerBBox.min.y, -towerCenter.z)
      geo.scale(scale, scale, scale)

      if (isInternal) {
        internalCount++
        internalGeometries.push(geo)
      } else if (isClutter) {
        clutterCount++
        internalGeometries.push(geo)
      } else {
        keptCount++
        keptGeometries.push(geo)
      }
    })

    const mergedKept = keptGeometries.length > 0
      ? BufferGeometryUtils.mergeGeometries(keptGeometries, false)
      : null

    const mergedInternal = internalGeometries.length > 0
      ? BufferGeometryUtils.mergeGeometries(internalGeometries, false)
      : null

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

    return {
      keptGeometry: mergedKept,
      internalGeometry: mergedInternal,
      stats: {
        keptCount,
        internalCount,
        clutterCount,
        glassCount,
        totalHidden: internalCount + clutterCount + glassCount,
      },
    }
  }, [scene])

  // Clean outer chassis outline: threshold edgeAngle (45°), minEdgeLenRatio, maxSegments (1500)
  const outerOutlineGeo = useMemo(() => {
    if (!keptGeometry) return null
    const targetH = welcomeLayout.pcTower.targetHeight
    return buildWobblyOutline(keptGeometry, {
      thresholdAngle: welcomeLayout.tower.edgeAngle,
      minLen: welcomeLayout.tower.minEdgeLenRatio * targetH,
      maxSegments: welcomeLayout.tower.maxSegments,
      jitter: 0.012,
      seed: 202,
    })
  }, [keptGeometry])

  // Internal outline (rendered when showInternals is true)
  const internalOutlineGeo = useMemo(() => {
    if (!internalGeometry || !showInternals) return null
    const targetH = welcomeLayout.pcTower.targetHeight
    return buildWobblyOutline(internalGeometry, {
      thresholdAngle: 28,
      minLen: 0.012 * targetH,
      maxSegments: 4500,
      jitter: 0.012,
      seed: 303,
    })
  }, [internalGeometry, showInternals])

  // Deep dark surface fill (#000000) so lines read crisp on void
  const darkFillMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: 0x000000 })
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
    if (lineMatRef.current) lineMatRef.current.opacity = 0.85 * k
    if (internalGroupRef.current) internalGroupRef.current.visible = showInternals && k > 0.001
    if (internalMatRef.current) internalMatRef.current.opacity = 0.85 * k
  })

  return (
    <group {...props}>
      {/* Outer Shell Mesh with dark fill and optional sketch material */}
      {keptGeometry && (
        <mesh geometry={keptGeometry} castShadow>
          {material || <meshBasicMaterial color={0x000000} />}
        </mesh>
      )}

      {/* Clean Outer Outline */}
      {outerOutlineGeo && (
        <group ref={lineGroupRef}>
          <lineSegments geometry={outerOutlineGeo}>
            <lineBasicMaterial
              ref={lineMatRef}
              color={outlineColor}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </lineSegments>
        </group>
      )}

      {/* Internal Components with sketch hatching */}
      {showInternals && internalGeometry && (
        <mesh geometry={internalGeometry}>
          {material || <meshBasicMaterial color={0x000000} />}
        </mesh>
      )}

      {showInternals && internalOutlineGeo && (
        <group ref={internalGroupRef}>
          <lineSegments geometry={internalOutlineGeo}>
            <lineBasicMaterial
              ref={internalMatRef}
              color={outlineColor}
              transparent
              opacity={0.85}
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
