import { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { revealUniforms } from './reveal'

function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Subtle hand-drawn passes that hug the hard edges without excessive overshoot
const PASSES = [
  { wobble: 0.8, overshoot: [0.005, 0.025] },
  { wobble: 1.1, overshoot: [-0.005, 0.020] },
]

export function buildMergedOutlineGeometry(geometry, options = {}) {
  if (!geometry) return new THREE.BufferGeometry()

  const {
    thresholdAngle = 35,
    maxSegments = 6000,
    jitter = 0.012,
    seed = 42,
  } = options

  const edgesGeo = new THREE.EdgesGeometry(geometry, thresholdAngle)
  const posArray = edgesGeo.attributes.position ? edgesGeo.attributes.position.array : null
  if (!posArray || posArray.length === 0) {
    edgesGeo.dispose()
    return new THREE.BufferGeometry()
  }

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  const center = geometry.boundingSphere ? geometry.boundingSphere.center : new THREE.Vector3()
  const radius = geometry.boundingSphere ? geometry.boundingSphere.radius : 1.0

  const size = new THREE.Vector3()
  if (geometry.boundingBox) geometry.boundingBox.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const minLength = 0.015 * maxDim

  const random = mulberry32(seed * 9973 + 17)
  const between = ([min, max]) => min + (max - min) * random()

  // Collect candidate edges
  const candidateEdges = []
  for (let i = 0; i < posArray.length; i += 6) {
    const a = new THREE.Vector3(posArray[i], posArray[i + 1], posArray[i + 2])
    const b = new THREE.Vector3(posArray[i + 3], posArray[i + 4], posArray[i + 5])
    const len = a.distanceTo(b)
    if (len >= minLength) {
      candidateEdges.push({ a, b, len })
    }
  }

  // Done with EdgesGeometry, dispose immediately
  edgesGeo.dispose()

  // Sort candidate edges descending by length
  candidateEdges.sort((e1, e2) => e2.len - e1.len)

  const subsegmentsPerPass = 2 // 3 points per stroke
  const segmentsPerEdge = PASSES.length * subsegmentsPerPass
  const allowedEdges = Math.min(candidateEdges.length, Math.floor(maxSegments / segmentsPerEdge))

  const selectedEdges = candidateEdges.slice(0, allowedEdges)
  const totalSegments = selectedEdges.length * segmentsPerEdge
  const positions = new Float32Array(totalSegments * 6)
  let offset = 0

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

/**
 * Builds a single merged LineSegments BufferGeometry by checking and extracting
 * edges independently for EVERY part geometry in `partEntries`, guaranteeing
 * small & smooth curved parts are never starved or left without lines.
 */
export function buildCheckedPartsOutlineGeometry(partEntries, options = {}) {
  const {
    thresholdAngle = 24,
    minLenRatio = 0.022,
    maxMinLen = 0.009,
    absMinLen = 0.0007,
    jitter = 0.007,
    seed = 42,
    defaultMaxEdgesPerPart = 90,
    minOutwardPush = 0.0007,
  } = options

  const random = mulberry32(seed * 9973 + 17)
  const between = ([min, max]) => min + (max - min) * random()
  const quant = (n) => Math.round(n * 2500)
  const vKey = (v) => `${quant(v.x)},${quant(v.y)},${quant(v.z)}`

  const selectedRecords = []
  let partsWithLines = 0
  let partsWithZeroLines = 0
  let totalEdges = 0
  let totalSegments = 0

  for (let pIdx = 0; pIdx < partEntries.length; pIdx++) {
    const entry = partEntries[pIdx]
    const geo = entry.geometry || entry
    if (!geo || !geo.attributes?.position || geo.attributes.position.count === 0) continue

    geo.computeBoundingBox()
    geo.computeBoundingSphere()
    const size = new THREE.Vector3()
    if (geo.boundingBox) geo.boundingBox.getSize(size)
    const diag = Math.max(size.length(), 0.001)
    const center = geo.boundingSphere ? geo.boundingSphere.center.clone() : new THREE.Vector3()

    const baseMinLen =
      entry.minLen ?? Math.max(absMinLen, Math.min(maxMinLen, diag * minLenRatio))
    const baseTh = entry.thresholdAngle ?? thresholdAngle
    const anglesToTry = [baseTh]
    if (baseTh > 14) anglesToTry.push(14)
    if (baseTh > 8) anglesToTry.push(8)

    let chosenEdges = []
    for (let aIdx = 0; aIdx < anglesToTry.length; aIdx++) {
      const th = anglesToTry[aIdx]
      const effMinLen = aIdx >= 1 ? baseMinLen * 0.5 : baseMinLen
      const edgesGeo = new THREE.EdgesGeometry(geo, th)
      const posArr = edgesGeo.attributes.position ? edgesGeo.attributes.position.array : null
      if (posArr && posArr.length >= 6) {
        const seen = new Set()
        const candidates = []
        for (let i = 0; i < posArr.length; i += 6) {
          const a = new THREE.Vector3(posArr[i], posArr[i + 1], posArr[i + 2])
          const b = new THREE.Vector3(posArr[i + 3], posArr[i + 4], posArr[i + 5])
          const len = a.distanceTo(b)
          if (len < effMinLen) continue
          const ka = vKey(a)
          const kb = vKey(b)
          const pairKey = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
          if (seen.has(pairKey)) continue
          seen.add(pairKey)
          candidates.push({ a, b, len })
        }
        chosenEdges = candidates
      }
      edgesGeo.dispose()
      if (chosenEdges.length >= 3) break
    }

    // Gentle fallback only if a super-smooth curved sphere/tube still has 0 crease edges at 8 deg
    if (chosenEdges.length === 0) {
      const edgesGeo = new THREE.EdgesGeometry(geo, 3)
      const posArr = edgesGeo.attributes.position ? edgesGeo.attributes.position.array : null
      if (posArr && posArr.length >= 6) {
        const seen = new Set()
        for (let i = 0; i < posArr.length; i += 6) {
          const a = new THREE.Vector3(posArr[i], posArr[i + 1], posArr[i + 2])
          const b = new THREE.Vector3(posArr[i + 3], posArr[i + 4], posArr[i + 5])
          const len = a.distanceTo(b)
          if (len < absMinLen) continue
          const ka = vKey(a)
          const kb = vKey(b)
          const pairKey = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
          if (seen.has(pairKey)) continue
          seen.add(pairKey)
          chosenEdges.push({ a, b, len })
        }
      }
      edgesGeo.dispose()
    }

    if (chosenEdges.length === 0) {
      partsWithZeroLines++
      continue
    }

    partsWithLines++
    chosenEdges.sort((e1, e2) => e2.len - e1.len)

    const limit =
      entry.maxEdges ??
      (diag >= 0.65
        ? Math.min(defaultMaxEdgesPerPart * 4, 130)
        : diag >= 0.22
          ? Math.min(defaultMaxEdgesPerPart, 36)
          : diag >= 0.08
            ? Math.min(defaultMaxEdgesPerPart, 10)
            : Math.min(defaultMaxEdgesPerPart, 4))
    const picked = chosenEdges.slice(0, limit)
    const passCount = entry.passes ?? (diag > 0.35 ? 2 : 1)
    const subsegs = diag > 0.35 ? 2 : 1
    const overshootScale = entry.overshootScale ?? (diag > 0.35 ? 0.8 : 0.2)
    const jitterScale = entry.jitterScale ?? (diag > 0.35 ? 0.85 : 0.3)

    totalEdges += picked.length
    totalSegments += picked.length * passCount * subsegs
    selectedRecords.push({ edges: picked, center, passCount, subsegs, overshootScale, jitterScale })
  }

  const positions = new Float32Array(totalSegments * 6)
  let offset = 0

  for (const rec of selectedRecords) {
    const passesToUse = PASSES.slice(0, rec.passCount)
    for (const { a, b, len } of rec.edges) {
      const d = b.clone().sub(a)
      if (d.lengthSq() < 1e-12) continue
      d.normalize()
      const mid = a.clone().add(b).multiplyScalar(0.5)
      const out = mid.sub(rec.center)
      out.addScaledVector(d, -out.dot(d))
      if (out.lengthSq() < 1e-10) {
        out.set(0, 1, 0).addScaledVector(d, -d.y)
        if (out.lengthSq() < 1e-10) out.set(1, 0, 0).addScaledVector(d, -d.x)
      }
      out.normalize()
      const side = new THREE.Vector3().crossVectors(d, out)

      for (const pass of passesToUse) {
        const start = a.clone().addScaledVector(d, -between(pass.overshoot) * rec.overshootScale * len)
        const end = b.clone().addScaledVector(d, between(pass.overshoot) * rec.overshootScale * len)
        const amplitude = Math.max(minOutwardPush, jitter * rec.jitterScale * Math.min(len * 0.35, 0.015)) * pass.wobble
        const phase = [random(), random(), random()].map((v) => v * Math.PI * 2)
        const bow = (random() - 0.5) * 0.55
        const shift = (random() - 0.5) * 0.25

        let prevPoint = null
        const pointsCount = rec.subsegs + 1
        for (let k = 0; k < pointsCount; k++) {
          const t = k / (pointsCount - 1)
          const w = bow * Math.sin(Math.PI * t) + 0.25 * Math.sin(t * 8.2 + phase[0]) + shift
          const lift = 0.45 + 0.12 * Math.sin(t * 7.1 + phase[2])
          const p = start
            .clone()
            .lerp(end, t)
            .addScaledVector(side, w * amplitude * 0.55)
            .addScaledVector(out, (Math.abs(w) * 0.45 + lift) * amplitude)

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
  }

  const mergedGeo = new THREE.BufferGeometry()
  mergedGeo.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, offset), 3))
  return {
    geometry: mergedGeo,
    stats: {
      totalParts: partEntries.length,
      partsWithLines,
      partsWithZeroLines,
      totalEdges,
      totalSegments,
    },
  }
}

/** Merged outline renderer: 1 draw call per object, capped segment budget */
export function MergedSketchOutline({
  geometry,
  color = '#8fc4ff',
  opacity = 0.85,
  jitter = 0.012,
  seed = 1,
  thresholdAngle = 35,
  maxSegments = 6000,
}) {
  const ref = useRef()
  const matRef = useRef()

  const outlineGeometry = useMemo(() => {
    return buildMergedOutlineGeometry(geometry, {
      thresholdAngle,
      maxSegments,
      jitter,
      seed,
    })
  }, [geometry, thresholdAngle, maxSegments, jitter, seed])

  useEffect(() => {
    return () => {
      if (outlineGeometry) outlineGeometry.dispose()
    }
  }, [outlineGeometry])

  useFrame(() => {
    const k = revealUniforms.uRevealLines.value
      ? THREE.MathUtils.smoothstep(revealUniforms.uReveal.value, 0, 0.5)
      : 1
    if (ref.current) ref.current.visible = k > 0.001
    if (matRef.current) matRef.current.opacity = opacity * k
  })

  return (
    <group ref={ref}>
      <lineSegments geometry={outlineGeometry}>
        <lineBasicMaterial
          ref={matRef}
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  )
}

export default MergedSketchOutline
