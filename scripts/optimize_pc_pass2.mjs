import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'
import { prune, dedup, weld, simplify, draco, join, quantize } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import fs from 'fs'

await MeshoptSimplifier.ready

console.log('1. Reading public/models/gaming_computer.opt.glb (already texture-stripped)...')
const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.opt.glb')
const root = doc.getRoot()

console.log('2. Tagging glass meshes to keep them distinct...')
// Find glass meshes/primitives
for (const mesh of root.listMeshes()) {
  const isGlass = mesh.listPrimitives().some(p => {
    const m = p.getMaterial()
    return m && (m.getName() === '5643_3' || m.getName() === '5643_4')
  })
  if (isGlass) {
    mesh.setName('Glass_Panel_' + mesh.getName())
  }
}

console.log('3. Running second simplify pass with higher error tolerance...')
await doc.transform(simplify({
  simplifier: MeshoptSimplifier,
  ratio: 0.25, // 287k * 0.25 = ~71k triangles
  error: 0.08
}))

let triCount = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const ind = prim.getIndices()
    if (ind) triCount += ind.getCount() / 3
  }
}
console.log(`Current triangles after simplify: ${Math.round(triCount)}`)

console.log('4. Joining compatible meshes to reduce 1,200 draw calls...')
// join meshes that share materials
await doc.transform(join())

console.log('5. Running prune, dedup, draco...')
await doc.transform(prune(), dedup(), draco({ draco: draco3d, compressionLevel: 10 }))

const outBuf = await io.writeBinary(doc)
fs.writeFileSync('public/models/gaming_computer.opt.glb', outBuf)
console.log(`Final File Size: ${(outBuf.length / 1024 / 1024).toFixed(2)} MB (${outBuf.length} bytes)`)
console.log(`Final Triangles: ${Math.round(triCount)}`)
