/**
 * FallingCardsBridge.ts
 *
 * Scroll-scrubbed 3D-projected falling cards cascade for Hackathons (Dark) -> Projects (White).
 * Synchronized deterministically with progress F in [0, 1] (100% reversible):
 *   - Wave 1 (F 0.00..0.44): Black cards (#07070a) + charcoal/slate grey cards (#2c2e35, #565a64) fall top -> down.
 *   - Wave 2 (F 0.34..0.74): Light grey and crisp white cards join across all horizontal lanes.
 *   - Wave 3 (F 0.62..0.95): Expanding, overlapping pure white panels cascade top -> down until they
 *     physically cover 100% of the viewport in pure #ffffff white (held through F = 1.00).
 */

export interface FallingCardDef {
  x0: number        // Horizontal lane normalized to half-height units (-1.75..+1.75)
  xDrift: number    // Gentle horizontal drift during fall
  z: number         // Depth (-1.2 far .. +1.05 near camera)
  w: number         // Width in local units
  h: number         // Height in local units
  tStart: number    // Progress F when card enters top edge
  tEnd: number      // Progress F when card clears bottom edge (or settles at cover pos)
  rx0: number
  rx1: number
  ry0: number
  ry1: number
  rz0: number
  rz1: number
  fill: string
  fillEnd?: string
  border: string
  borderWidth: number
  isFinalCover?: boolean // Final wave stops over viewport to form seamless 100% #ffffff white coverage
  stopY?: number
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 31.7) * 43758.5453123
  return x - Math.floor(x)
}

