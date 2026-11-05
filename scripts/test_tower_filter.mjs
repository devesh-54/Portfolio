import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'
import * as THREE from 'three'

const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.glb')
const root = doc.getRoot()

// Function to compute local mesh bounding box
function getMeshBbox(mesh) {
  let min = [Infinity, Infinity, Infinity]
  let max = [-Infinity, -Infinity, -Infinity]
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    if (!pos) continue
    for (let i = 0; i < pos.getCount(); i++) {
      const p = pos.getElement(i, [])
      for (let c = 0; c < 3; c++) {
        if (p[c] < min[c]) min[c] = p[c]
        if (p[c] > max[c]) max[c] = p[c]
      }
    }
  }
  return { min, max }
}

// Compute world transforms of nodes
// Build parent-child tree
const nodeWorldMatrix = new Map()

function getMatrix(node) {
  const m = new THREE.Matrix4()
  const t = node.getTranslation()
  const r = node.getRotation()
  const s = node.getScale()
  m.compose(
    new THREE.Vector3(t[0], t[1], t[2]),
    new THREE.Quaternion(r[0], r[1], r[2], r[3]),
    new THREE.Vector3(s[0], s[1], s[2])
  )
  return m
}

// Traverse from scene root
const scene = root.listScenes()[0] || root.getDefaultScene()
function traverseNode(node, parentMatrix) {
  const local = getMatrix(node)
  const world = parentMatrix ? parentMatrix.clone().multiply(local) : local
  nodeWorldMatrix.set(node, world)
  for (const child of node.listChildren()) {
    traverseNode(child, world)
  }
}

for (const child of scene.listChildren()) {
  traverseNode(child, new THREE.Matrix4())
}

// Calculate whole model bbox
let modelMin = new THREE.Vector3(Infinity, Infinity, Infinity)
let modelMax = new THREE.Vector3(-Infinity, -Infinity, -Infinity)

const meshWorldBboxes = []

for (const node of root.listNodes()) {
  const mesh = node.getMesh()
  if (!mesh) continue
  const worldM = nodeWorldMatrix.get(node) || new THREE.Matrix4()
  const { min, max } = getMeshBbox(mesh)
  if (min[0] === Infinity) continue

  const box = new THREE.Box3(
    new THREE.Vector3(min[0], min[1], min[2]),
    new THREE.Vector3(max[0], max[1], max[2])
  )
  box.applyMatrix4(worldM)

  modelMin.min(box.min)
  modelMax.max(box.max)

  const isGlass = mesh.listPrimitives().some(p => {
    const mat = p.getMaterial()
    const name = (mat?.getName() || '').toLowerCase()
    return name.includes('glass') || name.includes('5643_3') || name.includes('5643_4') || mat?.getAlphaMode() === 'BLEND'
  })

  meshWorldBboxes.push({ node, mesh, box, isGlass })
}

const towerBox = new THREE.Box3(modelMin, modelMax)
const towerSize = new THREE.Vector3()
towerBox.getSize(towerSize)
const towerVolume = towerSize.x * towerSize.y * towerSize.z

console.log('Tower Bounding Box:')
console.log('min:', towerBox.min.toArray().map(v => v.toFixed(3)))
console.log('max:', towerBox.max.toArray().map(v => v.toFixed(3)))
console.log('size:', towerSize.toArray().map(v => v.toFixed(3)))
console.log('volume:', towerVolume.toFixed(4))

const internalInset = 0.06
const minPartVolumeRatio = 0.005

const shrunkBox = towerBox.clone()
shrunkBox.min.add(new THREE.Vector3(
  towerSize.x * internalInset,
  towerSize.y * internalInset,
  towerSize.z * internalInset
))
shrunkBox.max.sub(new THREE.Vector3(
  towerSize.x * internalInset,
  towerSize.y * internalInset,
  towerSize.z * internalInset
))

console.log('\nShrunk Box (inset = ' + internalInset + '):')
console.log('min:', shrunkBox.min.toArray().map(v => v.toFixed(3)))
console.log('max:', shrunkBox.max.toArray().map(v => v.toFixed(3)))

let keptCount = 0
let internalCount = 0
let clutterCount = 0
let glassCount = 0

const keptMeshes = []

for (const item of meshWorldBboxes) {
  if (item.isGlass) {
    glassCount++
    continue
  }

  const itemSize = new THREE.Vector3()
  item.box.getSize(itemSize)
  const itemVol = itemSize.x * itemSize.y * itemSize.z
  const volRatio = itemVol / towerVolume

  // a) INTERNAL if box lies fully inside shrunkBox
  const isInternal =
    item.box.min.x >= shrunkBox.min.x && item.box.max.x <= shrunkBox.max.x &&
    item.box.min.y >= shrunkBox.min.y && item.box.max.y <= shrunkBox.max.y &&
    item.box.min.z >= shrunkBox.min.z && item.box.max.z <= shrunkBox.max.z

  // b) CLUTTER if bbox volume is below minPartVolumeRatio of tower bbox volume
  const isClutter = volRatio < minPartVolumeRatio

  if (isInternal) {
    internalCount++
  } else if (isClutter) {
    clutterCount++
  } else {
    keptCount++
    keptMeshes.push(item)
  }
}

console.log(`\n--- Classification Summary (Total: ${meshWorldBboxes.length}) ---`)
console.log(`Glass meshes:    ${glassCount}`)
console.log(`Internal meshes: ${internalCount}`)
console.log(`Clutter meshes:  ${clutterCount}`)
console.log(`KEPT Meshes:     ${keptCount}`)

console.log('\nKept meshes sample:');
keptMeshes.slice(0, 15).forEach((m, i) => {
  const s = new THREE.Vector3()
  m.box.getSize(s)
  console.log(` ${i + 1}. Node: "${m.node.getName()}", Mesh: "${m.mesh.getName()}", size: [${s.x.toFixed(2)}, ${s.y.toFixed(2)}, ${s.z.toFixed(2)}]`)
})
