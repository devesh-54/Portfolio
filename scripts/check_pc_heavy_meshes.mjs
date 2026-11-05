import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'

const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.glb')
const root = doc.getRoot()

const meshStats = []
for (const mesh of root.listMeshes()) {
  let triangles = 0
  for (const prim of mesh.listPrimitives()) {
    const ind = prim.getIndices()
    if (ind) triangles += ind.getCount() / 3
  }
  meshStats.push({ name: mesh.getName(), triangles })
}

meshStats.sort((a, b) => b.triangles - a.triangles)

console.log('Top 20 heaviest meshes:')
for (let i = 0; i < Math.min(20, meshStats.length); i++) {
  console.log(`  ${meshStats[i].name}: ${Math.round(meshStats[i].triangles)} triangles`)
}
