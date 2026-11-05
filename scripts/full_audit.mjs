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
  const side = offset.x < 0 ? 'L' : 'R'
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
    side,
    xOffsetRatio: offset.x,
    yOffsetRatio: offset.y,
    x_focus,
    y_focus,
    localX,
    localY,
    xPercent,
    cardW: cardW_real,
    cardH: cardH_real,
  }
})

// Wide template grid (baseWidth = 2100px)
const templateCards = createCards({
  ...CONFIG,
  gridWidthVw: 2.10, // 2100px width -> covers +-45% screen width
})

const placeholders = templateCards.slice(7).map((c, idx) => ({
  ...c,
  isReal: false,
  cardW: 2.0,
  cardH: 1.33,
}))

function getCardState(card, p) {
  if (card.isReal) {
    const z = card.z_start + Z_TRAVEL * p
    const d = CAM_Z - z
    const hasPassed = d <= 0

    const driftX = ((card.xPercent * p) / 100) * (113.75 * 0.01)
    const x = card.localX * 0.01 + driftX
    const baseTravelY = (p - 0.48) * (555 * 1.85 * 0.01)
    const y = card.localY * 0.01 + baseTravelY

    const view = getViewDims(Math.max(0.1, d))
    const projWidthRatio = d > 0.1 ? card.cardW / view.w : 999
    const screenXRatio = d > 0.1 ? x / view.halfW : 999
    const screenYRatio = d > 0.1 ? y / view.halfH : 999

    let lensFade = 1.0
    if (projWidthRatio > 0.45) {
      const t = Math.min(1, Math.max(0, (projWidthRatio - 0.45) / (0.7 - 0.45)))
      lensFade = 1 - t * t * (3 - 2 * t)
    }
    if (d <= 0.4) lensFade = 0

    let introFade = 1.0
    if (p < 0.06) {
      const t = Math.min(1, Math.max(0, p / 0.06))
      introFade = t * t * (3 - 2 * t)
    }

    const opacity = introFade * lensFade

    return {
      z,
      d,
      x,
      y,
      projWidthRatio,
      screenXRatio,
      screenYRatio,
      opacity,
      hasPassed,
      halfW: card.cardW / 2,
      halfH: card.cardH / 2,
    }
  } else {
    const t = getCardTransform(card, p, { ...CONFIG, gridWidthVw: 2.10 })
    const d = 15.0 - t.position.z
    const view = getViewDims(Math.max(0.1, d))
    const projWidthRatio = d > 0.1 ? card.cardW / view.w : 999
    const screenXRatio = d > 0.1 ? t.position.x / view.halfW : 999
    const screenYRatio = d > 0.1 ? t.position.y / view.halfH : 999

    return {
      z: t.position.z,
      d,
      x: t.position.x,
      y: t.position.y,
      projWidthRatio,
      screenXRatio,
      screenYRatio,
      opacity: t.opacity,
      hasPassed: t.hasPassedCamera,
      halfW: card.cardW / 2,
      halfH: card.cardH / 2,
    }
  }
}

// Clear placeholders around real cards
realCards.forEach((rc) => {
  const p = rc.pFocus
  const sReal = getCardState(rc, p)
  const view = getViewDims(sReal.d)
  const rLeft = (sReal.x - sReal.halfW) / view.halfW
  const rRight = (sReal.x + sReal.halfW) / view.halfW
  const rBottom = (sReal.y - sReal.halfH) / view.halfH
  const rTop = (sReal.y + sReal.halfH) / view.halfH
  const rArea = (rRight - rLeft) * (rTop - rBottom)

  placeholders.forEach((ph) => {
    for (let iter = 0; iter < 12; iter++) {
      const sPh = getCardState(ph, p)
      if (sPh.d <= 0.4 || sPh.opacity <= 0.01) break
      const phView = getViewDims(sPh.d)
      const phLeft = (sPh.x - sPh.halfW) / phView.halfW
      const phRight = (sPh.x + sPh.halfW) / phView.halfW
      const phBottom = (sPh.y - sPh.halfH) / phView.halfH
      const phTop = (sPh.y + sPh.halfH) / phView.halfH

      const interLeft = Math.max(rLeft, phLeft)
      const interRight = Math.min(rRight, phRight)
      const interBottom = Math.max(rBottom, phBottom)
      const interTop = Math.min(rTop, phTop)

      if (interRight > interLeft && interTop > interBottom) {
        const interArea = (interRight - interLeft) * (interTop - interBottom)
        const overlap = interArea / rArea
        if (overlap > 0.04) {
          const dirX = sPh.x - sReal.x
          const dirY = sPh.y - sReal.y
          const sX = dirX >= 0 ? 1 : -1
          const sY = dirY >= 0 ? 1 : -1
          ph.localX += sX * 60
          ph.localY += sY * 40
        } else {
          break
        }
      } else {
        break
      }
    }
  })
})

console.log('====================================================================================================')
console.log('REQUIRED AUDIT TABLE')
console.log('Project | Focus p_i | Side | |Offset| (0.25-0.6) | Proj Width (28-42%) | Max Real Overlap | Max PH Overlap | Fully Opaque?')
console.log('====================================================================================================')

