/**
 * PixelBlockWipeEngine.ts
 *
 * Full-screen pixel block wipe transition engine between Achievements and Contact.
 * Accurately reproduces the MONOGRID / Dolce & Gabbana digital block wipe:
 * - High-contrast electric purple (#2700FF) against deep dark background (#03050a / #050510)
 * - Exact video-matched block sizing (approx 16 columns on desktop, ~90px square cells)
 * - Distributed organic cluster seeds + pseudo-random digital scattering
 * - Crisp integer pixel boundaries preventing subpixel rounding gaps
 * - Deterministic cover (Phase 1 & 2), solid purple hold (Phase 3), and staggered digital reveal (Phase 4)
 * - 100% bidirectional and scrubbable via scroll
 */

export interface WipeCell {
  c: number
  r: number
  nx: number
  ny: number
  hash: number
  coverThreshold: number
  revealThreshold: number
}

function cellHash(c: number, r: number, seed: number = 0): number {
  let h = (c * 374761393 + r * 668265263 + seed * 982451653) ^ 0x5bf03635
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// Distributed seed centers across normalized [0..1, 0..1] coordinates matching video frames
const SEEDS = [
  { x: 0.10, y: 0.20, weight: 1.00, delay: 0.00 }, // Top-left
  { x: 0.50, y: 0.08, weight: 1.05, delay: 0.01 }, // Top-center
  { x: 0.85, y: 0.18, weight: 0.95, delay: 0.01 }, // Top-right
  { x: 0.32, y: 0.40, weight: 1.00, delay: 0.03 }, // Mid-left
  { x: 0.88, y: 0.50, weight: 1.00, delay: 0.02 }, // Mid-right
  { x: 0.18, y: 0.75, weight: 0.95, delay: 0.05 }, // Bottom-left
  { x: 0.65, y: 0.75, weight: 1.00, delay: 0.04 }, // Bottom-center-right
  { x: 0.42, y: 0.90, weight: 0.90, delay: 0.06 }, // Bottom-center
]

export class PixelBlockWipeEngine {
  public width: number = 0
  public height: number = 0
  public cols: number = 0
  public rows: number = 0
  public cellSize: number = 0
  private cells: WipeCell[] = []

  // Color constants matching reference video
  public readonly PRIMARY_COLOR = '#2700FF' // Vivid electric purple
  public readonly ACCENT_COLOR = '#180099'  // Dark electric indigo accent for newly activated cells

  constructor(width: number, height: number) {
    this.resize(width, height)
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.width = width
    this.height = height

    // Target block size: ~84-90px on desktop (giving ~16 cols on 1440p), ~46px on mobile
    const targetSize = width < 600 ? 46 : width < 1200 ? 76 : 90
    this.cols = Math.max(8, Math.round(width / targetSize))
    this.cellSize = width / this.cols
    this.rows = Math.ceil(height / this.cellSize)

    const cols = this.cols
    const rows = this.rows

    const tempCells: {
      c: number
      r: number
      nx: number
      ny: number
      hash: number
      scoreCover: number
      scoreReveal: number
    }[] = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const nx = (c + 0.5) / cols
        const ny = (r + 0.5) / rows

        // Multi-seed distance for organic cluster growth
        let minDist = 999
        for (const s of SEEDS) {
          const d = (Math.abs(nx - s.x) * 1.05 + Math.abs(ny - s.y) * 0.95) * s.weight + s.delay
          if (d < minDist) minDist = d
        }

        const hash = cellHash(c, r, 101)
        // Score combining cluster diffusion and digital scattered noise
        const scoreCover = minDist * 0.66 + hash * 0.34

        // Reveal score: progressive un-covering radiating outward
        const hashRev = cellHash(c, r, 303)
        const dRev = Math.abs(nx - 0.5) * 0.85 + Math.abs(ny - 0.5) * 1.0
        const scoreReveal = dRev * 0.66 + hashRev * 0.34

        tempCells.push({ c, r, nx, ny, hash, scoreCover, scoreReveal })
      }
    }

    // Rank cells for cover phase
    const coverSorted = [...tempCells].sort((a, b) => a.scoreCover - b.scoreCover)
    const coverThresholdMap = new Map<number, number>()
    coverSorted.forEach((cell, idx) => {
      const key = cell.r * cols + cell.c
      coverThresholdMap.set(key, idx / coverSorted.length)
    })

    // Rank cells for reveal phase
    const revealSorted = [...tempCells].sort((a, b) => a.scoreReveal - b.scoreReveal)
    const revealThresholdMap = new Map<number, number>()
    revealSorted.forEach((cell, idx) => {
      const key = cell.r * cols + cell.c
      revealThresholdMap.set(key, idx / revealSorted.length)
    })

    this.cells = tempCells.map((tc) => {
      const key = tc.r * cols + tc.c
      return {
        c: tc.c,
        r: tc.r,
        nx: tc.nx,
        ny: tc.ny,
        hash: tc.hash,
        coverThreshold: coverThresholdMap.get(key) ?? 0,
        revealThreshold: revealThresholdMap.get(key) ?? 0,
      }
    })
  }

  /**
   * Renders the transition to canvas.
   * @param ctx 2D Canvas context
   * @param coverP Cover progress [0..1]
   * @param revealP Reveal progress [0..1]
   * @param dpr Device pixel ratio
   */
  public render(
    ctx: CanvasRenderingContext2D,
    coverP: number,
    revealP: number,
    dpr: number = 1
  ): void {
    const W = this.width
    const H = this.height
    if (W <= 0 || H <= 0) return

    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, W, H)

    // Phase 4: Reveal destination section underneath
    if (revealP > 0) {
      if (revealP >= 1.0) {
        // Completely uncovered: canvas is clear, destination is fully visible
        ctx.restore()
        return
      }

      // Draw remaining solid purple blocks that haven't cleared yet
      const cellSize = this.cellSize
      const cells = this.cells

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]
        if (revealP >= cell.revealThreshold) {
          // Cell has cleared to reveal underneath
          continue
        }

        const x0 = Math.round(cell.c * cellSize)
        const x1 = Math.round((cell.c + 1) * cellSize)
        const y0 = Math.round(cell.r * cellSize)
        const y1 = Math.round((cell.r + 1) * cellSize)

        // Cells right before disappearing take on dark-indigo accent
        const isNearExit = (cell.revealThreshold - revealP) < 0.08 && cell.hash > 0.50
        ctx.fillStyle = isNearExit ? this.ACCENT_COLOR : this.PRIMARY_COLOR
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
      }

      ctx.restore()
      return
    }

    // Phase 3: Full-screen solid electric purple hold
    if (coverP >= 1.0) {
      ctx.fillStyle = this.PRIMARY_COLOR
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
      return
    }

    // Phase 1 & 2: Progressive block expansion & filling in order
    if (coverP <= 0) {
      ctx.restore()
      return
    }

    const cellSize = this.cellSize
    const cells = this.cells

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      if (coverP < cell.coverThreshold) continue

      const x0 = Math.round(cell.c * cellSize)
      const x1 = Math.round((cell.c + 1) * cellSize)
      const y0 = Math.round(cell.r * cellSize)
      const y1 = Math.round((cell.r + 1) * cellSize)

      // Newly turned-on cells briefly flash dark electric indigo before settling to electric purple
      const isFresh = (coverP - cell.coverThreshold) < 0.06 && cell.hash > 0.45
      ctx.fillStyle = isFresh ? this.ACCENT_COLOR : this.PRIMARY_COLOR
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
    }

    ctx.restore()
  }
}

