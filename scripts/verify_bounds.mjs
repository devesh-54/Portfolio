import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import fs from 'fs'

const dracoLoader = new DRACOLoader()
// In node, we can test loading the GLB arraybuffer
const loader = new GLTFLoader()
// Note: GLTFLoader in node needs browser env, but we can verify bounding boxes from gltf json!

for (const name of ['curved_monitor.opt.glb', 'gaming_computer.opt.glb']) {
  const buf = fs.readFileSync(`public/models/${name}`)
  const chunk0Length = buf.readUInt32LE(12)
  const gltf = JSON.parse(buf.toString('utf8', 20, 20 + chunk0Length))
  
  let min = [Infinity, Infinity, Infinity]
  let max = [-Infinity, -Infinity, -Infinity]
  for (const acc of gltf.accessors || []) {
    if (acc.min && acc.max) {
      for (let i = 0; i < 3; i++) {
        if (acc.min[i] < min[i]) min[i] = acc.min[i]
        if (acc.max[i] > max[i]) max[i] = acc.max[i]
      }
    }
  }

  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  console.log(`\n=== ${name} ===`)
  console.log(`Min: [${min.map(n=>n.toFixed(4))}], Max: [${max.map(n=>n.toFixed(4))}]`)
  console.log(`Size: [${size.map(n=>n.toFixed(4))}], Center: [${center.map(n=>n.toFixed(4))}]`)
  console.log(`Raw Height: ${size[1].toFixed(4)}`)
}