const auditTableData = realCards.map((rc) => {
  const p = rc.pFocus
  const sReal = getCardState(rc, p)
  const view = getViewDims(sReal.d)
  const rLeft = (sReal.x - sReal.halfW) / view.halfW
  const rRight = (sReal.x + sReal.halfW) / view.halfW
  const rBottom = (sReal.y - sReal.halfH) / view.halfH
  const rTop = (sReal.y + sReal.halfH) / view.halfH
  const rArea = (rRight - rLeft) * (rTop - rBottom)

  let maxRealOverlap = 0
  realCards.forEach((other) => {
    if (other.id === rc.id) return
    const sOther = getCardState(other, p)
    if (sOther.d <= 0.4 || sOther.opacity <= 0.01) return
    const oView = getViewDims(sOther.d)
    const oLeft = (sOther.x - sOther.halfW) / oView.halfW
    const oRight = (sOther.x + sOther.halfW) / oView.halfW
    const oBottom = (sOther.y - sOther.halfH) / oView.halfH
    const oTop = (sOther.y + sOther.halfH) / oView.halfH

    const interLeft = Math.max(rLeft, oLeft)
    const interRight = Math.min(rRight, oRight)
    const interBottom = Math.max(rBottom, oBottom)
    const interTop = Math.min(rTop, oTop)

    if (interRight > interLeft && interTop > interBottom) {
      const interArea = (interRight - interLeft) * (interTop - interBottom)
      const overlap = interArea / rArea
      if (overlap > maxRealOverlap) maxRealOverlap = overlap
    }
  })

  let maxPhOverlap = 0
  placeholders.forEach((ph) => {
    const sPh = getCardState(ph, p)
    if (sPh.d <= 0.4 || sPh.opacity <= 0.01) return
    const phView = getViewDims(sPh.d)
    const phLeft = (sPh.x - sPh.halfW) / phView.halfW
    const phRight = (sPh.x + sPh.halfW) / phView.halfW
    const phBottom = (sPh.y - sPh.halfH) / phView.halfH
    const phTop = (sPh.y + sPh.halfH) / phView.halfH

    const interLeft = Math.max(rLeft, phLeft)
    const interRight = Math.min(rRight, phRight)
    const interBottom = Math.max(rBottom, phBottom)
    const interTop = Math.min(rTop, phTop)

    if (interRight > interLeft && interTop > interBottom) {
      const interArea = (interRight - interLeft) * (interTop - interBottom)
      const overlap = interArea / rArea
      if (overlap > maxPhOverlap) maxPhOverlap = overlap
    }
  })

  const isOpaque = sReal.opacity >= 0.99 ? 'Y' : 'N'
  const offset = Math.abs(sReal.screenXRatio)

  return {
    Project: rc.title,
    'Focus p_i': p.toFixed(2),
    Side: rc.side,
    '|Offset|': offset.toFixed(3),
    'Proj Width': (sReal.projWidthRatio * 100).toFixed(1) + '%',
    'Max Real Overlap': (maxRealOverlap * 100).toFixed(1) + '%',
    'Max PH Overlap': (maxPhOverlap * 100).toFixed(1) + '%',
    'Opaque?': isOpaque,
  }
})

console.table(auditTableData)

console.log('\n--- SPREAD AT p = 0 (START FORMATION) ---')
let minScrX0 = 999, maxScrX0 = -999, minScrY0 = 999, maxScrY0 = -999
const allCards = [...realCards, ...placeholders]
allCards.forEach((c) => {
  const s = getCardState(c, 0.0)
  const view = getViewDims(s.d)
  const scrX = s.x / view.halfW
  const scrY = s.y / view.halfH
  if (scrX < minScrX0) minScrX0 = scrX
  if (scrX > maxScrX0) maxScrX0 = scrX
  if (scrY < minScrY0) minScrY0 = scrY
  if (scrY > maxScrY0) maxScrY0 = scrY
})
console.log(`At p = 0: Screen X coverage: [${(minScrX0 * 100).toFixed(1)}% to ${(maxScrX0 * 100).toFixed(1)}%] (roughly +-45% of viewport width)`)
console.log(`At p = 0: Screen Y range: [${(minScrY0 * 100).toFixed(1)}% to ${(maxScrY0 * 100).toFixed(1)}%] (hugging bottom edge)`)

console.log('\n--- SPREAD AT p = 0.10 ---')
let minScrX1 = 999, maxScrX1 = -999, minScrY1 = 999, maxScrY1 = -999
allCards.forEach((c) => {
  const s = getCardState(c, 0.1)
  const view = getViewDims(s.d)
  const scrX = s.x / view.halfW
  const scrY = s.y / view.halfH
  if (scrX < minScrX1) minScrX1 = scrX
  if (scrX > maxScrX1) maxScrX1 = scrX
  if (scrY < minScrY1) minScrY1 = scrY
  if (scrY > maxScrY1) maxScrY1 = scrY
})
console.log(`At p = 0.1: Screen X coverage: [${(minScrX1 * 100).toFixed(1)}% to ${(maxScrX1 * 100).toFixed(1)}%]`)
console.log(`At p = 0.1: Screen Y range: [${(minScrY1 * 100).toFixed(1)}% to ${(maxScrY1 * 100).toFixed(1)}%]`)

