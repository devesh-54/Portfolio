import * as THREE from 'three'

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
  return letterBoxes.map(b => ({
    ch: b.ch,
    min: new THREE.Vector3((b.minX - totalX / 2) * s, 0, -depth / 2),
    max: new THREE.Vector3((b.maxX - totalX / 2) * s, b.maxY * s, depth / 2),
  }))
}

const letters = computeLetterBounds()

function evaluate(pos, rotYDeg, scale, aspects = [16/9, 16/10, 1.4]) {
  console.log(`\n--------------------------------------------------`)
  console.log(`Evaluating Pos: [${pos}], RotY: ${rotYDeg}deg, Scale: ${scale}`)
  for (const aspect of aspects) {
    const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 100)
    camera.position.set(0.35, 1.45, 9.8)
    camera.lookAt(0.15, 0.85, -0.4)
    camera.updateMatrixWorld()
    camera.updateProjectionMatrix()

    const rotY = (rotYDeg * Math.PI) / 180
    const rotMat = new THREE.Matrix4().makeRotationY(rotY)

    const allNdcX = []
    const allNdcY = []

    for (const l of letters) {
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

      for (const c of corners) {
        const p = c.clone().multiplyScalar(scale)
        p.applyMatrix4(rotMat)
        p.add(new THREE.Vector3(...pos))
        p.project(camera)
        allNdcX.push(p.x)
        allNdcY.push(p.y)
      }
    }

    const minX = Math.min(...allNdcX)
    const maxX = Math.max(...allNdcX)
    const minY = Math.min(...allNdcY)
    const maxY = Math.max(...allNdcY)
    const marginPct = ((1 - maxX) * 50).toFixed(1)
    const fit = minX >= -1 && maxX <= 0.95 ? 'OK' : 'CLIPPED'
    console.log(`Aspect ${(aspect).toFixed(2)}: NDC X [${minX.toFixed(3)}, ${maxX.toFixed(3)}] | Right Margin: ${marginPct}% | ${fit}`)
  }
}

// In Fig 2:
// The text was on the right side of the screen.
// D is at the right edge of PC tower, H extends to the right.
// Test positions with D and H projection
evaluate([2.15, 0, 1.8], 40, 0.92)
evaluate([2.25, 0, 1.8], 40, 0.90)
evaluate([2.30, 0, 1.7], 38, 0.90)
evaluate([2.35, 0, 1.7], 38, 0.88)
evaluate([2.40, 0, 1.8], 38, 0.88)

