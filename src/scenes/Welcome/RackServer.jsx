import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MergedSketchOutline } from './sketch/MergedSketchOutline'
import { welcomeLayout } from '../../config/welcomeLayout'

export function RackServer({ material, outline, outlineColor = '#8fc4ff', ...props }) {
  const { geometry, scale, offset } = useMemo(() => {
    const geoms = []
    const W = 2.2, H = 0.6, D = 1.3

    // 1. Main chassis box
    const chassis = new THREE.BoxGeometry(W, H, D)
    chassis.translate(0, H / 2, 0)
    geoms.push(chassis)

    // 2. Two small mounting-ear boxes on the sides
    const earW = 0.08, earH = 0.6, earD = 0.04
    const leftEar = new THREE.BoxGeometry(earW, earH, earD)
    leftEar.translate(-W / 2 - earW / 2, H / 2, D / 2 - earD / 2)
    geoms.push(leftEar)

    const rightEar = new THREE.BoxGeometry(earW, earH, earD)
    rightEar.translate(W / 2 + earW / 2, H / 2, D / 2 - earD / 2)
    geoms.push(rightEar)

    // 3. 5 drive-bay slots on the right half (thin inset/raised boxes)
    const slotW = 0.75, slotH = 0.07, slotD = 0.02
    const startY = 0.12, stepY = 0.09
    for (let i = 0; i < 5; i++) {
      const bay = new THREE.BoxGeometry(slotW, slotH, slotD)
      bay.translate(W * 0.25, startY + i * stepY, D / 2 + slotD / 2)
      geoms.push(bay)
    }

    // 4. 6 thin ventilation slats on the left half
    const slatW = 0.65, slatH = 0.03, slatD = 0.015
    const slatStartY = 0.10, slatStepY = 0.075
    for (let i = 0; i < 6; i++) {
      const slat = new THREE.BoxGeometry(slatW, slatH, slatD)
      slat.translate(-W * 0.26, slatStartY + i * slatStepY, D / 2 + slatD / 2)
      geoms.push(slat)
    }

    // 5. One small round power button (short cylinder on front face)
    const btn = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16)
    btn.rotateX(Math.PI / 2)
    btn.translate(-W * 0.44, H / 2, D / 2 + 0.01)
    geoms.push(btn)

    const merged = mergeGeometries(geoms, false)
    merged.computeBoundingBox()

    const bounds = merged.boundingBox || new THREE.Box3()
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const center = new THREE.Vector3()
    bounds.getCenter(center)

    // Dispose unmerged parts
    geoms.forEach((g) => g.dispose())

    const targetW = welcomeLayout.rackServer.targetWidth // 1.76
    const s = size.x > 0 ? targetW / size.x : 1

    return {
      geometry: merged,
      scale: s,
      offset: [-center.x * s, -bounds.min.y * s, -center.z * s],
    }
  }, [])

  useEffect(() => {
    return () => {
      if (geometry) geometry.dispose()
    }
  }, [geometry])

  return (
    <group {...props}>
      <group position={offset} scale={scale}>
        <mesh geometry={geometry} castShadow>
          {material}
          <MergedSketchOutline
            geometry={geometry}
            color={outlineColor}
            thresholdAngle={32}
            maxSegments={6000}
            jitter={0.018}
            seed={303}
          />
        </mesh>
      </group>
    </group>
  )
}

export default RackServer
