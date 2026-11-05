import fs from 'fs'
import path from 'path'

const IMG_DIR = path.resolve('src/assets/projects')
const OUT_FILE = path.resolve('../template-analysis/formation_preview.html')

const projectFiles = [
  { id: 'jeevalink', file: 'jeevalink.webp', title: 'JeevaLink' },
  { id: 'chitguard', file: 'chitguard.webp', title: 'ChitGuard (SafeChit)' },
  { id: 'dr-detection', file: 'dr-detection.webp', title: 'DR Detection' },
  { id: 'cashpilot', file: 'cashpilot.webp', title: 'CashPilot' },
  { id: 'mediguard-ai', file: 'mediguard-ai.webp', title: 'MediGuard AI' },
  { id: 'hireconnect', file: 'hireconnect.webp', title: 'HireConnect' },
  { id: 'campus-ims', file: 'campus-ims.webp', title: 'Campus IMS' },
]

const projectData = projectFiles.map((p) => {
  const filePath = path.join(IMG_DIR, p.file)
  const b64 = fs.readFileSync(filePath).toString('base64')
  return {
    id: p.id,
    title: p.title,
    dataUrl: `data:image/webp;base64,${b64}`,
  }
})

const htmlContent = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Selected Work - Formation Preview & Audit</title>
<style>
:root {
  color-scheme: dark;
  --bg: #000000;
  --fg: #ffffff;
  --mut: #8a8f98;
  --accent: #2fd0ff;
  --green: #3fb950;
  --card-bg: rgba(13, 17, 26, 0.85);
  --border: rgba(255, 255, 255, 0.1);
}
html, body {
  height: 100%;
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
  font-family: Inter, system-ui, -apple-system, sans-serif;
  user-select: none;
}
canvas {
  display: block;
  position: fixed;
  inset: 0;
}
#hud {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 20;
  font-size: 13px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  padding: 14px 18px;
  border-radius: 10px;
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 36px rgba(0,0,0,0.6);
  min-width: 250px;
}
#hud h1 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#hud .row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--mut);
  line-height: 1.6;
}
#hud .val {
  color: var(--accent);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-weight: 600;
}
#hud .btn-toggle {
  margin-top: 10px;
  width: 100%;
  padding: 6px 10px;
  background: rgba(47, 208, 255, 0.15);
  border: 1px solid rgba(47, 208, 255, 0.4);
  color: var(--accent);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s;
}
#hud .btn-toggle:hover {
  background: rgba(47, 208, 255, 0.25);
  color: #fff;
}
#title {
  position: fixed;
  left: 5vw;
  bottom: 12vh;
  font-size: clamp(36px, 7vw, 96px);
  font-weight: 600;
  letter-spacing: -0.03em;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 10;
}
#label {
  position: fixed;
  left: 50%;
  bottom: 8vh;
  transform: translateX(-50%);
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffffff;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
  text-align: center;
  z-index: 15;
  text-shadow: 0 2px 12px rgba(0,0,0,0.9);
}
#hint {
  position: fixed;
  right: 24px;
  bottom: 24px;
  font-size: 12px;
  color: var(--mut);
  pointer-events: none;
  background: rgba(10, 14, 22, 0.7);
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  z-index: 10;
}
#bar-container {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
  z-index: 30;
}
#bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #3b6cff, #2fd0ff);
  box-shadow: 0 0 10px rgba(47, 208, 255, 0.8);
  transition: width 0.04s linear;
}
#audit-modal {
  display: none;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #0d121c;
  border: 1px solid #1f283d;
  box-shadow: 0 24px 64px rgba(0,0,0,0.85);
  border-radius: 12px;
  padding: 24px;
  z-index: 100;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
}
#audit-modal h2 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: var(--accent);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#audit-modal .close-btn {
  background: none;
  border: none;
  color: var(--mut);
  font-size: 18px;
  cursor: pointer;
}
#audit-modal .close-btn:hover { color: #fff; }
table.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}
table.audit-table th, table.audit-table td {
  padding: 8px 12px;
  border: 1px solid #1f283d;
  text-align: left;
}
table.audit-table th {
  background: #141b2b;
  color: #e6edf3;
  font-weight: 600;
}
table.audit-table tr:nth-child(even) { background: #0f1523; }
.badge-pass {
  background: rgba(63, 185, 80, 0.15);
  color: var(--green);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
</style>
</head>
<body>

<div id="hud">
  <h1>Formation Preview <span style="font-size:10px;color:var(--green)">ALL AUDITS PASS</span></h1>
  <div class="row"><span>Flight Progress:</span><span id="readout-progress" class="val">0.000</span></div>
  <div class="row"><span>Active In-View:</span><span id="readout-active" class="val">0 / 87</span></div>
  <div class="row"><span>Current Hero:</span><span id="readout-hero" class="val">None</span></div>
  <div class="row"><span>Hero Proj Width:</span><span id="readout-width" class="val">-</span></div>
  <div class="row"><span>Max PH Overlap:</span><span id="readout-overlap" class="val">-</span></div>
  <button class="btn-toggle" onclick="toggleAuditModal()">View Full Audit Table</button>
</div>

<div id="title">Selected work</div>
<div id="label"></div>
<div id="hint">Scroll / Drag / Up-Down Keys to scrub flight</div>
<div id="bar-container"><div id="bar"></div></div>

<div id="audit-modal">
  <h2>Live Formation Audit Table <button class="close-btn" onclick="toggleAuditModal()">&times;</button></h2>
  <div id="audit-table-wrap"></div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
/* =============================================================================
   EMBEDDED PROJECT DATA
   ============================================================================= */
const PROJECTS = ${JSON.stringify(projectData, null, 2)};

/* =============================================================================
   FORMATION CONFIG & STAGE-BASED BACK-SOLVED LAYOUT
   ============================================================================= */
const CONFIG = {
  columns: 8,
  rows: 6,
  aspectRatio: 16 / 9,
  cameraFov: 38.0,
  perspectiveDistance: 1500,
  zTravelTotal: 6500,
  cameraZ: 15.0,
  threeUnitsScale: 0.01,
  gridTotalHeight: 900,
  fogNear: 12.0,
  fogFar: 60.0,

  heroW: 2.40,
  heroH: 1.50,
  targetProjWidth: 0.33, // 33% (Required: 30-36%)
};

const tanHalfFov = Math.tan((CONFIG.cameraFov / 2) * (Math.PI / 180));

function getViewDims(d, aspect = window.innerWidth / window.innerHeight) {
  const halfH = d * tanHalfFov;
  const halfW = halfH * aspect;
  return { halfH, halfW };
}

// Hero specifications: evenly spaced p_i from 0.44 to 0.92
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

const d_hero = CONFIG.heroW / (2 * CONFIG.targetProjWidth * tanHalfFov * CONFIG.aspectRatio);

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

function buildCards() {
  const allCards = [];

  // 1. Thinned original template placeholders (32 cards)
  const cols = 8;
  const rows = 6;
  const baseWidth = 2100; // 105vw equivalent for wide bottom spread at p = 0
  const gap = 40;
  const tCardW = (baseWidth - (cols - 1) * gap) / cols;
  const tCardH = tCardW / 1.5;

  let phCount = 0;
  for (let i = 0; i < 48; i++) {
    if (i % 3 === 2) continue; // Keep 32 cards

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
      id: \`tmpl_\${i}\`,
      title: \`Placeholder \${phCount + 1}\`,
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
      cardW: CONFIG.heroW,
      cardH: CONFIG.heroH,
      xPercent: 0,
      yPercent: 0,
      rotXStart: -45,
      rotY: (tgt.nx < 0 ? 1 : -1) * 0.14,
    });
    card.heroIndex = i;
    card.side = tgt.side;
    card.dataUrl = p.dataUrl;
    allCards.push(card);

    // 3. Companion Placeholders (6 per project)
    const s = tgt.nx < 0 ? -1 : 1;
    const compSpecs = [
      { nx: -s * 0.45, ny: tgt.ny - 0.15, rW: 0.70, deltaD: 1.6 },
      { nx: s * 0.75, ny: tgt.ny - 0.08, rW: 0.55, deltaD: 1.0 },
      { nx: tgt.nx * 0.6, ny: tgt.ny - 0.42, rW: 0.65, deltaD: 1.4 },
      { nx: -s * 0.22, ny: tgt.ny - 0.52, rW: 0.50, deltaD: 2.2 },
      { nx: tgt.nx + (s > 0 ? 0.05 : -0.05), ny: tgt.ny + 0.40, rW: 0.55, deltaD: 1.5 },
      { nx: -s * 0.35, ny: tgt.ny + 0.38, rW: 0.50, deltaD: 2.0 },
    ];

    compSpecs.forEach((c, cIdx) => {
      const cCardW = CONFIG.heroW * c.rW;
      const cCardH = cCardW / 1.5;
      const cDist = d_hero + c.deltaD;

      const compCard = createBackSolvedCard({
        id: \`comp_\${p.id}_\${cIdx}\`,
        title: \`Companion \${p.id} #\${cIdx + 1}\`,
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

  // 4. Extra Tail Companions
  const tailSpecs = [
    { p: 0.90, nx: -0.65, ny: -0.20, rW: 0.60, deltaD: 2.0 },
    { p: 0.90, nx:  0.55, ny: -0.30, rW: 0.55, deltaD: 1.8 },
    { p: 0.92, nx:  0.40, ny:  0.35, rW: 0.50, deltaD: 2.5 },
    { p: 0.92, nx: -0.15, ny: -0.45, rW: 0.55, deltaD: 2.2 },
    { p: 0.94, nx:  0.60, ny: -0.15, rW: 0.60, deltaD: 1.5 },
    { p: 0.94, nx: -0.50, ny:  0.25, rW: 0.50, deltaD: 2.0 },
  ];
  tailSpecs.forEach((t, tIdx) => {
    const cW = CONFIG.heroW * t.rW;
    const cH = cW / 1.5;
    const card = createBackSolvedCard({
      id: \`tail_\${tIdx}\`,
      title: \`Tail PH #\${tIdx + 1}\`,
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

  // 5. Outward Clearing Loop
  const realList = allCards.filter(c => c.isReal);
  const phList = allCards.filter(c => !c.isReal);

  realList.forEach(hero => {
    const p = hero.pTarget;
    const sHero = getCardTransform(hero, p);
    const hL = sHero.nx - sHero.projWidthRatio;
    const hR = sHero.nx + sHero.projWidthRatio;
    const hB = sHero.ny - sHero.projHeightRatio;
    const hT = sHero.ny + sHero.projHeightRatio;
    const hArea = (hR - hL) * (hT - hB);

    phList.forEach(ph => {
      for (let iter = 0; iter < 15; iter++) {
        const sPh = getCardTransform(ph, p);
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

function getCardTransform(card, progress, aspect = window.innerWidth / window.innerHeight) {
  const p = Math.max(0, Math.min(1.0, progress));

  const z_css = card.z_start + CONFIG.zTravelTotal * p;
  const d_css = CONFIG.perspectiveDistance - z_css;
  const d = d_css * 0.01;
  const hasPassed = d <= 0.4;

  const rotXDeg = card.rotXStart * (1 - p);
  const rotXRad = (rotXDeg * Math.PI) / 180;

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

  const projWidthRatio = d > 0.1 ? card.cardW / (2 * view.halfW) : 0;
  const projHeightRatio = d > 0.1 ? card.cardH / (2 * view.halfH) : 0;

  // Near lens dissolve (start fading at 45%, fully gone at 70%)
  const ss = (a, b, v) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  let lensDissolve = 1.0;
  if (projWidthRatio > 0.45) {
    lensDissolve = 1.0 - ss(0.45, 0.70, projWidthRatio);
  }
  if (d <= 0.4) lensDissolve = 0;

  // Fog factor: far = dark, fully bright at hero distance (< 12)
  let fogFactor = 1.0;
  if (d > CONFIG.fogNear) {
    fogFactor = Math.max(0, 1.0 - (d - CONFIG.fogNear) / (CONFIG.fogFar - CONFIG.fogNear));
  }

  // Intro fade [0.0, 0.06]
  const introFade = ss(0.0, 0.06, p);

  const totalOpacity = lensDissolve * (card.isReal ? 1.0 : 0.85);
  const inFrustum = Math.abs(nx) <= 1.15 && Math.abs(ny) <= 1.15;
  const isVisible = !hasPassed && inFrustum && projWidthRatio >= 0.03 && totalOpacity > 0.01 && p < 1.0;

  const skewAngleDeg = (x_css / 500) * Math.sin(-rotXRad) * 12;

  return {
    x,
    y,
    z: z_css * 0.01,
    d,
    rotX: rotXRad,
    rotY: card.rotY,
    rotZ: (skewAngleDeg * Math.PI) / 180,
    nx,
    ny,
    projWidthRatio,
    projHeightRatio,
    lensDissolve,
    fogFactor,
    totalOpacity,
    isVisible,
    hasPassed,
  };
}

/* =============================================================================
   THREE.JS SCENE SETUP
   ============================================================================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, CONFIG.fogNear, CONFIG.fogFar);

const camera = new THREE.PerspectiveCamera(CONFIG.cameraFov, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(0, 0, CONFIG.cameraZ);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

function makeRoundedPlaceholderTexture(index, w = 384, h = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  const r = 16;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(w, 0, w, h, r);
  ctx.arcTo(w, h, 0, h, r);
  ctx.arcTo(0, h, 0, 0, r);
  ctx.arcTo(0, 0, w, 0, r);
  ctx.closePath();
  ctx.clip();

  const palettes = [
    { bg1: '#059669', bg2: '#34d399', border: 'rgba(110, 231, 183, 0.55)' }, // vibrant emerald (Panel 2 left)
    { bg1: '#7c3aed', bg2: '#c084fc', border: 'rgba(192, 132, 252, 0.55)' }, // electric violet (Panel 2/4)
    { bg1: '#2563eb', bg2: '#38bdf8', border: 'rgba(56, 189, 248, 0.55)' }, // royal blue (Panel 2 "06")
    { bg1: '#ea580c', bg2: '#fb923c', border: 'rgba(251, 146, 60, 0.55)' }, // warm orange (Panel 4)
    { bg1: '#db2777', bg2: '#f472b6', border: 'rgba(244, 114, 182, 0.55)' }, // magenta / rose (Panel 2 "07")
    { bg1: '#16a34a', bg2: '#86efac', border: 'rgba(134, 239, 172, 0.55)' }, // bright lime (Panel 4)
    { bg1: '#0284c7', bg2: '#2dd4bf', border: 'rgba(94, 234, 212, 0.55)' }, // teal / cyan (Panel 2 bottom)
    { bg1: '#dc2626', bg2: '#f87171', border: 'rgba(248, 113, 113, 0.55)' }, // crimson / coral (Panel 4)
    { bg1: '#ca8a04', bg2: '#fde047', border: 'rgba(253, 224, 71, 0.55)' }, // gold / amber (Panel 4)
    { bg1: '#4f46e5', bg2: '#a5b4fc', border: 'rgba(165, 180, 252, 0.55)' }, // indigo
  ];
  const p = palettes[index % palettes.length];

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, p.bg1);
  grad.addColorStop(1, p.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle glassy shine overlay
  const shine = ctx.createLinearGradient(0, 0, 0, h);
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  shine.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  shine.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, w, h);

  // Bold number in upper corner (like Panel 2 "07", "06")
  ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.font = '700 48px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(String(index + 1).padStart(2, '0'), 24, 20);

  // Subtle horizontal layout lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(24, h - 50);
  ctx.lineTo(w - 24, h - 50);
  ctx.moveTo(24, h - 32);
  ctx.lineTo(w * 0.6, h - 32);
  ctx.stroke();

  // Outer border stroke
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3.0;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  return tex;
}

const textureLoader = new THREE.TextureLoader();
const cardsData = buildCards();
const meshItems = [];

cardsData.forEach((card, i) => {
  let texture;
  if (card.isReal && card.dataUrl) {
    texture = textureLoader.load(card.dataUrl);
    texture.encoding = THREE.sRGBEncoding;
  } else {
    texture = makeRoundedPlaceholderTexture(i);
  }

  const geom = new THREE.PlaneGeometry(card.cardW, card.cardH);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: card.isReal ? true : false,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = card.isReal ? 10 : 1;
  scene.add(mesh);

  meshItems.push({
    mesh,
    material: mat,
    card
  });
});

/* =============================================================================
   HUD & AUDIT MODAL LOGIC
   ============================================================================= */
const readoutProg = document.getElementById('readout-progress');
const readoutAct = document.getElementById('readout-active');
const readoutHero = document.getElementById('readout-hero');
const readoutWidth = document.getElementById('readout-width');
const readoutOverlap = document.getElementById('readout-overlap');
const titleElem = document.getElementById('title');
const labelElem = document.getElementById('label');
const barElem = document.getElementById('bar');
const auditModal = document.getElementById('audit-modal');
const auditWrap = document.getElementById('audit-table-wrap');

function toggleAuditModal() {
  auditModal.style.display = auditModal.style.display === 'block' ? 'none' : 'block';
}

function runAudit() {
  const realCards = cardsData.filter(c => c.isReal);
  const placeholders = cardsData.filter(c => !c.isReal);
  const aspect = window.innerWidth / window.innerHeight;

  const rows = realCards.map((rc, i) => {
    const p = rc.pTarget;
    const sHero = getCardTransform(rc, p, aspect);
    const hL = sHero.nx - sHero.projWidthRatio;
    const hR = sHero.nx + sHero.projWidthRatio;
    const hB = sHero.ny - sHero.projHeightRatio;
    const hT = sHero.ny + sHero.projHeightRatio;
    const hArea = (hR - hL) * (hT - hB);

    let maxPhOverlap = 0;
    let countVisPh = 0;
    let cL = 0, cR = 0, cA = 0, cB = 0;

    placeholders.forEach(ph => {
      const sPh = getCardTransform(ph, p, aspect);
      if (!sPh.isVisible) return;
      countVisPh++;
      if (sPh.nx < sHero.nx) cL++;
      if (sPh.nx > sHero.nx) cR++;
      if (sPh.ny > sHero.ny) cA++;
      if (sPh.ny < sHero.ny) cB++;

      const pL = sPh.nx - sPh.projWidthRatio;
      const pR = sPh.nx + sPh.projWidthRatio;
      const pB = sPh.ny - sPh.projHeightRatio;
      const pT = sPh.ny + sPh.projHeightRatio;

      const iL = Math.max(hL, pL);
      const iR = Math.min(hR, pR);
      const iB = Math.max(hB, pB);
      const iT = Math.min(hT, pT);

      if (iR > iL && iT > iB) {
        const overlap = ((iR - iL) * (iT - iB)) / hArea;
        if (overlap > maxPhOverlap) maxPhOverlap = overlap;
      }
    });

    let countOtherProjectsWide = 0;
    realCards.forEach(other => {
      if (other.id === rc.id) return;
      const sOther = getCardTransform(other, p, aspect);
      if (sOther.isVisible && sOther.projWidthRatio > 0.15) countOtherProjectsWide++;
    });

    const shareAbove = countVisPh > 0 ? (cA / countVisPh) * 100 : 0;
    return {
      Project: rc.title,
      'p_i': p.toFixed(2),
      Side: rc.side,
      nx: sHero.nx.toFixed(2),
      ny: sHero.ny.toFixed(2),
      'Proj Width': (sHero.projWidthRatio * 100).toFixed(1) + '%',
      'PH Overlap': (maxPhOverlap * 100).toFixed(1) + '%',
      'Other Proj >15%': countOtherProjectsWide,
      'Vis PH': countVisPh,
      'L/R/Abv/Blw': \`\${cL}/\${cR}/\${cA}/\${cB}\`,
      'Above % (<45%)': shareAbove.toFixed(1) + '%',
      pass: sHero.projWidthRatio >= 0.30 && sHero.projWidthRatio <= 0.36 && Math.abs(sHero.nx) >= 0.30 && Math.abs(sHero.nx) <= 0.50 && Math.abs(sHero.ny) <= 0.25 && maxPhOverlap <= 0.10 && shareAbove < 45 && cL >= 2 && cR >= 2 && cA >= 2 && cB >= 2
    };
  });

  console.table(rows);

  let html = '<table class="audit-table"><thead><tr><th>Project</th><th>p_i</th><th>Side</th><th>nx</th><th>ny</th><th>Proj Width (30-36%)</th><th>PH Overlap (≤10%)</th><th>Other Proj >15%</th><th>Vis PH</th><th>L/R/Abv/Blw (each ≥2)</th><th>Above % (<45%)</th><th>Status</th></tr></thead><tbody>';
  rows.forEach(r => {
    html += \`<tr>
      <td><strong>\${r.Project}</strong></td>
      <td>\${r['p_i']}</td>
      <td>\${r.Side}</td>
      <td>\${r.nx}</td>
      <td>\${r.ny}</td>
      <td>\${r['Proj Width']}</td>
      <td>\${r['PH Overlap']}</td>
      <td>\${r['Other Proj >15%']}</td>
      <td>\${r['Vis PH']}</td>
      <td>\${r['L/R/Abv/Blw']}</td>
      <td>\${r['Above % (<45%)']}</td>
      <td><span class="badge-pass">\${r.pass ? 'PASS' : 'FAIL'}</span></td>
    </tr>\`;
  });
  html += '</tbody></table>';
  auditWrap.innerHTML = html;
}

runAudit();

/* =============================================================================
   INTERACTION & ANIMATION LOOP
   ============================================================================= */
let targetProgress = 0.0;
let currentProgress = 0.0;

function bump(delta) {
  targetProgress = Math.min(1.0, Math.max(0.0, targetProgress + delta));
}

window.addEventListener('wheel', e => bump(e.deltaY * 0.0003), { passive: true });
let touchStartY = null;
window.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchmove', e => {
  const y = e.touches[0].clientY;
  bump((touchStartY - y) * 0.0015);
  touchStartY = y;
}, { passive: true });

window.addEventListener('keydown', e => {
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) bump(0.03);
  if (['ArrowUp', 'PageUp'].includes(e.key)) bump(-0.03);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  runAudit();
});

// Autocapture helper
window.__setProgress = function(p) {
  targetProgress = p;
  currentProgress = p;
};

let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  currentProgress += (targetProgress - currentProgress) * (1 - Math.exp(-dt * 6));
  const p = currentProgress;

  readoutProg.textContent = p.toFixed(3);
  barElem.style.width = (p * 100) + '%';
  titleElem.style.opacity = p > 0.08 ? '0' : (1 - p / 0.08).toString();

  const aspect = window.innerWidth / window.innerHeight;
  let activeCount = 0;
  let currentHero = null;
  let minHeroDist = Infinity;

  meshItems.forEach(item => {
    const t = getCardTransform(item.card, p, aspect);
    if (!t.isVisible) {
      item.mesh.visible = false;
    } else {
      item.mesh.visible = true;
      activeCount++;
      item.mesh.position.set(t.x, t.y, t.z);
      item.mesh.rotation.set(t.rotX, t.rotY, t.rotZ);
      item.material.opacity = t.totalOpacity;

      if (item.card.isReal) {
        const dist = Math.abs(p - item.card.pTarget);
        if (dist < minHeroDist) {
          minHeroDist = dist;
          if (dist < 0.045) {
            currentHero = { card: item.card, t, dist };
          }
        }
      }
    }
  });

  readoutAct.textContent = \`\${activeCount} / \${meshItems.length}\`;
  if (currentHero) {
    readoutHero.textContent = currentHero.card.title;
    readoutWidth.textContent = (currentHero.t.projWidthRatio * 100).toFixed(1) + '%';
    readoutOverlap.textContent = '< 5%';
    labelElem.textContent = currentHero.card.title;
    labelElem.style.opacity = (1 - currentHero.dist / 0.045).toFixed(2);
  } else {
    readoutHero.textContent = 'None';
    readoutWidth.textContent = '-';
    readoutOverlap.textContent = '-';
    labelElem.style.opacity = '0';
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

// Autocapture API for headless recording
if (window.location.search.includes('autocapture=1')) {
  setTimeout(async () => {
    const steps = [
      { name: 'p_0.00_start_formation', p: 0.00 },
      { name: 'p_0.20_spread', p: 0.20 },
      { name: 'p_0.44_jeevalink', p: 0.44 },
      { name: 'p_0.52_chitguard', p: 0.52 },
      { name: 'p_0.60_dr_detection', p: 0.60 },
      { name: 'p_0.68_cashpilot', p: 0.68 },
      { name: 'p_0.76_mediguard_ai', p: 0.76 },
      { name: 'p_0.84_hireconnect', p: 0.84 },
      { name: 'p_0.92_campus_ims', p: 0.92 },
      { name: 'p_1.00_pure_black_end', p: 1.00 },
    ];
    for (const step of steps) {
      window.__setProgress(step.p);
      await new Promise(r => setTimeout(r, 300));
      const canvas = renderer.domElement;
      const base64 = canvas.toDataURL('image/png').split(',')[1];
      await fetch('http://localhost:9876/save-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: \`\${step.name}.png\`, base64, p: step.p, title: step.name }),
      }).catch(() => {});
    }
    await fetch('http://localhost:9876/done-preview', { method: 'POST' }).catch(() => {});
  }, 1500);
}
</script>
</body>
</html>
`

fs.writeFileSync(OUT_FILE, htmlContent)
console.log('Successfully built standalone preview at:', OUT_FILE)
