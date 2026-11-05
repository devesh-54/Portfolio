import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'
import { prune, dedup, draco, quantize } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import draco3d from 'draco3dgltf'
import fs from 'fs'

await MeshoptSimplifier.ready

const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.opt.glb')
const root = doc.getRoot()

for (const mesh of root.listMeshes()) {
  if (mesh.getName().includes('Glass')) continue // keep glass intact
  for (const prim of mesh.listPrimitives()) {
    const indicesAccessor = prim.getIndices()
    const posAccessor = prim.getAttribute('POSITION')
    if (!indicesAccessor || !posAccessor) continue

    const indices = indicesAccessor.getArray()
    const positions = posAccessor.getArray()
    const targetTriangles = 75000
    const targetIndices = targetTriangles * 3

    console.log(`Mesh ${mesh.getName()}: current indices ${indices.length} (${indices.length / 3} triangles) -> target ${targetIndices} (${targetTriangles} triangles)...`)
    const [newIndices, err] = MeshoptSimplifier.simplifySloppy(
      indices,
      positions,
      3,
      null,
      targetIndices,
      0.05
    )

    console.log(`Simplified to ${newIndices.length / 3} triangles (error: ${err.toFixed(5)})`)
    indicesAccessor.setArray(newIndices)
  }
}

console.log('Compacting and pruning unused vertices...')
await doc.transform(prune(), dedup(), quantize({ quantizePosition: 14, quantizeNormal: 10 }), draco({ draco: draco3d, compressionLevel: 10 }))

const outBuf = await io.writeBinary(doc)
fs.writeFileSync('public/models/gaming_computer.opt.glb', outBuf)
console.log(`FINAL SIZE: ${(outBuf.length / 1024 / 1024).toFixed(2)} MB (${outBuf.length} bytes)`)

let totalTriangles = 0
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    totalTriangles += prim.getIndices().getCount() / 3
  }
}
console.log(`TOTAL TRIANGLES: ${Math.round(totalTriangles)}`)
