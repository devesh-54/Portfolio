import * as THREE from 'three'

const camPos = new THREE.Vector3(0.35, 1.45, 9.8)
const camTarget = new THREE.Vector3(0.15, 0.85, -0.4)
const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100)
camera.position.copy(camPos)
camera.lookAt(camTarget)
camera.updateMatrixWorld()
camera.updateProjectionMatrix()

// Monitor approx bounds: width 4.2, height 2.08, depth 0.8, center around position
// PC Tower approx bounds: width 0.9 (actual width of PC chassis), height 1.84, depth 1.4
function getScreenBounds(pos, size, rotYDeg) {
  const rotMat = new THREE.Matrix4().makeRotationY((rotYDeg * Math.PI) / 180)
  const corners = []
  for (let dx of [-0.5, 0.5]) {
    for (let dy of [0, 1]) {
      for (let dz of [-0.5, 0.5]) {
        const p = new THREE.Vector3(dx * size[0], dy * size[1], dz * size[2])
        p.applyMatrix4(rotMat)
        p.add(new THREE.Vector3(...pos))
        p.project(camera)
        corners.push(p)
      }
    }
  }
  const minX = Math.min(...corners.map(c => c.x))
  const maxX = Math.max(...corners.map(c => c.x))
  return { minX, maxX }
}

for (let pcX of [0.134, 0.35, 0.5, 0.6, 0.7, 0.8]) {
  const mon = getScreenBounds([-1.95, 0, -1.2], [4.2, 2.08, 0.8], 8)
  const pc = getScreenBounds([pcX, 0, -1.2], [1.0, 1.84, 1.4], -25)
  console.log(`pcX: ${pcX} => Mon maxX: ${mon.maxX.toFixed(3)}, PC minX: ${pc.minX.toFixed(3)}, Gap: ${(pc.minX - mon.maxX).toFixed(3)}`)
}
