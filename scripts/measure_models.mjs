import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import fs from 'fs'

// Load CurvedMonitor geometry
const loader = new GLTFLoader()

function loadGlb(path) {
  const buf = fs.readFileSync(path)
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', resolve, reject)
  })
}

const monGltf = await loadGlb('public/models/curved_monitor.opt.glb')
const pcGltf = await loadGlb('public/models/gaming_computer.opt.glb')

console.log('Successfully loaded GLTFs in node!')

// 1. Measure monitor exactly as in CurvedMonitor.jsx
const rotY = new THREE.Matrix4().makeRotationY(-Math.PI / 2)
const monBounds = new THREE.Box3()
monGltf.scene.traverse((o) => {
  if (o.isMesh) {
    const g = o.geometry.clone()
    g.applyMatrix4(o.matrixWorld)
    g.applyMatrix4(rotY)
    g.computeBoundingBox()
    monBounds.union(g.boundingBox)
  }
})
const monSize = new THREE.Vector3()
monBounds.getSize(monSize)
const monCenter = new THREE.Vector3()
monBounds.getCenter(monCenter)
const monScale = 2.08 / monSize.y
console.log('Monitor dimensions after normalization (W x H x D):', {
  width: (monSize.x * monScale).toFixed(3),
  height: (monSize.y * monScale).toFixed(3),
  depth: (monSize.z * monScale).toFixed(3),
})

// 2. Measure PC tower exactly as in GamingPC.jsx
const pcBounds = new THREE.Box3().setFromObject(pcGltf.scene)
const pcSize = new THREE.Vector3()
pcBounds.getSize(pcSize)
const pcScale = 1.84 / pcSize.y
console.log('PC Tower dimensions after normalization (W x H x D):', {
  width: (pcSize.x * pcScale).toFixed(3),
  height: (pcSize.y * pcScale).toFixed(3),
  depth: (pcSize.z * pcScale).toFixed(3),
})
