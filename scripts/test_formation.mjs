const FOV = 38.0
const ASPECT = 16 / 9
const CAM_Z = 15.0
const Z_TRAVEL = 65.0

// Shorter helper for tan(19 deg)
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

const N = projects.length
const cardW_real = 2.7
const cardH_real = 1.6875
const d_focus = 6.6 // focus distance in front of camera

console.log('--- TEST FORMATION CALCULATION ---')
const realCards = projects.map((p, i) => {
  // Focus progress spaced between 0.40 and 0.88 (0.08 apart)
  const pFocus = 0.40 + i * 0.08
  const z_start = CAM_Z - d_focus - Z_TRAVEL * pFocus

  // Specific curated offsets matching the demo's spiral distribution (alternating left/right)
  // Left side: i = 0, 2, 4, 6; Right side: i = 1, 3, 5
  const spiralOffsets = [
    { x: -0.38, y:  0.05 }, // i = 0 (JeevaLink, Left)
    { x:  0.46, y: -0.24 }, // i = 1 (ChitGuard, Right)
    { x: -0.50, y: -0.25 }, // i = 2 (DR Detection, Left)
    { x:  0.38, y:  0.26 }, // i = 3 (CashPilot, Right)
    { x: -0.40, y:  0.25 }, // i = 4 (MediGuard AI, Left)
    { x:  0.48, y: -0.22 }, // i = 5 (HireConnect, Right)
    { x: -0.48, y: -0.15 }, // i = 6 (Campus IMS, Left)
  ]

  const offset = spiralOffsets[i]
  const side = offset.x < 0 ? -1 : 1
  const xOffsetRatio = offset.x
  const yOffsetRatio = offset.y

  const viewAtFocus = getViewDims(d_focus)
  const x_focus = xOffsetRatio * viewAtFocus.halfW
  const y_focus = yOffsetRatio * viewAtFocus.halfH

  // In template units (100px = 1 unit)
  const gridTotalHeight = 555
  const baseTravelY_focus = (pFocus - 0.48) * (gridTotalHeight * 1.85)
  const localY = y_focus * 100 - baseTravelY_focus
  const localX = x_focus * 100 * 0.65
  const cardWidthCss = 113.75
  const xPercent = (x_focus * 100 * 0.35) / ((pFocus * cardWidthCss) / 100)

  // Exit progress (when card passes camera lens, d = 0)
  const pExit = pFocus + d_focus / Z_TRAVEL

  return {
    id: p.id,
    title: p.title,
    index: i,
    pFocus,
    pExit,
    z_start,
    side: side === -1 ? 'L' : 'R',
    xOffsetRatio,
    yOffsetRatio,
    x_focus,
    y_focus,
    localX,
    localY,
    xPercent,
    cardW: cardW_real,
    cardH: cardH_real,
  }
})

function getRealCardState(c, p) {
  const z = c.z_start + Z_TRAVEL * p
  const d = CAM_Z - z
  const hasPassed = d <= 0

  const driftX = ((c.xPercent * p) / 100) * (113.75 * 0.01)
  const x = c.localX * 0.01 + driftX

  const baseTravelY = (p - 0.48) * (555 * 1.85 * 0.01)
  const y = c.localY * 0.01 + baseTravelY

  const rotXDeg = -40 * (1 - p)
  const rotYRad = (c.side === 'L' ? 1 : -1) * 0.14 // tilt toward center

  const view = getViewDims(Math.max(0.1, d))
  const projWidthRatio = d > 0.1 ? c.cardW / view.w : 999
  const screenXRatio = d > 0.1 ? x / view.halfW : 999
  const screenYRatio = d > 0.1 ? y / view.halfH : 999

  // Dissolve near lens based on projected width:
  // Start fading when projected width exceeds 45%, fully gone at 70%
  let lensFade = 1.0
  if (projWidthRatio > 0.45) {
    const t = Math.min(1, Math.max(0, (projWidthRatio - 0.45) / (0.7 - 0.45)))
    lensFade = 1 - t * t * (3 - 2 * t)
  }
  if (d <= 0.4) lensFade = 0

  // Intro fade [0.0, 0.06]
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
    rotXDeg,
    rotYRad,
    projWidthRatio,
    screenXRatio,
    screenYRatio,
    opacity,
    hasPassed,
  }
}

realCards.forEach((c) => {
  const s = getRealCardState(c, c.pFocus)
  console.log(
    `${c.title.padEnd(20)} | pFocus: ${c.pFocus.toFixed(2)} | Side: ${c.side} | ScreenX: ${s.screenXRatio.toFixed(3).padStart(6)} (req 0.35-0.55) | ScreenY: ${s.screenYRatio.toFixed(3).padStart(6)} | ProjW: ${(s.projWidthRatio * 100).toFixed(1)}% (req 28-42%) | Opacity: ${s.opacity.toFixed(2)}`
  )
})

console.log('\n--- REAL CARDS OVERLAP AT FOCUS MOMENTS ---')
function getScreenBox(c, p) {
  const s = getRealCardState(c, p)
  if (s.d <= 0.4 || s.hasPassed || s.opacity <= 0.01) return null
  const view = getViewDims(s.d)
  const halfW = c.cardW / 2
  const halfH = c.cardH / 2
  return {
    left: s.x - halfW,
    right: s.x + halfW,
    top: s.y + halfH,
    bottom: s.y - halfH,
    z: s.z,
    d: s.d,
    opacity: s.opacity,
    viewW: view.w,
    viewH: view.h,
    area: c.cardW * c.cardH,
    screenLeft: (s.x - halfW) / view.halfW,
    screenRight: (s.x + halfW) / view.halfW,
    screenTop: (s.y + halfH) / view.halfH,
    screenBottom: (s.y - halfH) / view.halfH,
  }
}

realCards.forEach((c) => {
  const boxFocus = getScreenBox(c, c.pFocus)
  let maxOverlap = 0
  let overlapWith = 'none'

  realCards.forEach((other) => {
    if (other.id === c.id) return
    const boxOther = getScreenBox(other, c.pFocus)
    if (!boxOther) return

    // Intersection in normalized screen coordinates [-1, 1]
    const interLeft = Math.max(boxFocus.screenLeft, boxOther.screenLeft)
    const interRight = Math.min(boxFocus.screenRight, boxOther.screenRight)
    const interBottom = Math.max(boxFocus.screenBottom, boxOther.screenBottom)
    const interTop = Math.min(boxFocus.screenTop, boxOther.screenTop)

    if (interRight > interLeft && interTop > interBottom) {
      const interArea = (interRight - interLeft) * (interTop - interBottom)
      const focusArea = (boxFocus.screenRight - boxFocus.screenLeft) * (boxFocus.screenTop - boxFocus.screenBottom)
      const ratio = interArea / focusArea
      if (ratio > maxOverlap) {
        maxOverlap = ratio
        overlapWith = other.title
      }
    }
  })

  console.log(`${c.title.padEnd(20)} | Max Real Overlap: ${(maxOverlap * 100).toFixed(1)}% with ${overlapWith} (req <= 10%)`)
})