function buildCards(): FallingCardDef[] {
  const cards: FallingCardDef[] = []

  // Wave 1 (0.00 .. 0.56): Black cards + subtle grey cards falling from top across full width
  const wave1Colors = [
    { fill: '#060608', fillEnd: '#111319', border: 'rgba(255,255,255,0.22)' },
    { fill: '#08090c', fillEnd: '#161820', border: 'rgba(255,255,255,0.26)' },
    { fill: '#1c1e24', fillEnd: '#2a2d36', border: 'rgba(255,255,255,0.28)' },
    { fill: '#353842', fillEnd: '#4c505c', border: 'rgba(255,255,255,0.34)' },
    { fill: '#07070a', fillEnd: '#121318', border: 'rgba(255,255,255,0.20)' },
    { fill: '#575b66', fillEnd: '#737885', border: 'rgba(255,255,255,0.42)' },
  ]

  for (let i = 0; i < 18; i++) {
    const lane = ((i % 6) - 2.5) * 0.58 + (hash(i * 3 + 1) - 0.5) * 0.28
    const rowGroup = Math.floor(i / 6)
    const tStart = rowGroup * 0.095 + hash(i * 5 + 2) * 0.08
    const duration = 0.34 + hash(i * 7 + 3) * 0.14
    const style = wave1Colors[i % wave1Colors.length]
    const z = -0.65 + hash(i * 11 + 4) * 1.15
    cards.push({
      x0: lane,
      xDrift: (hash(i * 13 + 5) - 0.5) * 0.22,
      z,
      w: 0.34 + hash(i * 17 + 6) * 0.22,
      h: 0.44 + hash(i * 19 + 7) * 0.24,
      tStart,
      tEnd: tStart + duration,
      rx0: (hash(i * 23 + 1) - 0.5) * 0.85,
      rx1: (hash(i * 23 + 2) - 0.5) * 0.65,
      ry0: (hash(i * 29 + 1) - 0.5) * 0.95,
      ry1: (hash(i * 29 + 2) - 0.5) * 0.70,
      rz0: (hash(i * 31 + 1) - 0.5) * 0.48,
      rz1: (hash(i * 31 + 2) - 0.5) * 0.36,
      fill: style.fill,
      fillEnd: style.fillEnd,
      border: style.border,
      borderWidth: 1.25,
    })
  }

  // Wave 2 (0.28 .. 0.78): Light-grey & early crisp white cards join in the middle
  const wave2Colors = [
    { fill: '#474b55', fillEnd: '#636875', border: 'rgba(255,255,255,0.45)' },
    { fill: '#8f94a0', fillEnd: '#b4b9c4', border: 'rgba(255,255,255,0.65)' },
    { fill: '#d6d9e0', fillEnd: '#eceef3', border: 'rgba(255,255,255,0.85)' },
    { fill: '#f4f5f8', fillEnd: '#ffffff', border: 'rgba(255,255,255,0.95)' },
    { fill: '#ffffff', fillEnd: '#f1f3f8', border: 'rgba(210,218,235,0.85)' },
  ]

  for (let i = 0; i < 16; i++) {
    const lane = ((i % 5) - 2.0) * 0.68 + (hash(i * 41 + 3) - 0.5) * 0.30
    const rowGroup = Math.floor(i / 5)
    const tStart = 0.28 + rowGroup * 0.085 + hash(i * 43 + 2) * 0.06
    const duration = 0.34 + hash(i * 47 + 1) * 0.12
    const style = wave2Colors[i % wave2Colors.length]
    const z = -0.20 + hash(i * 53 + 4) * 1.15
    cards.push({
      x0: lane,
      xDrift: (hash(i * 59 + 5) - 0.5) * 0.18,
      z,
      w: 0.44 + hash(i * 61 + 6) * 0.28,
      h: 0.54 + hash(i * 67 + 7) * 0.28,
      tStart,
      tEnd: tStart + duration,
      rx0: (hash(i * 71 + 1) - 0.5) * 0.72,
      rx1: (hash(i * 71 + 2) - 0.5) * 0.40,
      ry0: (hash(i * 73 + 1) - 0.5) * 0.80,
      ry1: (hash(i * 73 + 2) - 0.5) * 0.45,
      rz0: (hash(i * 79 + 1) - 0.5) * 0.42,
      rz1: (hash(i * 79 + 2) - 0.5) * 0.24,
      fill: style.fill,
      fillEnd: style.fillEnd,
      border: style.border,
      borderWidth: 1.4,
    })
  }

  // Wave 3 (0.56 .. 0.94): Overlapping pure-white panels falling top -> down until 100% viewport coverage
  const coverLanes: Array<{ x: number; stopY: number; z: number; w: number; h: number; tStart: number; tEnd: number; rz: number }> = [
    { x: -1.35, stopY:  0.42, z: 0.85, w: 1.45, h: 1.55, tStart: 0.56, tEnd: 0.82, rz: -0.18 },
    { x:  1.35, stopY:  0.45, z: 0.87, w: 1.45, h: 1.55, tStart: 0.57, tEnd: 0.83, rz:  0.16 },
    { x: -0.45, stopY:  0.35, z: 0.90, w: 1.45, h: 1.60, tStart: 0.59, tEnd: 0.84, rz:  0.12 },
    { x:  0.45, stopY:  0.32, z: 0.92, w: 1.45, h: 1.60, tStart: 0.60, tEnd: 0.85, rz: -0.14 },
    { x: -1.35, stopY: -0.42, z: 0.96, w: 1.55, h: 1.65, tStart: 0.63, tEnd: 0.87, rz:  0.11 },
    { x:  1.35, stopY: -0.40, z: 0.98, w: 1.55, h: 1.65, tStart: 0.64, tEnd: 0.88, rz: -0.10 },
    { x: -0.42, stopY: -0.42, z: 1.02, w: 1.65, h: 1.70, tStart: 0.66, tEnd: 0.89, rz: -0.07 },
    { x:  0.42, stopY: -0.42, z: 1.04, w: 1.65, h: 1.70, tStart: 0.67, tEnd: 0.90, rz:  0.07 },
    { x:  0.00, stopY:  0.00, z: 1.08, w: 2.80, h: 2.40, tStart: 0.70, tEnd: 0.92, rz:  0.03 },
    { x: -1.10, stopY:  0.00, z: 1.12, w: 2.40, h: 2.60, tStart: 0.72, tEnd: 0.93, rz: -0.03 },
    { x:  1.10, stopY:  0.00, z: 1.14, w: 2.40, h: 2.60, tStart: 0.72, tEnd: 0.93, rz:  0.02 },
    // Final massive white sheet sliding from top to guarantee zero seam lines at >= 0.93
    { x:  0.00, stopY:  0.00, z: 1.25, w: 5.50, h: 3.40, tStart: 0.76, tEnd: 0.93, rz:  0.00 },
  ]

  coverLanes.forEach((c, idx) => {
    cards.push({
      x0: c.x,
      xDrift: 0,
      z: c.z,
      w: c.w,
      h: c.h,
      tStart: c.tStart,
      tEnd: c.tEnd,
      rx0: 0.34 * (idx % 2 === 0 ? 1 : -1),
      rx1: 0,
      ry0: 0.32 * (idx % 2 === 0 ? -1 : 1),
      ry1: 0,
      rz0: c.rz * 1.4,
      rz1: 0,
      fill: '#ffffff',
      fillEnd: '#ffffff',
      border: c.z >= 1.10 ? '#ffffff' : 'rgba(215, 222, 236, 0.75)',
      borderWidth: c.z >= 1.10 ? 0 : 1.2,
      isFinalCover: true,
      stopY: c.stopY,
    })
  })

  return cards
}

const CARDS: FallingCardDef[] = buildCards()

// Reusable temp buffers to keep 60fps scrub allocation-free
const projectedVerts = new Float32Array(8)

