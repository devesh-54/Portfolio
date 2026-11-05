import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'
import { prune, dedup, weld, simplify, draco } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import fs from 'fs'

await MeshoptSimplifier.ready

console.log('1. Reading gaming_computer.glb...')
const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.glb')
const root = doc.getRoot()

console.log('2. Disposing textures...')
for (const tex of root.listTextures()) {
  tex.dispose()
}

console.log('3. Running dedup and prune...')
await doc.transform(dedup(), prune())

let triCount = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const ind = prim.getIndices()
    if (ind) triCount += ind.getCount() / 3
  }
}
console.log(`Current triangles after prune: ${Math.round(triCount)}`)

console.log('4. Running weld...')
await doc.transform(weld({ tolerance: 0.0005 }))

triCount = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const ind = prim.getIndices()
    if (ind) triCount += ind.getCount() / 3
  }
}
console.log(`Current triangles after weld: ${Math.round(triCount)}`)

// Target: ~75k triangles
const targetRatio = Math.min(0.01, 75000 / triCount)
console.log(`5. Running simplify with target ratio ${targetRatio.toFixed(6)} and error 0.02...`)
await doc.transform(simplify({
  simplifier: MeshoptSimplifier,
  ratio: targetRatio,
  error: 0.02
}))

triCount = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const ind = prim.getIndices()
    if (ind) triCount += ind.getCount() / 3
  }
}
console.log(`Current triangles after simplify: ${Math.round(triCount)}`)

console.log('6. Running draco compression...')
await doc.transform(draco({
  draco: draco3d,
  compressionLevel: 7
}))

console.log('7. Writing to public/models/gaming_computer.opt.glb...')
const outBuf = await io.writeBinary(doc)
fs.writeFileSync('public/models/gaming_computer.opt.glb', outBuf)
console.log(`Done! Output size: ${(outBuf.length / 1024 / 1024).toFixed(2)} MB (${outBuf.length} bytes)`)
console.log(`Final Triangles: ${Math.round(triCount)}`)
