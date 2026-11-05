import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'
import fs from 'fs'

const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])

for (const name of ['curved_monitor.glb', 'gaming_computer.glb']) {
  const path = `public/models/${name}`
  const stat = fs.statSync(path)
  const doc = await io.read(path)
  const root = doc.getRoot()
  const asset = root.getAsset()
  
  let triangleCount = 0
  let vertexCount = 0
  const meshes = root.listMeshes()
  for (const m of meshes) {
    for (const p of m.listPrimitives()) {
      const indices = p.getIndices()
      if (indices) {
        triangleCount += indices.getCount() / 3
      } else {
        const pos = p.getAttribute('POSITION')
        if (pos) triangleCount += pos.getCount() / 3
      }
      const pos = p.getAttribute('POSITION')
      if (pos) vertexCount += pos.getCount()
    }
  }

  const materials = root.listMaterials().map(m => m.getName())
  const textures = root.listTextures().map(t => t.getName() || 'unnamed')

  console.log(`=== ${name} ===`)
  console.log(`File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB (${stat.size} bytes)`)
  console.log(`Triangles: ${triangleCount}`)
  console.log(`Vertices: ${vertexCount}`)
  console.log(`Meshes: ${meshes.length}`)
  console.log(`Materials (${materials.length}): ${materials.slice(0, 10).join(', ')}${materials.length > 10 ? '...' : ''}`)
  console.log(`Textures (${textures.length}): ${textures.join(', ')}`)
  console.log(`Asset extras:`, JSON.stringify(asset.extras || {}))
  console.log(`Asset generator:`, asset.generator)
}
