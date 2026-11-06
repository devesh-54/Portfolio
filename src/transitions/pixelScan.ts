/**
 * Pixel Scan Transition Engine (Pure Mathematical & Rendering Functions)
 *
 * Implements:
 * 1. Integer hash3 deterministic PRNG.
 * 2. Ease-in-out cubic timing.
 * 3. Stair-step polygon clipPath generator for SCAN (dir: +1, -1) and BURST modes.
 * 4. Deterministic square pixel band and spark field generation into packed ABGR Uint32Array.
 * 5. Zero-allocation per-frame execution reusing shared arrays and ImageData buffers.
 */

import { PIXEL_SCAN_CONFIG, computeCellSize } from '../config/pixelScan'

export function hash3(a: number, b: number, c: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2147483647)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

export function snapToCell(val: number, cell: number): number {
  return Math.round(val / cell) * cell
}

export interface RGB {
  r: number
  g: number
  b: number
}

function parseHex(hex: string): RGB {
  const clean = hex.replace('#', '')
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export function packABGR(r: number, g: number, b: number, a: number): number {
  const alphaByte = Math.min(255, Math.max(0, Math.round(a * 255)))
  return ((alphaByte << 24) | (b << 16) | (g << 8) | r) >>> 0
}

// Pre-parse palettes into RGB for zero-parsing runtime
const PARSED_PALETTES: Record<string, RGB[]> = {
  darkToLight: PIXEL_SCAN_CONFIG.palettes.darkToLight.map(parseHex),
  lightToLight: PIXEL_SCAN_CONFIG.palettes.lightToLight.map(parseHex),
}

export interface EngineResult {
  clip: string
  pixels: Uint32Array
  imageData: ImageData | null
  cols: number
  rows: number
  cell: number
  W: number
  H: number
}

export class PixelScanEngine {
  W = 1920
  H = 1080
  cell = 32
  cols = 60
  rows = 34

  // Buffers
  private imageData: ImageData | null = null
  private pixels32: Uint32Array = new Uint32Array(0)
  private clipPointBuffer: string[] = []

  // Shared result object returned every call
  readonly result: EngineResult = {
    clip: '',
    pixels: new Uint32Array(0),
    imageData: null,
    cols: 0,
    rows: 0,
    cell: 0,
    W: 0,
    H: 0,
  }

  constructor(width = 1920, height = 1080) {
    this.resize(width, height)
  }

  /**
   * Recomputes grid dimensions, buffers, and string caches on window resize.
   */
  resize(width: number, height: number, customCell?: number): void {
    this.W = Math.max(1, Math.round(width))
    this.H = Math.max(1, Math.round(height))
    this.cell = customCell || computeCellSize(this.H)

    this.cols = Math.ceil(this.W / this.cell)
    this.rows = Math.ceil(this.H / this.cell)

    const totalCells = this.cols * this.rows
    if (typeof ImageData !== 'undefined') {
      try {
        this.imageData = new ImageData(this.cols, this.rows)
        this.pixels32 = new Uint32Array(this.imageData.data.buffer)
      } catch {
        // Fallback for node or headless test environments without DOM ImageData
        const buf = new ArrayBuffer(totalCells * 4)
        this.pixels32 = new Uint32Array(buf)
        this.imageData = null
      }
    } else {
      const buf = new ArrayBuffer(totalCells * 4)
      this.pixels32 = new Uint32Array(buf)
      this.imageData = null
    }

    // Allocate polygon point buffer: 2 points per row + 2 boundary points
    const maxPoints = this.rows * 2 + 4
    this.clipPointBuffer = new Array(maxPoints)

    // Update shared result
    this.result.pixels = this.pixels32
    this.result.imageData = this.imageData
    this.result.cols = this.cols
    this.result.rows = this.rows
    this.result.cell = this.cell
    this.result.W = this.W
    this.result.H = this.H
  }

  private pickColor(paletteRGB: RGB[], hashVal: number): RGB {
    // Index 0 is white (#ffffff)
    // Indices 1..3 are main theme colors
    // Indices 4.. are sparse accents (<10% frequency)
    if (paletteRGB.length <= 4) {
      const idx = 1 + Math.floor(hashVal * (paletteRGB.length - 1))
      return paletteRGB[Math.min(idx, paletteRGB.length - 1)]
    }
    const isAccent = hashVal < 0.10
    if (isAccent) {
      const accentIdx = 4 + Math.floor((hashVal / 0.10) * (paletteRGB.length - 4))
      return paletteRGB[Math.min(accentIdx, paletteRGB.length - 1)]
    } else {
      const mainIdx = 1 + Math.floor(((hashVal - 0.10) / 0.90) * 3)
      return paletteRGB[Math.min(mainIdx, 3)]
    }
  }

  /**
   * Computes SCAN transition (dir = 1: Left-to-Right; dir = -1: Right-to-Left).
   */
  computeScan(
    pRaw: number,
    dir: 1 | -1 = 1,
    paletteName: 'darkToLight' | 'lightToLight' = 'darkToLight'
  ): EngineResult {
    const p = Math.max(0, Math.min(1, pRaw))
    const { cell, W, H, cols, rows } = this
    const { bandCells, jitterCells, sparkCells, flickerSteps } = PIXEL_SCAN_CONFIG
    const palette = PARSED_PALETTES[paletteName] || PARSED_PALETTES.darkToLight
    const white = palette[0]

    // Clear previous pixels buffer
    this.pixels32.fill(0)

    // Early exit boundaries for clipPath
    if (p <= 0) {
      // Empty reveal
      this.result.clip = dir === 1 ? 'polygon(0px 0px, 0px 0px, 0px 100%, 0px 100%)' : `polygon(${W}px 0px, ${W}px 0px, ${W}px 100%, ${W}px 100%)`
      return this.result
    }

    if (p >= 1) {
      // Full reveal
      this.result.clip = 'none'
      return this.result
    }

    const easedP = easeInOutCubic(p)
    const fFrame = Math.floor(p * flickerSteps)

    // Edge calculation in normalized [0, W] forward space
    const minEdge = -(bandCells + jitterCells) * cell
    const maxEdge = W + (bandCells + jitterCells) * cell
    const edgeBase = minEdge + easedP * (maxEdge - minEdge)

    let ptIdx = 0

    if (dir === 1) {
      // Left-to-Right: polygon starts top-left (0, 0), stair-steps down right edge, ends bottom-left (0, H)
      this.clipPointBuffer[ptIdx++] = '0px 0px'

      for (let r = 0; r < rows; r++) {
        const yTop = r * cell
        const yBottom = Math.min(H, (r + 1) * cell)

        const jHash = hash3(r, 7, fFrame)
        const jitter = (jHash - 0.5) * 2 * jitterCells * cell
        const rawEdge = snapToCell(edgeBase + jitter, cell)
        const edge_r = Math.max(0, Math.min(W, rawEdge))
        const edgeCell_r = Math.round(edge_r / cell)

        this.clipPointBuffer[ptIdx++] = `${edge_r}px ${yTop}px`
        this.clipPointBuffer[ptIdx++] = `${edge_r}px ${yBottom}px`

        // Compute band pixels for this row
        const rowOffset = r * cols
        for (let c = 0; c < cols; c++) {
          const d = edgeCell_r - c // positive behind edge (inside revealed area)

          if (d >= 0 && d < bandCells) {
            // Inside revealed band near edge
            const keepProb = Math.pow(1 - d / bandCells, 1.3)
            const kHash = hash3(r, c, fFrame)
            if (kHash < keepProb) {
              const alpha = 0.95 * (1 - d / bandCells) + 0.05
              const color = d < 1 ? white : this.pickColor(palette, hash3(r, c, fFrame + 17))
              this.pixels32[rowOffset + c] = packABGR(color.r, color.g, color.b, alpha)
            }
          } else if (d < 0 && d >= -sparkCells) {
            // Sparks ahead of the edge
            const kHash = hash3(r, c, fFrame)
            if (kHash < 0.35) {
              const color = this.pickColor(palette, hash3(r, c, fFrame + 29))
              this.pixels32[rowOffset + c] = packABGR(color.r, color.g, color.b, 0.6)
            }
          }
        }
      }

      this.clipPointBuffer[ptIdx++] = `0px ${H}px`
    } else {
      // Right-to-Left (dir = -1): Mirrored
      // Screen coordinates: actualEdge_r = W - edge_r
      this.clipPointBuffer[ptIdx++] = `${W}px 0px`

      for (let r = 0; r < rows; r++) {
        const yTop = r * cell
        const yBottom = Math.min(H, (r + 1) * cell)

        const jHash = hash3(r, 7, fFrame)
        const jitter = (jHash - 0.5) * 2 * jitterCells * cell
        const rawEdge = snapToCell(edgeBase + jitter, cell)
        const edge_r = Math.max(0, Math.min(W, rawEdge))
        const actualEdge_r = W - edge_r
        const edgeCell_r = Math.round(edge_r / cell)

        this.clipPointBuffer[ptIdx++] = `${actualEdge_r}px ${yTop}px`
        this.clipPointBuffer[ptIdx++] = `${actualEdge_r}px ${yBottom}px`

        // Compute band pixels in mirrored coordinate cMirrored = (cols - 1) - c
        const rowOffset = r * cols
        for (let c = 0; c < cols; c++) {
          const cMirrored = (cols - 1) - c
          const d = edgeCell_r - cMirrored

          if (d >= 0 && d < bandCells) {
            const keepProb = Math.pow(1 - d / bandCells, 1.3)
            const kHash = hash3(r, c, fFrame)
            if (kHash < keepProb) {
              const alpha = 0.95 * (1 - d / bandCells) + 0.05
              const color = d < 1 ? white : this.pickColor(palette, hash3(r, c, fFrame + 17))
              this.pixels32[rowOffset + c] = packABGR(color.r, color.g, color.b, alpha)
            }
          } else if (d < 0 && d >= -sparkCells) {
            const kHash = hash3(r, c, fFrame)
            if (kHash < 0.35) {
              const color = this.pickColor(palette, hash3(r, c, fFrame + 29))
              this.pixels32[rowOffset + c] = packABGR(color.r, color.g, color.b, 0.6)
            }
          }
        }
      }

      this.clipPointBuffer[ptIdx++] = `${W}px ${H}px`
    }

    this.result.clip = `polygon(${this.clipPointBuffer.slice(0, ptIdx).join(', ')})`
    return this.result
  }

  /**
   * Computes BURST transition (growing discrete rectangular cluster from screen center).
   */
  computeBurst(
    pRaw: number,
    paletteName: 'darkToLight' | 'lightToLight' = 'lightToLight'
  ): EngineResult {
    const p = Math.max(0, Math.min(1, pRaw))
    const { cell, W, H, cols, rows } = this
    const { bandCells, sparkCells, flickerSteps } = PIXEL_SCAN_CONFIG
    const palette = PARSED_PALETTES[paletteName] || PARSED_PALETTES.lightToLight
    const white = palette[0]

    this.pixels32.fill(0)

    if (p <= 0) {
      this.result.clip = `inset(${Math.round(H / 2)}px ${Math.round(W / 2)}px ${Math.round(H / 2)}px ${Math.round(W / 2)}px)`
      return this.result
    }

    if (p >= 1) {
      this.result.clip = 'none'
      return this.result
    }

    const s = easeInOutCubic(p)
    const fFrame = Math.floor(p * flickerSteps)

    const halfW = snapToCell(s * (W / 2 + bandCells * cell), cell)
    const halfH = snapToCell(s * (H / 2 + bandCells * cell), cell)

    const insetTop = Math.max(0, Math.round(H / 2 - halfH))
    const insetRight = Math.max(0, Math.round(W / 2 - halfW))
    const insetBottom = insetTop
    const insetLeft = insetRight

    this.result.clip = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`

    // Grid coordinates of the burst boundary
    const minC = Math.max(0, Math.floor((W / 2 - halfW) / cell))
    const maxC = Math.min(cols - 1, Math.ceil((W / 2 + halfW) / cell) - 1)
    const minR = Math.max(0, Math.floor((H / 2 - halfH) / cell))
    const maxR = Math.min(rows - 1, Math.ceil((H / 2 + halfH) / cell) - 1)

    // Center coordinates for core flash
    const centerC = cols / 2
    const centerR = rows / 2

    // Core flash active for p < 0.15
    const isCoreFlash = p < 0.15
    const coreRadius = isCoreFlash ? 1 + Math.floor((p / 0.15) * 3.9) : 0

    for (let r = 0; r < rows; r++) {
      const rowOffset = r * cols
      for (let c = 0; c < cols; c++) {
        // Distance to the nearest edge of the burst box (positive inside, negative outside)
        const insideX = c >= minC && c <= maxC
        const insideY = r >= minR && r <= maxR

        let d: number
        if (insideX && insideY) {
          d = Math.min(c - minC, maxC - c, r - minR, maxR - r)
        } else {
          const dx = insideX ? 0 : c < minC ? minC - c : c - maxC
          const dy = insideY ? 0 : r < minR ? minR - r : r - maxR
          d = -Math.max(dx, dy)
        }

        // 1. Core Flash in center
        if (isCoreFlash) {
          const distCenter = Math.hypot(c - centerC, r - centerR)
          if (distCenter <= coreRadius) {
            const kHash = hash3(r, c, fFrame)
            if (kHash > 0.15) {
              const color = distCenter < 1.2 ? white : this.pickColor(palette, hash3(r, c, fFrame + 33))
              this.pixels32[rowOffset + c] = packABGR(color.r, color.g, color.b, 0.95)
              continue
            }
          }
        }

        // 2. Band & sparks along perimeter
        if (d >= 0 && d < bandCells) {
          const keepProb = Math.pow(1 - d / bandCells, 1.3)
          const kHash = hash3(r, c, fFrame)
          if (kHash < keepProb) {
            const alpha = 0.95 * (1 - d / bandCells) + 0.05
            const color = d < 1 ? white : this.pickColor(palette, hash3(r, c, fFrame + 17))
            this.pixels32[rowOffset + c] = packABGR(color.r, color.g, color.b, alpha)
          }
        } else if (d < 0 && d >= -sparkCells) {
          const kHash = hash3(r, c, fFrame)
          if (kHash < 0.35) {
            const color = this.pickColor(palette, hash3(r, c, fFrame + 29))
            this.pixels32[rowOffset + c] = packABGR(color.r, color.g, color.b, 0.6)
          }
        }
      }
    }

    return this.result
  }
}

export default PixelScanEngine
