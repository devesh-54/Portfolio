import * as THREE from 'three'

const camPos = new THREE.Vector3(0.35, 1.45, 9.8)
const camTarget = new THREE.Vector3(0.15, 0.85, -0.4)
const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100)
camera.position.copy(camPos)
camera.lookAt(camTarget)
camera.updateMatrixWorld()
camera.updateProjectionMatrix()

function projectBox(pos, size, rotYDeg) {
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
  const minY = Math.min(...corners.map(c => c.y))
  const maxY = Math.max(...corners.map(c => c.y))
  return { minX, maxX, minY, maxY }
}

const mon = projectBox([-1.95, 0, -1.2], [3.9, 2.08, 0.8], 8)
console.log('Monitor NDC:', mon)

for (let pcX of [0.55, 0.65, 0.75, 0.85, 0.95, 1.05]) {
  const pc = projectBox([pcX, 0, -1.2], [1.1, 1.84, 1.2], -25)
  console.log(`pcX: ${pcX} => PC NDC: [${pc.minX.toFixed(3)}, ${pc.maxX.toFixed(3)}], Gap with Mon: ${(pc.minX - mon.maxX).toFixed(3)}`)
}
