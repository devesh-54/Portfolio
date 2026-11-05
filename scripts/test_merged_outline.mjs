import * as THREE from 'three'

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PASSES = [
  { wobble: 1.0, overshoot: [0.02, 0.10] },
  { wobble: 1.3, overshoot: [-0.01, 0.08] },
]

export function buildMergedLineSegments(geometry, options = {}) {
  const {
    thresholdAngle = 32,
    minLength = 0.01,
    maxSegments = 6000,
    jitter = 0.018,
    seed = 42,
  } = options

  const edgesGeo = new THREE.EdgesGeometry(geometry, thresholdAngle)
  const posArray = edgesGeo.attributes.position.array
  const edgeCount = posArray.length / 6
  if (edgeCount === 0) return new THREE.BufferGeometry()

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  const center = geometry.boundingSphere ? geometry.boundingSphere.center : new THREE.Vector3()
  const radius = geometry.boundingSphere ? geometry.boundingSphere.radius : 1.0

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

  // Sort candidate edges by length descending to prioritize prominent edges
  candidateEdges.sort((e1, e2) => e2.len - e1.len)

  // Determine subsegments per pass so total segments <= maxSegments
  const subsegmentsPerPass = 3 // 4 points per pass
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
      const amplitude = jitter * Math.min(len, radius) * 0.8 * pass.wobble
      const phase = [random(), random(), random()].map((v) => v * Math.PI * 2)
      const bow = (random() - 0.5) * 1.2
      const shift = random() - 0.5

      let prevPoint = null
      const pointsCount = subsegmentsPerPass + 1
      for (let k = 0; k < pointsCount; k++) {
        const t = k / (pointsCount - 1)
        const w = bow * Math.sin(Math.PI * t) + 0.3 * Math.sin(t * 8.2 + phase[0]) + shift
        const lift = 0.2 + 0.15 * Math.sin(t * 7.1 + phase[2])
        const p = start.clone().lerp(end, t)
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

// Test with a sample box geometry
const testGeo = new THREE.BoxGeometry(2, 1, 1)
const merged = buildMergedLineSegments(testGeo)
console.log(`Test passed! Segments: ${merged.attributes.position.count / 2}`)
