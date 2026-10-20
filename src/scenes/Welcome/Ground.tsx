import { useMemo } from 'react'
import * as THREE from 'three'
import { PS1_CONFIG } from '../../config/ps1'
import { createPs1Material } from './Ps1Material'

/**
 * Procedural 64x64 low-res tiled texture with cream paper background
 * and sparse retro ink-blue specks / faint checkerboard.
 * Dither pattern is ONLY visible near the center; edges are pure paper.
 */
function create64x64GroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  // Fill base cream paper color (#f2f1ed)
  ctx.fillStyle = PS1_CONFIG.palette.paper
  ctx.fillRect(0, 0, 64, 64)

  // Subtle 8x8 pixel checker tone (very faint)
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      if ((x / 8 + y / 8) % 2 === 0) {
        ctx.fillStyle = 'rgba(26, 31, 156, 0.025)'
        ctx.fillRect(x, y, 8, 8)
      }
    }
  }

  // Sparse retro ink-blue specks
  let seed = 42
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  ctx.fillStyle = 'rgba(26, 31, 156, 0.14)'
  for (let i = 0; i < 30; i++) {
    const px = Math.floor(rand() * 64)
    const py = Math.floor(rand() * 64)
    ctx.fillRect(px, py, 1, 1)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(28, 28)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false

  return texture
}

/**
 * PS1 Low-Poly Ground Plane
 *
 * - 48x48 segments for smooth vertex-color fading at edges
 * - Sized 200x200 so it vastly exceeds fog.far (18.0)
 * - Vertex colors fade from paper to EXACT fog color at the edges
 * - Combined with fog blending, ground dissolves with ZERO visible seam or band
 */
export function Ground() {
  const texture = useMemo(() => create64x64GroundTexture(), [])

  // Create low-poly ground geometry with vertex colors for edge fading
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(200, 200, 48, 48)
    const pos = geo.attributes.position

    let seed = 1337
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    // Add vertex colors for smooth edge fading
    const fogColor = new THREE.Color(PS1_CONFIG.fog.color)
    const paperColor = new THREE.Color(PS1_CONFIG.palette.paper)
    const colors = new Float32Array(pos.count * 3)

    // Fade radius: start fading at this distance, fully fog-colored at fadeEnd
    const fadeStart = 10.0
    const fadeEnd = 16.0 // Well within fog.far (18.0) so edge is never distinguishable

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)

      // Center area (radius 8) is completely flat for plinth placement
      const distFromCenter = Math.sqrt(x * x + y * y)
      const damp = THREE.MathUtils.smoothstep(distFromCenter, 8.0, 24.0)

      // Gentle height variation towards mid distance, leveling off beyond fog
      const jitter = (pseudoRandom() - 0.5) * 0.06 * damp
      pos.setZ(i, jitter)

      // Vertex color: fade from paper to fog color at edges
      const fadeFactor = THREE.MathUtils.smoothstep(distFromCenter, fadeStart, fadeEnd)
      const vertexColor = paperColor.clone().lerp(fogColor, fadeFactor)
      colors[i * 3] = vertexColor.r
      colors[i * 3 + 1] = vertexColor.g
      colors[i * 3 + 2] = vertexColor.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  // Instantiate PS1 material with vertexColors support
  const material = useMemo(() => {
    return createPs1Material({
      map: texture,
      color: new THREE.Color('#ffffff'), // White base so vertex colors control tint
      vertexColors: true,
    })
  }, [texture])

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
    />
  )
}
