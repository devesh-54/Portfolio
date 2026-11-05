import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'
import { prune, dedup, weld, simplify, draco, join } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import fs from 'fs'

await MeshoptSimplifier.ready

console.log('1. Reading public/models/gaming_computer.opt.glb...')
const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.opt.glb')
const root = doc.getRoot()

// Create two standard materials: PC_Body and PC_Glass
const bodyMat = doc.createMaterial('PC_Body')
const glassMat = doc.createMaterial('PC_Glass').setAlphaMode('BLEND').setAlpha(0.2)

console.log('2. Assigning unified materials...')
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const isGlass = mesh.getName().includes('Glass') || (prim.getMaterial() && (prim.getMaterial().getName().includes('5643_3') || prim.getMaterial().getName().includes('5643_4') || prim.getMaterial().getAlphaMode() === 'BLEND'))
    prim.setMaterial(isGlass ? glassMat : bodyMat)
  }
}

console.log('3. Joining meshes by material...')
await doc.transform(join(), prune(), dedup())

console.log(`Meshes after join: ${root.listMeshes().length}`)
for (const m of root.listMeshes()) {
  console.log(` - Mesh: "${m.getName()}", primitives: ${m.listPrimitives().length}`)
}

console.log('4. Simplifying geometry with lockBorder: false...')
await doc.transform(simplify({
  simplifier: MeshoptSimplifier,
  ratio: 0.45,
  error: 0.1,
  lockBorder: false
}))

let triCount = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const ind = prim.getIndices()
    if (ind) triCount += ind.getCount() / 3
  }
}
console.log(`Triangles after simplify: ${Math.round(triCount)}`)

console.log('5. Applying Draco compression...')
await doc.transform(draco({ draco: draco3d, compressionLevel: 10 }))

const outBuf = await io.writeBinary(doc)
fs.writeFileSync('public/models/gaming_computer.opt.glb', outBuf)
console.log(`Final File Size: ${(outBuf.length / 1024 / 1024).toFixed(2)} MB (${outBuf.length} bytes)`)
console.log(`Final Triangles: ${Math.round(triCount)}`)
