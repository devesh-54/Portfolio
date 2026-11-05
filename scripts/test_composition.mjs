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

function testComposition(pcX, textPos, rotYDeg = 40, scale = 0.9) {
  const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100)
  camera.position.set(0.35, 1.45, 9.8)
  camera.lookAt(0.15, 0.85, -0.4)
  camera.updateMatrixWorld()
  camera.updateProjectionMatrix()

  // Monitor
  const monCorners = [
    new THREE.Vector3(-1.95 - 2.0, 0, -1.2),
    new THREE.Vector3(-1.95 + 2.0, 2.08, -1.2)
  ].map(p => p.project(camera))
  const monMaxX = Math.max(...monCorners.map(p => p.x))

  // PC
  const rotMatPc = new THREE.Matrix4().makeRotationY((-25 * Math.PI) / 180)
  const pcCorners = [
    new THREE.Vector3(-0.55, 0, -0.6),
    new THREE.Vector3(0.55, 1.84, 0.6)
  ].map(p => p.applyMatrix4(rotMatPc).add(new THREE.Vector3(pcX, 0, -1.2)).project(camera))
  const pcMinX = Math.min(...pcCorners.map(p => p.x))
  const pcMaxX = Math.max(...pcCorners.map(p => p.x))

  // DEVESH text
  const rotMatText = new THREE.Matrix4().makeRotationY((rotYDeg * Math.PI) / 180)
  const allNdcX = []
  for (const l of letters) {
    const corners = [
      new THREE.Vector3(l.min.x, l.min.y, l.min.z),
      new THREE.Vector3(l.max.x, l.max.y, l.max.z),
    ]
    for (const c of corners) {
      const p = c.clone().multiplyScalar(scale).applyMatrix4(rotMatText).add(new THREE.Vector3(...textPos)).project(camera)
      allNdcX.push(p.x)
    }
  }
  const textMinX = Math.min(...allNdcX)
  const textMaxX = Math.max(...allNdcX)

  console.log(`pcX: ${pcX}, textPos: [${textPos}] =>`)
  console.log(`  Mon maxX: ${monMaxX.toFixed(3)} | PC: [${pcMinX.toFixed(3)}, ${pcMaxX.toFixed(3)}] | Gap(Mon, PC): ${(pcMinX - monMaxX).toFixed(3)}`)
  console.log(`  DEVESH: [${textMinX.toFixed(3)}, ${textMaxX.toFixed(3)}] | Right Margin: ${((1 - textMaxX) * 50).toFixed(1)}%`)
}

testComposition(0.85, [2.25, 0, 1.8], 40, 0.90)
testComposition(0.85, [2.40, 0, 1.8], 40, 0.88)
testComposition(0.90, [2.40, 0, 1.8], 40, 0.88)
testComposition(0.80, [2.35, 0, 1.8], 40, 0.90)
