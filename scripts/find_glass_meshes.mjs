import { NodeIO } from '@gltf-transform/core'
import { KHRMaterialsSpecular, KHRTextureTransform } from '@gltf-transform/extensions'

const io = new NodeIO().registerExtensions([KHRMaterialsSpecular, KHRTextureTransform])
const doc = await io.read('public/models/gaming_computer.glb')
const root = doc.getRoot()

for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const mat = prim.getMaterial()
    if (mat && (mat.getName() === '5643_3' || mat.getName() === '5643_4')) {
      console.log(`Mesh "${mesh.getName()}" uses transparent material "${mat.getName()}"`)
    }
  }
}