function projectCardQuad(
  cx: number,
  cy: number,
  focal: number,
  camZ: number,
  x: number,
  y: number,
  z: number,
  hw: number,
  hh: number,
  rx: number,
  ry: number,
  rz: number
): boolean {
  const cosX = Math.cos(rx), sinX = Math.sin(rx)
  const cosY = Math.cos(ry), sinY = Math.sin(ry)
  const cosZ = Math.cos(rz), sinZ = Math.sin(rz)

  const cornersX = [-hw, hw, hw, -hw]
  const cornersY = [hh, hh, -hh, -hh]

  for (let i = 0; i < 4; i++) {
    const lx = cornersX[i]
    const ly = cornersY[i]

    // 1. Z rotation
    const x1 = lx * cosZ - ly * sinZ
    const y1 = lx * sinZ + ly * cosZ
    const z1 = 0

    // 2. X rotation
    const y2 = y1 * cosX - z1 * sinX
    const z2 = y1 * sinX + z1 * cosX

    // 3. Y rotation
    const x3 = x1 * cosY + z2 * sinY
    const z3 = -x1 * sinY + z2 * cosY

    const wx = x + x3
    const wy = y + y2
    const wz = z + z3
    const dist = camZ - wz
    if (dist <= 0.12) return false

    const invD = focal / dist
    projectedVerts[i * 2] = cx + wx * invD
    projectedVerts[i * 2 + 1] = cy - wy * invD
  }
  return true
}

/**
 * Renders the Falling Cards cascade onto a full-viewport 2D canvas.
 * Starts from pure black #000000 and ends with overlapping pure white #ffffff coverage.
 */
export function renderFallingCardsBridge(
  canvas: HTMLCanvasElement,
  progress: number
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const F = clamp01(progress)
  const W = canvas.width
  const H = canvas.height
  if (W < 4 || H < 4) return

  // Pure white once F >= 0.94 so final Projects handoff has zero dark hairline seam
  if (F >= 0.945) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    return
  }

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  const camZ = 2.45
  const cx = W * 0.5
  const cy = H * 0.5
  const halfH = H * 0.5
  const fovScale = 1.85 // Perspective focal multiplier matching 60deg camera feel
  const focal = halfH * fovScale

  // Sort active cards back-to-front by current Z depth (deterministic small array)
  const active: Array<{ def: FallingCardDef; t: number; zOrder: number; x: number; y: number; z: number; rx: number; ry: number; rz: number }> = []

  for (let i = 0; i < CARDS.length; i++) {
    const c = CARDS[i]
    if (F < c.tStart) continue
    if (!c.isFinalCover && F > c.tEnd) continue

    const rawT = clamp01((F - c.tStart) / Math.max(0.001, c.tEnd - c.tStart))
    const t = c.isFinalCover
      ? 1 - Math.pow(1 - rawT, 2.6) // Decelerates cleanly into covering lock
      : rawT

    const topY = 1.75 + c.h * 0.55
    const botY = -1.75 - c.h * 0.55
    const y = c.isFinalCover
      ? lerp(topY, c.stopY ?? 0, t)
      : lerp(topY, botY, t)
    const x = c.x0 + c.xDrift * t
    const z = c.isFinalCover ? lerp(c.z - 0.35, c.z, t) : c.z
    const rx = lerp(c.rx0, c.rx1, t)
    const ry = lerp(c.ry0, c.ry1, t)
    const rz = lerp(c.rz0, c.rz1, t)

    active.push({ def: c, t, zOrder: z, x, y, z, rx, ry, rz })
  }

  active.sort((a, b) => a.zOrder - b.zOrder)

  for (let i = 0; i < active.length; i++) {
    const item = active[i]
    const c = item.def
    const ok = projectCardQuad(
      cx,
      cy,
      focal,
      camZ,
      item.x,
      item.y,
      item.z,
      c.w * 0.5,
      c.h * 0.5,
      item.rx,
      item.ry,
      item.rz
    )
    if (!ok) continue

    ctx.beginPath()
    ctx.moveTo(projectedVerts[0], projectedVerts[1])
    ctx.lineTo(projectedVerts[2], projectedVerts[3])
    ctx.lineTo(projectedVerts[4], projectedVerts[5])
    ctx.lineTo(projectedVerts[6], projectedVerts[7])
    ctx.closePath()

    if (c.fillEnd && c.fillEnd !== c.fill) {
      const grad = ctx.createLinearGradient(
        projectedVerts[0],
        projectedVerts[1],
        projectedVerts[4],
        projectedVerts[5]
      )
      grad.addColorStop(0, c.fill)
      grad.addColorStop(1, c.fillEnd)
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = c.fill
    }
    ctx.fill()

    if (c.borderWidth > 0 && c.border) {
      ctx.strokeStyle = c.border
      ctx.lineWidth = c.borderWidth
      ctx.stroke()
    }
  }
}

export default renderFallingCardsBridge
