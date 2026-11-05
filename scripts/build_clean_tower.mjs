import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'
import { prune, dedup, weld, simplify, draco } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import fs from 'fs'

await MeshoptSimplifier.ready

console.log('1. Reading public/models/gaming_computer.glb...')
const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.glb')
const root = doc.getRoot()

console.log('2. Disposing heavy textures and unused material channels...')
for (const tex of root.listTextures()) tex.dispose()
for (const mat of root.listMaterials()) {
  mat.setBaseColorTexture(null)
  mat.setNormalTexture(null)
  mat.setMetallicRoughnessTexture(null)
  mat.setOcclusionTexture(null)
  mat.setEmissiveTexture(null)
}

console.log('3. Running weld...')
await doc.transform(weld({ tolerance: 0.001 }))

console.log('4. Running mesh simplification...')
await doc.transform(simplify({
  simplifier: MeshoptSimplifier,
  ratio: 0.05,
  error: 0.35,
  lockBorder: false
}))

let tris = 0
for (const m of root.listMeshes()) {
  for (const p of m.listPrimitives()) {
    const ind = p.getIndices()
    if (ind) tris += ind.getCount() / 3
  }
}
console.log(`Triangles after simplification: ${Math.round(tris)}`)

console.log('5. Applying Draco compression...')
await doc.transform(prune(), dedup(), draco({ draco: draco3d, compressionLevel: 10 }))

console.log('6. Writing to public/models/gaming_computer.opt.glb...')
const outBuf = await io.writeBinary(doc)
fs.writeFileSync('public/models/gaming_computer.opt.glb', outBuf)
console.log(`Done! Output size: ${(outBuf.length / 1024 / 1024).toFixed(2)} MB (${outBuf.length} bytes)`)
console.log(`Mesh count: ${root.listMeshes().length}`)
