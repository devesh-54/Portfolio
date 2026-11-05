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
const Z_TRAVEL = 65.0
const CAM_Z = 15.0
const FOV = 38.0
const ASPECT = 16 / 9

// Real cards configuration
const realCards = projects.map((p, i) => {
  const pExit = 0.45 + (i * (0.97 - 0.45)) / (N - 1)
  const z_start = CAM_Z - Z_TRAVEL * pExit
  // Alternate subtly left and right, within +-15% of view width at pass
  const x_pass = (i % 2 === 0 ? -1 : 1) * (0.24 + 0.08 * (i / (N - 1)))
  const y_pass = ((i % 3) - 1) * 0.1
  const cardW = 6.4
  const cardH = 4.0
  return {
    id: p.id,
    title: p.title,
    index: i,
    pExit,
    z_start,
    x_pass,
    y_pass,
    cardW,
    cardH,
  }
})

function getRealCardState(card, p) {
  const z = card.z_start + Z_TRAVEL * p
  const d = CAM_Z - z
  const t = Math.min(1, Math.max(0, p / card.pExit))
  // Y rises from bottom cluster to center
  const y = card.y_pass + (p - card.pExit) * 5.0
  const x = card.x_pass * (0.4 + 0.6 * t)
  const rotX = -40 * (1 - t)

  // Viewport dims at distance d
  const tanHalf = Math.tan((FOV / 2) * Math.PI / 180)
  const viewH = 2 * d * tanHalf
  const viewW = viewH * ASPECT

  // Projected width ratio
  const projWidthRatio = d > 0.1 ? card.cardW / viewW : 999

  // Viewport bounds check (is >= 80% inside viewport)
  const halfW = card.cardW / 2
  const halfH = card.cardH / 2
  const left = x - halfW
  const right = x + halfW
  const bottom = y - halfH
  const top = y + halfH

  const vHalfW = viewW / 2
  const vHalfH = viewH / 2
  const intersectW = Math.max(0, Math.min(right, vHalfW) - Math.max(left, -vHalfW))
  const intersectH = Math.max(0, Math.min(top, vHalfH) - Math.max(bottom, -vHalfH))
  const cardArea = card.cardW * card.cardH
  const coverage = (intersectW * intersectH) / cardArea

  const isVisible =
    d >= 0.4 && coverage >= 0.8 && projWidthRatio >= 0.25 && projWidthRatio <= 0.7

  return { z, d, x, y, rotX, viewW, viewH, projWidthRatio, coverage, isVisible }
}

console.log('--- VISIBILITY AUDIT FOR REAL CARDS ---')
const auditResults = realCards.map((c) => {
  let pStart = -1,
    pEnd = -1
  for (let step = 0; step <= 2000; step++) {
    const p = step / 2000
    const s = getRealCardState(c, p)
    if (s.isVisible) {
      if (pStart === -1) pStart = p
      pEnd = p
    }
  }
  const windowLen = pEnd >= 0 ? pEnd - pStart : 0
  const passed = windowLen >= 0.04
  console.log(
    `${c.title.padEnd(14)} | z_start: ${c.z_start.toFixed(2).padStart(6)} | pExit: ${c.pExit.toFixed(3)} | win: [${pStart.toFixed(3)} - ${pEnd.toFixed(3)}] (len: ${windowLen.toFixed(3)}) | >= 0.04: ${passed ? 'PASS' : 'FAIL'}`
  )
  return { ...c, pStart, pEnd, windowLen, passed }
})

const allPassed = auditResults.every((r) => r.passed)
console.log(`ALL REAL CARDS PASSED AUDIT: ${allPassed}`)
