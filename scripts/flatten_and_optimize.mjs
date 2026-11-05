import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'
import { prune, dedup, weld, simplify, draco, join, flatten } from '@gltf-transform/functions'
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

console.log('2. Tagging glass meshes and assigning unified materials...')
for (const mesh of root.listMeshes()) {
  const isGlass = mesh.getName().includes('Glass') || mesh.getName().includes('725') || mesh.getName().includes('796') || mesh.getName().includes('800')
  for (const prim of mesh.listPrimitives()) {
    prim.setMaterial(isGlass ? glassMat : bodyMat)
  }
}

console.log('3. Flattening scene graph so transforms are baked...')
await doc.transform(flatten())

console.log('4. Joining meshes by material and welding vertices...')
await doc.transform(join(), prune(), dedup(), weld({ tolerance: 0.001 }))

console.log(`Meshes after flatten + join: ${root.listMeshes().length}`)
for (const m of root.listMeshes()) {
  let tris = 0
  for (const p of m.listPrimitives()) {
    tris += p.getIndices().getCount() / 3
  }
  console.log(` - Mesh: "${m.getName()}", mat: "${m.listPrimitives()[0].getMaterial().getName()}", triangles: ${Math.round(tris)}`)
}

console.log('5. Simplifying PC_Body to target 75k triangles...')
await doc.transform(simplify({
  simplifier: MeshoptSimplifier,
  ratio: 0.25,
  error: 0.25,
  lockBorder: false
}))

let finalTris = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    finalTris += prim.getIndices().getCount() / 3
  }
}
console.log(`Final Triangles after simplify: ${Math.round(finalTris)}`)

console.log('6. Applying Draco compression...')
await doc.transform(draco({ draco: draco3d, compressionLevel: 10 }))

const outBuf = await io.writeBinary(doc)
fs.writeFileSync('public/models/gaming_computer.opt.glb', outBuf)
console.log(`Final File Size: ${(outBuf.length / 1024 / 1024).toFixed(2)} MB (${outBuf.length} bytes)`)
