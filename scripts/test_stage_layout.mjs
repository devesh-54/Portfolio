/**
 * test_stage_layout.mjs
 * Validates the stage-based back-solved layout against ALL AUDIT criteria.
 */

const CONFIG = {
  aspectRatio: 16 / 9,
  cameraFov: 38.0,
  perspectiveDistance: 1500,
  zTravelTotal: 6500,
  cameraZ: 15.0,
  threeUnitsScale: 0.01,
  gridTotalHeight: 900,
  fogNear: 12.0,
  fogFar: 60.0,
};

const tanHalfFov = Math.tan((CONFIG.cameraFov / 2) * (Math.PI / 180));

function getViewDims(d, aspect = CONFIG.aspectRatio) {
  const halfH = d * tanHalfFov;
  const halfW = halfH * aspect;
  return { halfH, halfW };
}

// 7 Real Projects
const PROJECTS = [
  { id: 'jeevalink', title: 'JeevaLink' },
  { id: 'chitguard', title: 'ChitGuard (SafeChit)' },
  { id: 'dr-detection', title: 'DR Detection' },
  { id: 'cashpilot', title: 'CashPilot' },
  { id: 'mediguard-ai', title: 'MediGuard AI' },
  { id: 'hireconnect', title: 'HireConnect' },
  { id: 'campus-ims', title: 'Campus IMS' },
];

// Target Hero specifications
// Evenly spaced p_i from 0.44 to 0.92
// Alternating sides, |nx| in [0.30, 0.50], |ny| <= 0.25
const HERO_TARGETS = [
  { p: 0.44, side: 'L', nx: -0.38, ny:  0.08 },
  { p: 0.52, side: 'R', nx:  0.42, ny: -0.10 },
  { p: 0.60, side: 'L', nx: -0.44, ny:  0.10 },
  { p: 0.68, side: 'R', nx:  0.38, ny: -0.06 },
  { p: 0.76, side: 'L', nx: -0.40, ny:  0.06 },
  { p: 0.84, side: 'R', nx:  0.44, ny: -0.10 },
  { p: 0.92, side: 'L', nx: -0.40, ny:  0.05 },
];

const HERO_W = 2.40;
const HERO_H = 1.50;
const TARGET_PROJ_WIDTH = 0.33; // 33%

// Calculate required distance at hero moment
// projWidth = HERO_W / (2 * d * tanHalfFov * aspect)
const d_hero = HERO_W / (2 * TARGET_PROJ_WIDTH * tanHalfFov * CONFIG.aspectRatio);

function createBackSolvedCard(params) {
  const {
    id,
    title,
    isReal,
    pTarget,
    dTarget,
    nxTarget,
    nyTarget,
    cardW,
    cardH,
    xPercent = 0,
    yPercent = 0,
    rotXStart = -45,
    rotY = 0,
  } = params;

  const dCss = dTarget * 100;
  const zCssTarget = CONFIG.perspectiveDistance - dCss;
  const z_start = zCssTarget - CONFIG.zTravelTotal * pTarget;

  const view = getViewDims(dTarget, CONFIG.aspectRatio);
  const xTarget = nxTarget * view.halfW;
  const yTarget = nyTarget * view.halfH;

  const xCssTarget = xTarget * 100;
  const yCssTarget = yTarget * 100;

  const cardWidthCss = cardW * 100;
  const cardHeightCss = cardH * 100;

  const driftXTarget = (xPercent * pTarget / 100) * cardWidthCss;
  const localX = xCssTarget - driftXTarget;

  const baseTravelYTarget = (pTarget - 0.48) * (CONFIG.gridTotalHeight * 1.85);
  const driftYTarget = (yPercent * pTarget / 100) * cardHeightCss;
  const localY = yCssTarget - baseTravelYTarget - driftYTarget;

  return {
    id,
    title,
    isReal,
    pTarget,
    dTarget,
    cardW,
    cardH,
    cardWidthCss,
    cardHeightCss,
    localX,
    localY,
    z_start,
    xPercent,
    yPercent,
    rotXStart,
    rotY,
  };
}

