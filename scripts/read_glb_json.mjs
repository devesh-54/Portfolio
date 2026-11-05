import fs from 'fs'

for (const name of ['curved_monitor.glb', 'gaming_computer.glb']) {
  const path = `public/models/${name}`
  const buf = fs.readFileSync(path)
  const magic = buf.readUInt32LE(0)
  const version = buf.readUInt32LE(4)
  const length = buf.readUInt32LE(8)
  const chunk0Length = buf.readUInt32LE(12)
  const chunk0Type = buf.readUInt32LE(16)
  const jsonStr = buf.toString('utf8', 20, 20 + chunk0Length)
  const gltf = JSON.parse(jsonStr)

  let triangleCount = 0
  let vertexCount = 0
  for (const mesh of gltf.meshes || []) {
    for (const prim of mesh.primitives || []) {
      if (prim.indices !== undefined) {
        const accessor = gltf.accessors[prim.indices]
        triangleCount += accessor.count / 3
      }
      if (prim.attributes && prim.attributes.POSITION !== undefined) {
        const accessor = gltf.accessors[prim.attributes.POSITION]
        vertexCount += accessor.count
      }
    }
  }

  // Bounding box from scene or root nodes
  let min = [Infinity, Infinity, Infinity]
  let max = [-Infinity, -Infinity, -Infinity]
  for (const acc of gltf.accessors || []) {
    if (acc.min && acc.max) {
      for (let i = 0; i < 3; i++) {
        if (acc.min[i] < min[i]) min[i] = acc.min[i]
        if (acc.max[i] > max[i]) max[i] = acc.max[i]
      }
    }
  }

  console.log(`\n=================== ${name} ===================`)
  console.log(`File size: ${(buf.length / 1024 / 1024).toFixed(2)} MB (${buf.length} bytes)`)
  console.log(`Triangles: ${Math.round(triangleCount)}`)
  console.log(`Vertices: ${vertexCount}`)
  console.log(`Meshes count: ${(gltf.meshes || []).length}`)
  console.log(`Mesh names: ${(gltf.meshes || []).map(m => m.name).slice(0, 10).join(', ')}...`)
  console.log(`Materials count: ${(gltf.materials || []).length}`)
  console.log(`Material names: ${(gltf.materials || []).map(m => m.name).join(', ')}`)
  console.log(`Textures count: ${(gltf.textures || []).length}`)
  console.log(`Images count: ${(gltf.images || []).length}`)
  console.log(`Asset object:`, JSON.stringify(gltf.asset, null, 2))
  console.log(`Rough bounds: min [${min.map(n=>n.toFixed(4))}], max [${max.map(n=>n.toFixed(4))}]`)
}
