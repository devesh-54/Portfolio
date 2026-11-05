import { CONFIG, createCards, getCardTransform } from '../../template-analysis/templateMotion.js'

const FOV = 38.0
const ASPECT = 16 / 9
const CAM_Z = 15.0
const Z_TRAVEL = 65.0
const tanHalfFov = Math.tan((FOV / 2) * Math.PI / 180)

function getViewDims(d) {
  const h = 2 * d * tanHalfFov
  const w = h * ASPECT
  return { w, h, halfW: w / 2, halfH: h / 2 }
}

const projects = [
  { id: 'jeevalink', title: 'JeevaLink' },
  { id: 'chitguard', title: 'ChitGuard (SafeChit)' },
  { id: 'dr-detection', title: 'DR Detection' },
  { id: 'cashpilot', title: 'CashPilot' },
  { id: 'mediguard-ai', title: 'MediGuard AI' },
  { id: 'hireconnect', title: 'HireConnect' },
  { id: 'campus-ims', title: 'Campus IMS' },
]

const spiralOffsets = [
  { x: -0.38, y:  0.05 }, // i = 0 (JeevaLink, Left)
  { x:  0.46, y: -0.24 }, // i = 1 (ChitGuard, Right)
  { x: -0.50, y: -0.25 }, // i = 2 (DR Detection, Left)
  { x:  0.38, y:  0.26 }, // i = 3 (CashPilot, Right)
  { x: -0.40, y:  0.25 }, // i = 4 (MediGuard AI, Left)
  { x:  0.48, y: -0.22 }, // i = 5 (HireConnect, Right)
  { x: -0.48, y: -0.15 }, // i = 6 (Campus IMS, Left)
]

const d_focus = 6.6
const cardW_real = 2.7
const cardH_real = 1.6875

const realCards = projects.map((p, i) => {
  const pFocus = 0.40 + i * 0.08
  const z_start = CAM_Z - d_focus - Z_TRAVEL * pFocus
  const offset = spiralOffsets[i]
  const side = offset.x < 0 ? -1 : 1
  const viewAtFocus = getViewDims(d_focus)
  const x_focus = offset.x * viewAtFocus.halfW
  const y_focus = offset.y * viewAtFocus.halfH

  const gridTotalHeight = 555
  const baseTravelY_focus = (pFocus - 0.48) * (gridTotalHeight * 1.85)
  const localY = y_focus * 100 - baseTravelY_focus
  const localX = x_focus * 100 * 0.65
  const cardWidthCss = 113.75
  const xPercent = (x_focus * 100 * 0.35) / ((pFocus * cardWidthCss) / 100)

  return {
    id: p.id,
    title: p.title,
    index: i,
    isReal: true,
    pFocus,
    z_start,
    side: side === -1 ? 'L' : 'R',
    x_focus,
    y_focus,
    localX,
    localY,
    xPercent,
    cardW: cardW_real,
    cardH: cardH_real,
  }
})

// Generate template placeholders (41 placeholders)
const templateCards = createCards(CONFIG)
const placeholders = templateCards.slice(7).map((c, idx) => ({
  ...c,
  isReal: false,
  cardW: 1.8,
  cardH: 1.2,
}))

function getCardScreenRect(card, p) {
  if (card.isReal) {
    const z = card.z_start + Z_TRAVEL * p
    const d = CAM_Z - z
    if (d <= 0.4) return null

    const driftX = ((card.xPercent * p) / 100) * (113.75 * 0.01)
    const x = card.localX * 0.01 + driftX
    const baseTravelY = (p - 0.48) * (555 * 1.85 * 0.01)
    const y = card.localY * 0.01 + baseTravelY

    const view = getViewDims(d)
    const halfW = card.cardW / 2
    const halfH = card.cardH / 2
    return {
      left: (x - halfW) / view.halfW,
      right: (x + halfW) / view.halfW,
      top: (y + halfH) / view.halfH,
      bottom: (y - halfH) / view.halfH,
      d,
      x,
      y,
      card,
    }
  } else {
    const t = getCardTransform(card, p, CONFIG)
    const d = 15.0 - t.position.z
    if (d <= 0.4 || t.opacity <= 0.01) return null

    const view = getViewDims(d)
    const halfW = card.cardW / 2
    const halfH = card.cardH / 2
    return {
      left: (t.position.x - halfW) / view.halfW,
      right: (t.position.x + halfW) / view.halfW,
      top: (t.position.y - halfH) / view.halfH,
      bottom: (t.position.y - halfH) / view.halfH,
      d,
      x: t.position.x,
      y: t.position.y,
      card,
    }
  }
}

// Zone clearing loop
realCards.forEach((rc) => {
  const p = rc.pFocus
  const rRect = getCardScreenRect(rc, p)
  if (!rRect) return

  const rArea = (rRect.right - rRect.left) * (rRect.top - rRect.bottom)

  placeholders.forEach((ph) => {
    for (let iter = 0; iter < 10; iter++) {
      const phRect = getCardScreenRect(ph, p)
      if (!phRect) break

      const interLeft = Math.max(rRect.left, phRect.left)
      const interRight = Math.min(rRect.right, phRect.right)
      const interBottom = Math.max(rRect.bottom, phRect.bottom)
      const interTop = Math.min(rRect.top, phRect.top)

      if (interRight > interLeft && interTop > interBottom) {
        const interArea = (interRight - interLeft) * (interTop - interBottom)
        const overlap = interArea / rArea
        if (overlap > 0.05) {
          // Push placeholder outward away from real card
          const dirX = phRect.x - rRect.x
          const dirY = phRect.y - rRect.y
          const sX = dirX >= 0 ? 1 : -1
          const sY = dirY >= 0 ? 1 : -1
          ph.localX += sX * 45
          ph.localY += sY * 30
        } else {
          break
        }
      } else {
        break
      }
    }
  })
})

console.log('--- AUDIT TABLE (PLACEHOLDERS VS REAL CARDS) ---')
realCards.forEach((rc) => {
  const p = rc.pFocus
  const rRect = getCardScreenRect(rc, p)
  const rArea = (rRect.right - rRect.left) * (rRect.top - rRect.bottom)
  let maxPhOverlap = 0
  let overlappingPhIndex = -1

  placeholders.forEach((ph, idx) => {
    const phRect = getCardScreenRect(ph, p)
    if (!phRect) return
    const interLeft = Math.max(rRect.left, phRect.left)
    const interRight = Math.min(rRect.right, phRect.right)
    const interBottom = Math.max(rRect.bottom, phRect.bottom)
    const interTop = Math.min(rRect.top, phRect.top)
    if (interRight > interLeft && interTop > interBottom) {
      const interArea = (interRight - interLeft) * (interTop - interBottom)
      const overlap = interArea / rArea
      if (overlap > maxPhOverlap) {
        maxPhOverlap = overlap
        overlappingPhIndex = idx
      }
    }
  })

  console.log(`${rc.title.padEnd(20)} | pFocus: ${rc.pFocus.toFixed(2)} | Max Placeholder Overlap: ${(maxPhOverlap * 100).toFixed(1)}% (req <= 10%)`)
})
