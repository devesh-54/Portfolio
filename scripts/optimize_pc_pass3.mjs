import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'
import { prune, dedup, weld, simplify, draco, join, quantize } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import fs from 'fs'

await MeshoptSimplifier.ready

console.log('1. Reading public/models/gaming_computer.opt.glb...')
const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.opt.glb')
const root = doc.getRoot()

console.log('2. Running aggressive simplify pass...')
await doc.transform(simplify({
  simplifier: MeshoptSimplifier,
  ratio: 0.38, // 187k * 0.38 = ~71k
  error: 0.25
}))

let triCount = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const ind = prim.getIndices()
    if (ind) triCount += ind.getCount() / 3
  }
}
console.log(`Current triangles after simplify: ${Math.round(triCount)}`)

console.log('3. Running quantize and draco...')
await doc.transform(
  prune(),
  dedup(),
  quantize({
    quantizePosition: 14,
    quantizeNormal: 10
  }),
  draco({
    draco: draco3d,
    compressionLevel: 10
  })
)

const outBuf = await io.writeBinary(doc)
fs.writeFileSync('public/models/gaming_computer.opt.glb', outBuf)
console.log(`Final File Size: ${(outBuf.length / 1024 / 1024).toFixed(2)} MB (${outBuf.length} bytes)`)
console.log(`Final Triangles: ${Math.round(triCount)}`)
