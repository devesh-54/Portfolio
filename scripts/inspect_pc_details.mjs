import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'

const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.glb')
const root = doc.getRoot()

console.log('--- Scanning Materials for Glass / Transparent ---')
const glassMats = []
for (const mat of root.listMaterials()) {
  const name = mat.getName().toLowerCase()
  const alphaMode = mat.getAlphaMode()
  const alpha = mat.getAlpha()
  const trans = mat.getTransmissionFactor?.()
  const isGlass = name.includes('glass') || name.includes('window') || name.includes('panel') || name.includes('side') || alphaMode !== 'OPAQUE' || alpha < 1 || (trans && trans > 0)
  if (isGlass) {
    glassMats.push({ name: mat.getName(), alphaMode, alpha })
    console.log(`Glass/Transparent Mat: "${mat.getName()}" (alphaMode: ${alphaMode}, alpha: ${alpha})`)
  }
}

console.log('\n--- Scanning Nodes / Meshes for Glass / Panel ---')
for (const node of root.listNodes()) {
  const name = node.getName().toLowerCase()
  if (name.includes('glass') || name.includes('window') || name.includes('panel') || name.includes('side') || name.includes('case')) {
    console.log(`Node: "${node.getName()}"`)
  }
}

for (const mesh of root.listMeshes()) {
  const name = mesh.getName().toLowerCase()
  if (name.includes('glass') || name.includes('window') || name.includes('panel') || name.includes('side') || name.includes('case')) {
    console.log(`Mesh: "${mesh.getName()}"`)
  }
}
