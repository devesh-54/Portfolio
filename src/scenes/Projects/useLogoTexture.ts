import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { LOGOS_CONFIG, type LogoItem } from '../../config/logos'

interface LogoTexturesState {
  textures: Record<string, THREE.CanvasTexture>
  ready: boolean
  progress: number
}

/**
 * Loads and renders each SVG logo onto a 1024x1024 canvas with 12% padding,
 * creating an anisotropic SRGBCanvasTexture with full mipmap support.
 * Also hooks into THREE.DefaultLoadingManager so Drei's useProgress tracks it.
 */
export function useLogoTextures(): LogoTexturesState {
  const [state, setState] = useState<LogoTexturesState>({
    textures: {},
    ready: false,
    progress: 0,
  })

  const texturesRef = useRef<Record<string, THREE.CanvasTexture>>({})

  useEffect(() => {
    let isCancelled = false
    const texturesMap: Record<string, THREE.CanvasTexture> = {}
    const total = LOGOS_CONFIG.length
    let loadedCount = 0

    // Register items with DefaultLoadingManager
    LOGOS_CONFIG.forEach((logo) => {
      THREE.DefaultLoadingManager.itemStart(logo.id)
    })

    const loadLogo = async (logo: LogoItem): Promise<void> => {
      try {
        const response = await fetch(logo.svg)
        let svgText = await response.text()

        // Handle SVGs that only have a viewBox or no width/height
        // Inject explicit dimensions and brandColor fill default if not present
        if (!/width\s*=\s*["'][^"']+["']/i.test(svgText)) {
          svgText = svgText.replace(/<svg\b([^>]*)>/i, '<svg$1 width="1024" height="1024">')
        }
        if (!/height\s*=\s*["'][^"']+["']/i.test(svgText)) {
          svgText = svgText.replace(/<svg\b([^>]*)>/i, '<svg$1 height="1024">')
        }

        // If svg does not specify fill, supply brand color so standard monochrome SVGs are vivid
        if (!/fill\s*=\s*["'][^"']+["']/i.test(svgText)) {
          svgText = svgText.replace(/<svg\b([^>]*)>/i, `<svg$1 fill="${logo.brandColor}">`)
        }

        const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
        const blobUrl = URL.createObjectURL(blob)

        const img = new Image()
        img.width = 1024
        img.height = 1024

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = (e) => reject(e)
          img.src = blobUrl
        })

        URL.revokeObjectURL(blobUrl)

        // Draw centered on 1024x1024 canvas with 12% padding (preserve aspect ratio)
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 1024
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get 2d canvas context')

        ctx.clearRect(0, 0, 1024, 1024)

        const padding = 1024 * 0.12 // 122.88px
        const availSize = 1024 - 2 * padding // 778.24px

        const imgW = img.naturalWidth || 1024
        const imgH = img.naturalHeight || 1024
        const ratio = imgW / imgH

        let drawW = availSize
        let drawH = availSize

        if (ratio > 1) {
          drawH = drawW / ratio
        } else {
          drawW = drawH * ratio
        }

        const drawX = padding + (availSize - drawW) / 2
        const drawY = padding + (availSize - drawH) / 2

        ctx.drawImage(img, drawX, drawY, drawW, drawH)

        // Create THREE.CanvasTexture
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 8
        texture.generateMipmaps = true
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.flipY = true
        texture.needsUpdate = true

        texturesMap[logo.id] = texture
      } catch (err) {
        console.error(`Failed to load logo texture for ${logo.id}:`, err)
      } finally {
        THREE.DefaultLoadingManager.itemEnd(logo.id)
        loadedCount++
        if (!isCancelled) {
          const currentProgress = Math.round((loadedCount / total) * 100)
          if (loadedCount >= total) {
            texturesRef.current = texturesMap
            setState({
              textures: texturesMap,
              ready: true,
              progress: 100,
            })
          } else {
            setState((prev) => ({
              ...prev,
              progress: currentProgress,
            }))
          }
        }
      }
    }

    Promise.all(LOGOS_CONFIG.map((logo) => loadLogo(logo)))

    return () => {
      isCancelled = true
      // Dispose cached textures on unmount
      Object.values(texturesRef.current).forEach((tex) => tex.dispose())
      texturesRef.current = {}
    }
  }, [])

  return state
}
