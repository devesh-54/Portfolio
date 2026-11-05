import * as THREE from 'three'

// Glyphs from BlockText.jsx
const GLYPHS = {
  D: [[[0, 0], [3, 0], [4, 1], [4, 4], [3, 5], [0, 5]]],
  E: [[[0, 0], [4, 0], [4, 1], [1, 1], [1, 2], [3, 2], [3, 3], [1, 3], [1, 4], [4, 4], [4, 5], [0, 5]]],
  V: [[[0, 5], [1.5, 0], [2.5, 0], [4, 5], [3, 5], [2, 1.4], [1, 5]]],
  S: [[[0, 0], [4, 0], [4, 3], [1, 3], [1, 4], [4, 4], [4, 5], [0, 5], [0, 2], [3, 2], [3, 1], [0, 1]]],
  H: [[[0, 0], [1, 0], [1, 2], [3, 2], [3, 0], [4, 0], [4, 5], [3, 5], [3, 3], [1, 3], [1, 5], [0, 5]]],
}
const GAP = 0.8
const height = 0.8
const depth = 0.2
const s = height / 5

function computeLetterBounds(word = 'DEVESH') {
  let x = 0
  const letterBoxes = []
  for (const ch of word) {
    const glyph = GLYPHS[ch]
    const outer = glyph[0]
    const minX = x
    const maxX = x + Math.max(...outer.map(p => p[0]))
    letterBoxes.push({ ch, minX, maxX, minY: 0, maxY: 5 })
    x = maxX + GAP
  }
  const totalX = x - GAP
  // Local transformation as in BlockText:
  // geo.translate(-(totalX)/2, 0, -depth/s/2)
  // geo.scale(s, s, s)
  return letterBoxes.map(b => ({
    ch: b.ch,
    min: new THREE.Vector3((b.minX - totalX / 2) * s, 0, -depth / 2),
    max: new THREE.Vector3((b.maxX - totalX / 2) * s, b.maxY * s, depth / 2),
  }))
}

const letters = computeLetterBounds()

function testConfig(name, textPos, textRotYDeg, textScale, camPos = [0.35, 1.45, 9.8], camTarget = [0.15, 0.85, -0.4], aspect = 16 / 9) {
  const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 100)
  camera.position.set(...camPos)
  camera.lookAt(...camTarget)
  camera.updateMatrixWorld()
  camera.updateProjectionMatrix()

  const rotY = (textRotYDeg * Math.PI) / 180
  const rotMat = new THREE.Matrix4().makeRotationY(rotY)

  console.log(`\n=== Testing Config: ${name} ===`)
  console.log(`Pos: ${JSON.stringify(textPos)}, RotY: ${textRotYDeg}deg, Scale: ${textScale}`)

  const allNdcX = []
  const allNdcY = []

  for (const l of letters) {
    // 8 corners of letter bbox
    const corners = [
      new THREE.Vector3(l.min.x, l.min.y, l.min.z),
      new THREE.Vector3(l.max.x, l.min.y, l.min.z),
      new THREE.Vector3(l.min.x, l.max.y, l.min.z),
      new THREE.Vector3(l.max.x, l.max.y, l.min.z),
      new THREE.Vector3(l.min.x, l.min.y, l.max.z),
      new THREE.Vector3(l.max.x, l.min.y, l.max.z),
      new THREE.Vector3(l.min.x, l.max.y, l.max.z),
      new THREE.Vector3(l.max.x, l.max.y, l.max.z),
    ]

    const projected = corners.map(c => {
      const p = c.clone().multiplyScalar(textScale)
      p.applyMatrix4(rotMat)
      p.add(new THREE.Vector3(...textPos))
      p.project(camera)
      return p
    })

    const minX = Math.min(...projected.map(p => p.x))
    const maxX = Math.max(...projected.map(p => p.x))
    const minY = Math.min(...projected.map(p => p.y))
    const maxY = Math.max(...projected.map(p => p.y))

    allNdcX.push(minX, maxX)
    allNdcY.push(minY, maxY)

    console.log(`Letter ${l.ch}: NDC X [${minX.toFixed(3)}, ${maxX.toFixed(3)}], Y [${minY.toFixed(3)}, ${maxY.toFixed(3)}]`)
  }

  const wordMinX = Math.min(...allNdcX)
  const wordMaxX = Math.max(...allNdcX)
  const wordMinY = Math.min(...allNdcY)
  const wordMaxY = Math.max(...allNdcY)
  console.log(`TOTAL WORD: NDC X [${wordMinX.toFixed(3)}, ${wordMaxX.toFixed(3)}], Y [${wordMinY.toFixed(3)}, ${wordMaxY.toFixed(3)}]`)
  console.log(`Screen width coverage: ${((wordMaxX - wordMinX) * 50).toFixed(1)}% of screen width`)
  console.log(`Right margin: ${((1 - wordMaxX) * 50).toFixed(1)}% of screen width`)
  console.log(`Fits inside screen? ${wordMinX >= -1 && wordMaxX <= 1 ? 'YES' : 'NO (CLIPPED!)'}`)
}

// 1. Previous Fig 2 state that had H cut off:
testConfig('Fig 2 original (clipped)', [2.65, 0, 2.4], 40, 1.05)

// 2. Center flat state that user disliked:
testConfig('Centered (User disliked)', [1.35, 0, 0.6], 14, 0.85)

// 3. New candidate on right side facing right, covering full name:
testConfig('Candidate A: Right side, 38 deg, scale 0.95', [1.9, 0, 1.6], 38, 0.95)
testConfig('Candidate B: Right side, 38 deg, scale 0.90', [1.8, 0, 1.5], 38, 0.90)
testConfig('Candidate C: Right side, 36 deg, scale 0.88', [1.75, 0, 1.5], 36, 0.88)
testConfig('Candidate D: Right side, 40 deg, scale 0.92, pulled back', [1.85, 0, 1.6], 40, 0.92)