export function buildCardField() {
  const allCards = [];

  // 1. Thinned original template placeholders (32 cards)
  const cols = 8;
  const rows = 6;
  const baseWidth = 1000 * 1.05;
  const gap = 1000 * 0.02;
  const tCardW = (baseWidth - (cols - 1) * gap) / cols;
  const tCardH = tCardW / 1.5;

  let phCount = 0;
  for (let i = 0; i < 48; i++) {
    // Keep 32 cards (skip every 3rd card)
    if (i % 3 === 2) continue;

    const col = i % cols;
    const row = Math.floor(i / cols);

    const pseudoRand = (seed) => {
      const x = Math.sin(seed + i * 19.3) * 10000;
      return x - Math.floor(x);
    };

    const z_start = -5000 + pseudoRand(1) * 3000;
    const rotXStart = -65 + pseudoRand(2) * 40;
    const xPercent = (pseudoRand(3) * 2 - 1) * 100;
    const yPercent = (pseudoRand(4) * 2 - 1) * 180;

    const localX = (col - (cols - 1) / 2) * (tCardW + gap);
    const localY = (row - (rows - 1) / 2) * (tCardH + gap);

    allCards.push({
      id: `tmpl_${i}`,
      title: `Placeholder ${phCount + 1}`,
      isReal: false,
      cardW: tCardW * 0.01,
      cardH: tCardH * 0.01,
      cardWidthCss: tCardW,
      cardHeightCss: tCardH,
      localX,
      localY,
      z_start,
      xPercent,
      yPercent,
      rotXStart,
      rotY: 0,
    });
    phCount++;
  }

  // 2. Real Project Cards
  PROJECTS.forEach((p, i) => {
    const tgt = HERO_TARGETS[i];
    const card = createBackSolvedCard({
      id: p.id,
      title: p.title,
      isReal: true,
      pTarget: tgt.p,
      dTarget: d_hero,
      nxTarget: tgt.nx,
      nyTarget: tgt.ny,
      cardW: HERO_W,
      cardH: HERO_H,
      xPercent: 0,
      yPercent: 0,
      rotXStart: -45,
      rotY: (tgt.nx < 0 ? 1 : -1) * 0.14,
    });
    card.heroIndex = i;
    card.side = tgt.side;
    allCards.push(card);

    // 3. Companion Placeholders
    // Carefully placed around the hero:
    // >= 2 left, >= 2 right, >= 2 above, >= 2 below, share above < 45%
    const s = tgt.nx < 0 ? -1 : 1;
    const compSpecs = [
      // c0: Opposite side (far side of center line)
      { nx: -s * 0.45, ny: tgt.ny - 0.15, rW: 0.70, deltaD: 1.6 },
      // c1: Beside on same side (outer flank)
      { nx: s * 0.75, ny: tgt.ny - 0.08, rW: 0.55, deltaD: 1.0 },
      // c2: Below hero - center/flank
      { nx: tgt.nx * 0.6, ny: tgt.ny - 0.42, rW: 0.65, deltaD: 1.4 },
      // c3: Below hero - low base
      { nx: -s * 0.22, ny: tgt.ny - 0.52, rW: 0.50, deltaD: 2.2 },
      // c4: Above hero 1 (comfortably above)
      { nx: tgt.nx + (s > 0 ? 0.05 : -0.05), ny: tgt.ny + 0.40, rW: 0.55, deltaD: 1.5 },
      // c5: Above hero 2 (opposite side high)
      { nx: -s * 0.35, ny: tgt.ny + 0.38, rW: 0.50, deltaD: 2.0 },
    ];

    compSpecs.forEach((c, cIdx) => {
      const cCardW = HERO_W * c.rW;
      const cCardH = cCardW / 1.5;
      const cDist = d_hero + c.deltaD;

      const compCard = createBackSolvedCard({
        id: `comp_${p.id}_${cIdx}`,
        title: `Companion ${p.id} #${cIdx + 1}`,
        isReal: false,
        pTarget: tgt.p,
        dTarget: cDist,
        nxTarget: c.nx,
        nyTarget: c.ny,
        cardW: cCardW,
        cardH: cCardH,
        xPercent: 0,
        yPercent: 0,
        rotXStart: -45,
        rotY: 0,
      });
      allCards.push(compCard);
    });
  });

  // 4. Extra Tail Companions to guarantee >= 10 visible placeholders up to p = 0.95
  const tailSpecs = [
    { p: 0.90, nx: -0.65, ny: -0.20, rW: 0.60, deltaD: 2.0 },
    { p: 0.90, nx:  0.55, ny: -0.30, rW: 0.55, deltaD: 1.8 },
    { p: 0.92, nx:  0.40, ny:  0.35, rW: 0.50, deltaD: 2.5 },
    { p: 0.92, nx: -0.15, ny: -0.45, rW: 0.55, deltaD: 2.2 },
    { p: 0.94, nx:  0.60, ny: -0.15, rW: 0.60, deltaD: 1.5 },
    { p: 0.94, nx: -0.50, ny:  0.25, rW: 0.50, deltaD: 2.0 },
  ];
  tailSpecs.forEach((t, tIdx) => {
    const cW = HERO_W * t.rW;
    const cH = cW / 1.5;
    const card = createBackSolvedCard({
      id: `tail_${tIdx}`,
      title: `Tail PH #${tIdx + 1}`,
      isReal: false,
      pTarget: t.p,
      dTarget: d_hero + t.deltaD,
      nxTarget: t.nx,
      nyTarget: t.ny,
      cardW: cW,
      cardH: cH,
      xPercent: 0,
      yPercent: 0,
      rotXStart: -45,
      rotY: 0,
    });
    allCards.push(card);
  });

  // 5. Outward Clearing Loop: Ensure <= 5% overlap with ANY hero at its hero time
  const realList = allCards.filter(c => c.isReal);
  const phList = allCards.filter(c => !c.isReal);

  realList.forEach(hero => {
    const p = hero.pTarget;
    const sHero = evalTransform(hero, p);
    const hL = sHero.nx - sHero.projWidthRatio;
    const hR = sHero.nx + sHero.projWidthRatio;
    const hB = sHero.ny - sHero.projHeightRatio;
    const hT = sHero.ny + sHero.projHeightRatio;
    const hArea = (hR - hL) * (hT - hB);

    phList.forEach(ph => {
      for (let iter = 0; iter < 15; iter++) {
        const sPh = evalTransform(ph, p);
        if (sPh.d <= 0.4 || sPh.projWidthRatio < 0.02) break;

        const pL = sPh.nx - sPh.projWidthRatio;
        const pR = sPh.nx + sPh.projWidthRatio;
        const pB = sPh.ny - sPh.projHeightRatio;
        const pT = sPh.ny + sPh.projHeightRatio;

        const iL = Math.max(hL, pL);
        const iR = Math.min(hR, pR);
        const iB = Math.max(hB, pB);
        const iT = Math.min(hT, pT);

        if (iR > iL && iT > iB) {
          const interArea = (iR - iL) * (iT - iB);
          const overlap = interArea / hArea;
          if (overlap > 0.05) {
            let dx = sPh.nx - sHero.nx;
            let dy = sPh.ny - sHero.ny;
            const dist = Math.hypot(dx, dy) || 1;
            dx /= dist;
            dy /= dist;
            ph.localX += dx * 65;
            ph.localY += dy * 45;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    });
  });

  return allCards;
}

export function evalTransform(card, progress, aspect = CONFIG.aspectRatio) {
  const p = Math.max(0, Math.min(1.0, progress));

  const z_css = card.z_start + CONFIG.zTravelTotal * p;
  const d_css = CONFIG.perspectiveDistance - z_css;
  const d = d_css * 0.01;
  const hasPassed = d <= 0.4;

  const driftX = (card.xPercent * p / 100) * card.cardWidthCss;
  const x_css = card.localX + driftX;
  const x = x_css * 0.01;

  const baseTravelY = (p - 0.48) * (CONFIG.gridTotalHeight * 1.85);
  const driftY = (card.yPercent * p / 100) * card.cardHeightCss;
  const y_css = card.localY + baseTravelY + driftY;
  const y = y_css * 0.01;

  const view = getViewDims(d, aspect);
  const nx = d > 0.1 ? x / view.halfW : 999;
  const ny = d > 0.1 ? y / view.halfH : 999;

  // Projected width ratio = card screen width / viewport width
  const projWidthRatio = d > 0.1 ? card.cardW / (2 * view.halfW) : 0;
  const projHeightRatio = d > 0.1 ? card.cardH / (2 * view.halfH) : 0;

  // Near lens dissolve (45% to 70%)
  const ss = (a, b, v) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  let lensDissolve = 1.0;
  if (projWidthRatio > 0.45) {
    lensDissolve = 1.0 - ss(0.45, 0.70, projWidthRatio);
  }
  if (d <= 0.4) lensDissolve = 0;

  // Fog factor: far = dark
  let fogFactor = 1.0;
  if (d > CONFIG.fogNear) {
    fogFactor = Math.max(0, 1.0 - (d - CONFIG.fogNear) / (CONFIG.fogFar - CONFIG.fogNear));
  }

  const inFrustum = Math.abs(nx) <= 1.10 && Math.abs(ny) <= 1.10;
  const isVisible = !hasPassed && inFrustum && projWidthRatio >= 0.03 && lensDissolve > 0.01 && fogFactor > 0.01;

  return {
    x,
    y,
    z: z_css * 0.01,
    d,
    nx,
    ny,
    projWidthRatio,
    projHeightRatio,
    lensDissolve,
    fogFactor,
    isVisible,
  };
}

// RUN COMPLETE AUDIT
const cards = buildCardField();
console.log(`Total cards generated: ${cards.length} (${cards.filter(c => c.isReal).length} real, ${cards.filter(c => !c.isReal).length} placeholders)`);

const realCards = cards.filter(c => c.isReal);
const placeholders = cards.filter(c => !c.isReal);

console.log('\n====================================================================================================');
console.log('AUDIT AT HERO MOMENTS p_i');
console.log('====================================================================================================');

const tableData = realCards.map((rc, i) => {
  const p = rc.pTarget;
  const sHero = evalTransform(rc, p);

  const hLeft = sHero.nx - sHero.projWidthRatio;
  const hRight = sHero.nx + sHero.projWidthRatio;
  const hBottom = sHero.ny - sHero.projHeightRatio;
  const hTop = sHero.ny + sHero.projHeightRatio;
  const hArea = (hRight - hLeft) * (hTop - hBottom);

  let maxPhOverlap = 0;
  let countVisiblePh = 0;
  let countLeft = 0;
  let countRight = 0;
  let countAbove = 0;
  let countBelow = 0;

  placeholders.forEach(ph => {
    const sPh = evalTransform(ph, p);
    if (!sPh.isVisible) return;

    countVisiblePh++;
    if (sPh.nx < sHero.nx) countLeft++;
    if (sPh.nx > sHero.nx) countRight++;
    if (sPh.ny > sHero.ny) countAbove++;
    if (sPh.ny < sHero.ny) countBelow++;

    const pLeft = sPh.nx - sPh.projWidthRatio;
    const pRight = sPh.nx + sPh.projWidthRatio;
    const pBottom = sPh.ny - sPh.projHeightRatio;
    const pTop = sPh.ny + sPh.projHeightRatio;

    const interL = Math.max(hLeft, pLeft);
    const interR = Math.min(hRight, pRight);
    const interB = Math.max(hBottom, pBottom);
    const interT = Math.min(hTop, pTop);

    if (interR > interL && interT > interB) {
      const interArea = (interR - interL) * (interT - interB);
      const overlap = interArea / hArea;
      if (overlap > maxPhOverlap) maxPhOverlap = overlap;
    }
  });

  let countOtherProjectsWide = 0;
  realCards.forEach(other => {
    if (other.id === rc.id) return;
    const sOther = evalTransform(other, p);
    if (sOther.isVisible && sOther.projWidthRatio > 0.15) {
      countOtherProjectsWide++;
    }
  });

  const shareAbove = countVisiblePh > 0 ? (countAbove / countVisiblePh) * 100 : 0;

  return {
    Project: rc.title,
    'p_i': p.toFixed(2),
    Side: rc.side,
    nx: sHero.nx.toFixed(2),
    ny: sHero.ny.toFixed(2),
    'Proj Width': (sHero.projWidthRatio * 100).toFixed(1) + '%',
    'PH Overlap': (maxPhOverlap * 100).toFixed(1) + '%',
    'Other Proj >15%': countOtherProjectsWide,
    'Vis PH': countVisiblePh,
    'L/R/Abv/Blw': `${countLeft}/${countRight}/${countAbove}/${countBelow}`,
    'Above % (<45%)': shareAbove.toFixed(1) + '%',
  };
});

console.table(tableData);

console.log('\n--- GLOBAL CHECKS ---');
[0.30, 0.50, 0.70, 0.90].forEach(pTest => {
  const visCount = placeholders.filter(ph => evalTransform(ph, pTest).isVisible).length;
  console.log(`Progress p = ${pTest.toFixed(2)}: ${visCount} visible placeholders (>= 10 required): ${visCount >= 10 ? 'PASS' : 'FAIL'}`);
});

// Check p = 0 start formation
const p0Cards = cards.map(c => evalTransform(c, 0.0)).filter(t => t.d > 0.1);
const p0Nx = p0Cards.map(t => t.nx).filter(nx => Math.abs(nx) < 2);
const p0Ny = p0Cards.map(t => t.ny).filter(ny => Math.abs(ny) < 2);
console.log(`At p = 0: Screen X coverage: [${(Math.min(...p0Nx)*100).toFixed(1)}% to ${(Math.max(...p0Nx)*100).toFixed(1)}%]`);
console.log(`At p = 0: Screen Y range: [${(Math.min(...p0Ny)*100).toFixed(1)}% to ${(Math.max(...p0Ny)*100).toFixed(1)}%] (hugging bottom)`);
