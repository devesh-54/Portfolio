import { Fragment, useEffect, useRef } from 'react'
import { PageShell } from '../ui/PageShell'
import { site } from '../config/site'
import portraitImg from '../assets/about-portrait.png'
import './About.css'

export interface AboutProps {
  embedded?: boolean
  stageMode?: boolean
}

interface MosaicTile {
  sx: number
  sy: number
  sw: number
  sh: number
  col: number
  row: number
  order: number
  jitterX: number
  jitterY: number
  entryDx: number
  entryDy: number
  entryRot: number
  entryScale: number
  entryLift: number
  scatterOrder: number
  scatterDx: number
  scatterDy: number
  scatterRot: number
}

interface CachedMosaic {
  src: string
  cols: number
  rows: number
  natW: number
  natH: number
  sourceCanvas: HTMLCanvasElement
  tiles: MosaicTile[]
}

interface CachedPartRef {
  el: HTMLElement
  startX: number
  startY: number
  order: number
  scatterX: number
  scatterY: number
  scatterRot: number
  scatterOrder: number
}

interface StageDomCache {
  parts: CachedPartRef[]
  imgEl: HTMLImageElement | null
  canvasEl: HTMLCanvasElement | null
  stageW: number
  stageH: number
  destLeft: number
  destTop: number
  cellW: number
  cellH: number
  dpr: number
}

interface PlaybackState {
  state: 'idle' | 'playing' | 'reversing' | 'done'
  rafId: number | null
  currentP: number
  lastTime: number
}

const MOSAIC_COLS = 30
const MOSAIC_ROWS = 36
const FORMATION_DURATION_MS = 3200
const REVERSE_DURATION_MS = 2400
const mosaicCache = new WeakMap<HTMLElement, CachedMosaic>()
const domCache = new WeakMap<HTMLElement, StageDomCache>()
const playbackCache = new WeakMap<HTMLElement, PlaybackState>()

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function hash2(c: number, r: number): number {
  const n = Math.sin(c * 127.1 + r * 311.7) * 43758.5453123
  return n - Math.floor(n)
}

function buildMosaicCache(stageEl: HTMLElement, imgEl: HTMLImageElement): CachedMosaic | null {
  if (!imgEl.complete || imgEl.naturalWidth === 0 || imgEl.naturalHeight === 0) return null
  const existing = mosaicCache.get(stageEl)
  const key = imgEl.dataset.defringedSrc || imgEl.currentSrc
  if (existing && existing.src === key && existing.natW === imgEl.naturalWidth) {
    return existing
  }

  const natW = imgEl.naturalWidth
  const natH = imgEl.naturalHeight
  let cleanSource: HTMLImageElement | HTMLCanvasElement = imgEl

  // Defringe semi-transparent white-matte boundary pixels once so dark hair has zero white halo on #03050a
  if (imgEl.dataset.defringed !== '1') {
    const rawCanvas = document.createElement('canvas')
    rawCanvas.width = natW
    rawCanvas.height = natH
    const rCtx = rawCanvas.getContext('2d', { willReadFrequently: true })
    if (rCtx) {
      rCtx.drawImage(imgEl, 0, 0)
      const imgData = rCtx.getImageData(0, 0, natW, natH)
      const d = imgData.data
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3]
        if (a > 0 && a < 248) {
          const alpha = a / 255
          const whiteContrib = 255 * (1 - alpha)
          d[i] = Math.max(0, Math.min(255, Math.round((d[i] - whiteContrib) / alpha)))
          d[i + 1] = Math.max(0, Math.min(255, Math.round((d[i + 1] - whiteContrib) / alpha)))
          d[i + 2] = Math.max(0, Math.min(255, Math.round((d[i + 2] - whiteContrib) / alpha)))
          if (a < 90) {
            d[i + 3] = Math.round(a * (a / 90))
          }
        }
      }
      rCtx.putImageData(imgData, 0, 0)
      cleanSource = rawCanvas
      imgEl.dataset.defringed = '1'
      try {
        const cleanUrl = rawCanvas.toDataURL('image/png')
        imgEl.dataset.defringedSrc = cleanUrl
        imgEl.src = cleanUrl
      } catch {
        // Ignore if tainted canvas in exotic setups
      }
    }
  }

  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = natW
  sourceCanvas.height = natH
  const pCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!pCtx) return null
  // Draw clean source so per-frame mosaic animation matches settled <img> with zero tonal jump
  pCtx.drawImage(cleanSource, 0, 0)

  const sw = natW / MOSAIC_COLS
  const sh = natH / MOSAIC_ROWS
  const tiles: MosaicTile[] = []

  for (let r = 0; r < MOSAIC_ROWS; r++) {
    for (let c = 0; c < MOSAIC_COLS; c++) {
      const sx = Math.floor(c * sw)
      const sy = Math.floor(r * sh)
      const w = Math.max(1, Math.ceil((c + 1) * sw) - sx)
      const h = Math.max(1, Math.ceil((r + 1) * sh) - sy)

      const data = pCtx.getImageData(sx, sy, w, h).data
      let hasVisible = false
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] > 14) {
          hasVisible = true
          break
        }
      }
      if (!hasVisible) continue

      // Organic 360-degree radial constellation cloud (matches the realistic multi-directional physics of the text shards)
      const normR = r / Math.max(1, MOSAIC_ROWS - 1)
      const normC = c / Math.max(1, MOSAIC_COLS - 1)
      const dxCenter = normC - 0.5
      const dyCenter = normR - 0.5
      const baseAngle = Math.atan2(dyCenter, dxCenter)
      const radialDist = clamp01(Math.hypot(dxCenter, dyCenter) * 1.45)

      const hA = hash2(c * 17 + 5, r * 13 + 11)
      const hB = hash2(r * 23 + 7, c * 19 + 3)
      const hC = hash2(c * 29 + 31, r * 37 + 17)
      const hD = hash2(r * 41 + 19, c * 43 + 23)

      // Entry gathering: tight, refined 360° cloud closely hugging the card footprint
      const entryAngle = baseAngle + (hA - 0.5) * Math.PI * 1.25
      const entryDist = 42 + hB * 92 + radialDist * 26
      const entryDx = Math.cos(entryAngle) * entryDist
      const entryDy = Math.sin(entryAngle) * entryDist + (hC - 0.5) * 18
      const entryRot = (hC - 0.5) * 1.8
      const entryScale = 0.42 + hD * 0.28
      const entryLift = (hA - 0.5) * 14

      // Organic stochastic + center-outward arrival order (no rigid vertical curtain wall)
      const order = clamp01(radialDist * 0.34 + hB * 0.54 + hD * 0.12)

      // Exit scatter: tight, controlled 360° outward dispersion + subtle tumble rotation
      const exitAngle = baseAngle + (hC - 0.5) * Math.PI * 1.25
      const exitDist = 52 + hA * 108 + radialDist * 30
      const exitDx = Math.cos(exitAngle) * exitDist
      const exitDy = Math.sin(exitAngle) * exitDist - 10 + (hB - 0.5) * 18
      const exitRot = (hD - 0.5) * 2.1
      const scatterOrder = clamp01((1 - radialDist) * 0.34 + hD * 0.54 + hA * 0.12)

      tiles.push({
        sx,
        sy,
        sw: w,
        sh: h,
        col: c,
        row: r,
        order,
        jitterX: (hA - 0.5) * 12,
        jitterY: (hB - 0.5) * 14,
        entryDx,
        entryDy,
        entryRot,
        entryScale,
        entryLift,
        scatterOrder,
        scatterDx: exitDx,
        scatterDy: exitDy,
        scatterRot: exitRot,
      })
    }
  }

  const cached: CachedMosaic = {
    src: imgEl.dataset.defringedSrc || imgEl.currentSrc,
    cols: MOSAIC_COLS,
    rows: MOSAIC_ROWS,
    natW,
    natH,
    sourceCanvas,
    tiles,
  }
  mosaicCache.set(stageEl, cached)
  return cached
}

function measureStageCache(stageEl: HTMLElement, forceRecompute = false): StageDomCache {
  let cache = domCache.get(stageEl)
  if (!cache) {
    const partNodes = Array.from(stageEl.querySelectorAll<HTMLElement>('.about-part'))
    const parts: CachedPartRef[] = partNodes.map((el, idx) => {
      const order = Number(el.dataset.order ?? '0')
      const shard = Number(el.dataset.shard ?? '0')
      const hA = hash2(idx + 5, Math.round(order * 100) + shard * 7)
      const hB = hash2(idx * 13 + 9, Math.round(order * 200) + 17)
      const hC = hash2(idx + 29, shard + 53)
      // Burst outward toward left/top/bottom edges with per-shard scatter order & rotation
      const outAngle = (hA - 0.5) * Math.PI * 1.45 + Math.PI
      const outDist = 135 + hB * 285
      return {
        el,
        order,
        startX: 168 + (Math.round(order * 100) % 7) * 14,
        startY: shard !== 0 ? shard * 30 : (0.45 - order) * 34,
        scatterX: Math.cos(outAngle) * outDist,
        scatterY: Math.sin(outAngle) * outDist - 36 + shard * 26,
        scatterRot: (hC - 0.5) * 36 + shard * 12,
        scatterOrder: clamp01(hB * 0.68 + (1 - order) * 0.32),
      }
    })
    cache = {
      parts,
      imgEl: stageEl.querySelector<HTMLImageElement>('.about-portrait-img'),
      canvasEl: stageEl.querySelector<HTMLCanvasElement>('.about-portrait-canvas'),
      stageW: 0,
      stageH: 0,
      destLeft: 0,
      destTop: 0,
      cellW: 0,
      cellH: 0,
      dpr: 1,
    }
    domCache.set(stageEl, cache)
  }

  const curW = stageEl.clientWidth
  const curH = stageEl.clientHeight
  const cachedMosaic = cache.imgEl ? buildMosaicCache(stageEl, cache.imgEl) : null

  if (
    forceRecompute ||
    (curW > 10 && (curW !== cache.stageW || curH !== cache.stageH)) ||
    (cachedMosaic && cache.cellW <= 0)
  ) {
    const imgEl = cache.imgEl
    if (imgEl && curW > 10 && curH > 10) {
      const stageR = stageEl.getBoundingClientRect()
      const imgR = imgEl.getBoundingClientRect()
      const natW = imgEl.naturalWidth || 796
      const natH = imgEl.naturalHeight || 995
      const imgAspect = natW / natH
      const boxAspect = imgR.width / Math.max(1, imgR.height)
      const drawW = imgAspect > boxAspect ? imgR.width : imgR.height * imgAspect
      const drawH = imgAspect > boxAspect ? imgR.width / imgAspect : imgR.height

      cache.stageW = stageR.width
      cache.stageH = stageR.height
      cache.destLeft = imgR.left - stageR.left + (imgR.width - drawW) * 0.5
      cache.destTop = imgR.top - stageR.top + (imgR.height - drawH) * 0.5
      cache.cellW = drawW / MOSAIC_COLS
      cache.cellH = drawH / MOSAIC_ROWS
      cache.dpr = Math.min(2, window.devicePixelRatio || 1)

      if (cache.canvasEl) {
        const targetW = Math.round(stageR.width * cache.dpr)
        const targetH = Math.round(stageR.height * cache.dpr)
        if (cache.canvasEl.width !== targetW || cache.canvasEl.height !== targetH) {
          cache.canvasEl.width = targetW
          cache.canvasEl.height = targetH
        }
      }
    }
  }

  return cache
}

/**
 * Autonomously plays forward (`0 -> 1`), reverses (`cur -> 0`), resets, or immediately settles
 * About's tiny-parts formation at a leisurely 60fps pace (~3.2s forward, ~2.4s reverse)
 * so every text shard and cropped monochrome portrait tile reads clearly without fighting scroll speed.
 */
export function triggerAboutFormation(
  stageEl: HTMLElement | null,
  mode: 'play' | 'reverse' | 'reset' | 'settle'
): void {
  if (!stageEl) return
  let pb = playbackCache.get(stageEl)
  if (!pb) {
    pb = { state: 'idle', rafId: null, currentP: 0, lastTime: 0 }
    playbackCache.set(stageEl, pb)
  }

  const cancelExisting = () => {
    if (pb && pb.rafId !== null) {
      cancelAnimationFrame(pb.rafId)
      pb.rafId = null
    }
  }

  if (mode === 'reset') {
    cancelExisting()
    pb.state = 'idle'
    pb.currentP = 0
    applyAboutStageVars(stageEl, 0)
    return
  }

  if (mode === 'settle') {
    cancelExisting()
    pb.state = 'done'
    pb.currentP = 1
    applyAboutStageVars(stageEl, 1)
    return
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  if (isMobile) {
    cancelExisting()
    pb.state = 'done'
    pb.currentP = 1
    applyAboutStageVars(stageEl, 1)
    return
  }

  if (mode === 'reverse') {
    if (pb.state === 'reversing' || (pb.state === 'idle' && pb.currentP <= 0.001)) return
    cancelExisting()
    measureStageCache(stageEl, true)
    pb.state = 'reversing'
    pb.lastTime = performance.now()
    if (pb.currentP <= 0.001) pb.currentP = 1

    const stepReverse = (now: number) => {
      const cur = playbackCache.get(stageEl)
      if (!cur || cur.state !== 'reversing') return
      const dt = Math.min(64, Math.max(0, now - cur.lastTime))
      cur.lastTime = now
      cur.currentP = clamp01(cur.currentP - dt / REVERSE_DURATION_MS)
      // Steady progression; individual fragments already apply smooth easing per tile
      applyAboutStageVars(stageEl, cur.currentP)
      if (cur.currentP > 0) {
        cur.rafId = requestAnimationFrame(stepReverse)
      } else {
        cur.rafId = null
        cur.state = 'idle'
        cur.currentP = 0
        applyAboutStageVars(stageEl, 0)
      }
    }

    pb.rafId = requestAnimationFrame(stepReverse)
    return
  }

  // mode === 'play'
  if (pb.state === 'playing' || pb.state === 'done') return

  cancelExisting()
  measureStageCache(stageEl, true)
  pb.state = 'playing'
  pb.lastTime = performance.now()
  if (pb.currentP < 0.005) pb.currentP = 0.005

  const stepForward = (now: number) => {
    const cur = playbackCache.get(stageEl)
    if (!cur || cur.state !== 'playing') return
    const dt = Math.min(64, Math.max(0, now - cur.lastTime))
    cur.lastTime = now
    cur.currentP = clamp01(cur.currentP + dt / FORMATION_DURATION_MS)
    // Steady progression across 3.2s; each fragment applies smoothstep per piece
    applyAboutStageVars(stageEl, cur.currentP)
    if (cur.currentP < 1) {
      cur.rafId = requestAnimationFrame(stepForward)
    } else {
      cur.rafId = null
      cur.state = 'done'
      cur.currentP = 1
      applyAboutStageVars(stageEl, 1)
    }
  }

  pb.rafId = requestAnimationFrame(stepForward)
}

export function getAboutFormationState(
  stageEl: HTMLElement | null
): 'idle' | 'playing' | 'reversing' | 'done' {
  if (!stageEl) return 'idle'
  return playbackCache.get(stageEl)?.state ?? 'idle'
}

/**
 * Synchronously drives the ordered tiny-parts formation AND the distinct
 * radial/vortex scatter dispersion when exiting into Skills:
 *
 * assembleProgress: 0 -> 1 (tight center diagonal convergence)
 * disperseProgress: 0 -> 1 (outward multi-directional burst + rotation, perimeter-first)
 */
if (typeof window !== 'undefined') {
  ;(window as unknown as { __applyAboutStageVars?: typeof applyAboutStageVars }).__applyAboutStageVars =
    applyAboutStageVars
}

export function applyAboutStageVars(
  stageEl: HTMLElement | null,
  assembleProgress: number,
  disperseProgress = 0
): void {
  if (!stageEl) return

  const A = clamp01(assembleProgress)
  const D = clamp01(disperseProgress)
  stageEl.dataset.assembleP = A.toFixed(4)
  stageEl.dataset.disperseP = D.toFixed(4)

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768
  const effA = isMobile ? 1 : A
  const effD = isMobile ? 0 : D

  const cache = measureStageCache(stageEl, false)

  // 1. Background glow + diagonal capsule accents fade gently in on enter, scatter out early on exit
  const enterDecorT = smoothstep(0.45, 0.94, effA)
  const exitDecorT = effD > 0.001 ? 1 - smoothstep(0.05, 0.55, effD) : 1
  const decorT = enterDecorT * exitDecorT
  stageEl.style.setProperty('--about-decor-op', decorT.toFixed(4))
  const decorTx = effD > 0.001 ? effD * 72 : (1 - enterDecorT) * -42
  stageEl.style.setProperty('--about-decor-tx', `${decorTx.toFixed(2)}px`)

  // 2. Left text fragments
  if (effD > 0.001) {
    // Exit pattern: multi-directional outward burst + subtle tumble rotation (distinct from entry!)
    for (let i = 0; i < cache.parts.length; i++) {
      const item = cache.parts[i]
      const pStart = item.scatterOrder * 0.46
      const rawT = clamp01((effD - pStart) / 0.48)
      const t = rawT * rawT * (2.15 - 1.15 * rawT)

      if (rawT <= 0.002) {
        if (item.el.style.opacity !== '1') item.el.style.opacity = '1'
        if (item.el.style.transform !== 'none') item.el.style.transform = 'none'
      } else if (rawT >= 0.998) {
        if (item.el.style.opacity !== '0') item.el.style.opacity = '0'
      } else {
        const tx = t * item.scatterX
        const ty = t * item.scatterY
        const rot = t * item.scatterRot
        const sc = lerp(1.0, 0.34, t)
        const op = 1 - smoothstep(0.38, 1.0, rawT)
        item.el.style.opacity = op.toFixed(3)
        item.el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${sc.toFixed(3)})`
      }
    }
    const resumeLineExit = 1 - smoothstep(0.0, 0.35, effD)
    stageEl.style.setProperty('--about-resume-line-scale', resumeLineExit.toFixed(4))
  } else {
    // Enter pattern: left text tiny ordered parts sliding cleanly from center stream into editorial lockup
    for (let i = 0; i < cache.parts.length; i++) {
      const item = cache.parts[i]
      const pStart = 0.02 + item.order * 0.56
      const rawT = clamp01((effA - pStart) / 0.36)
      const t = rawT * rawT * (3 - 2 * rawT)

      if (t >= 0.999) {
        if (item.el.style.opacity !== '1') item.el.style.opacity = '1'
        if (item.el.style.transform !== 'none') item.el.style.transform = 'none'
      } else if (t <= 0.002) {
        if (item.el.style.opacity !== '0') item.el.style.opacity = '0'
      } else {
        const tx = (1 - t) * item.startX
        const ty = (1 - t) * item.startY
        const sc = lerp(0.68, 1.0, t)
        const op = smoothstep(0.0, 0.28, rawT)
        item.el.style.opacity = op.toFixed(3)
        item.el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${sc.toFixed(3)})`
      }
    }

    const resumeLineP = smoothstep(0.78, 0.97, effA)
    stageEl.style.setProperty('--about-resume-line-scale', resumeLineP.toFixed(4))
  }

  // 3. Right portrait tiny cropped photographic tiles on full-stage canvas
  const imgEl = cache.imgEl
  const canvasEl = cache.canvasEl

  const imgOp = isMobile
    ? 1
    : effD > 0.001
      ? 1 - smoothstep(0.01, 0.12, effD)
      : smoothstep(0.90, 0.99, effA)
  const canvasOp = isMobile
    ? 0
    : effD > 0.001
      ? effD >= 0.995
        ? 0
        : smoothstep(0.005, 0.06, effD) * (1 - smoothstep(0.86, 0.995, effD))
      : effA <= 0.015 || effA >= 0.995
        ? 0
        : smoothstep(0.015, 0.07, effA) * (1 - smoothstep(0.91, 0.99, effA))

  stageEl.style.setProperty('--about-img-op', imgOp.toFixed(4))
  stageEl.style.setProperty('--about-canvas-op', canvasOp.toFixed(4))

  if (canvasEl) {
    const ctx = canvasEl.getContext('2d')
    if (canvasOp <= 0.002 || !imgEl || !imgEl.complete || imgEl.naturalWidth === 0 || !ctx) {
      if (ctx && canvasEl.width > 0 && canvasEl.height > 0) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
      }
      return
    }

    const cached = buildMosaicCache(stageEl, imgEl)
    if (!cached || cache.cellW <= 0 || cache.stageW < 10) return

    ctx.save()
    ctx.setTransform(cache.dpr, 0, 0, cache.dpr, 0, 0)
    ctx.clearRect(0, 0, cache.stageW, cache.stageH)

    const { destLeft, destTop, cellW, cellH } = cache

    if (effD > 0.001) {
      // Exit scatter pattern: organic 360° outward burst + tumble rotation (mirrors text shards)
      for (let i = 0; i < cached.tiles.length; i++) {
        const tile = cached.tiles[i]
        const tStart = tile.scatterOrder * 0.46
        const rawT = clamp01((effD - tStart) / 0.48)
        if (rawT >= 0.995) continue

        // Smooth organic outward acceleration matching text shards
        const t = rawT * rawT * (2.15 - 1.15 * rawT)
        const targetX = destLeft + tile.col * cellW
        const targetY = destTop + tile.row * cellH

        const curX = targetX + tile.scatterDx * t
        const curY = targetY + tile.scatterDy * t
        const curScale = lerp(1.0, 0.28, t)
        const curRot = tile.scatterRot * t
        const halfW = (cellW * curScale + 0.65) * 0.5
        const halfH = (cellH * curScale + 0.65) * 0.5
        const cx = curX + cellW * 0.5
        const cy = curY + cellH * 0.5

        ctx.globalAlpha = 1 - smoothstep(0.36, 1.0, rawT)
        if (Math.abs(curRot) > 0.01) {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(curRot)
          ctx.drawImage(
            cached.sourceCanvas,
            tile.sx,
            tile.sy,
            tile.sw,
            tile.sh,
            -halfW,
            -halfH,
            halfW * 2,
            halfH * 2
          )
          ctx.restore()
        } else {
          ctx.drawImage(
            cached.sourceCanvas,
            tile.sx,
            tile.sy,
            tile.sw,
            tile.sh,
            cx - halfW,
            cy - halfH,
            halfW * 2,
            halfH * 2
          )
        }
      }
    } else {
      // Entry gathering pattern: organic 360° constellation cloud converging smoothly into the card
      for (let i = 0; i < cached.tiles.length; i++) {
        const tile = cached.tiles[i]
        const tStart = 0.02 + tile.order * 0.52
        const rawT = clamp01((effA - tStart) / 0.42)
        if (rawT <= 0.005) continue

        // Smooth ease-out cubic deceleration (floating in from every direction, snapping cleanly home)
        const inv = 1 - rawT
        const t = 1 - inv * inv * inv

        const targetX = destLeft + tile.col * cellW
        const targetY = destTop + tile.row * cellH

        const startX = targetX + tile.entryDx
        const startY = targetY + tile.entryDy

        const curX = lerp(startX, targetX, t) + Math.sin(rawT * Math.PI) * tile.jitterX
        const curY = lerp(startY, targetY, t) + Math.sin(rawT * Math.PI) * tile.entryLift
        const curScale = lerp(tile.entryScale, 1.0, t)
        const curRot = lerp(tile.entryRot, 0, t)

        const halfW = (cellW * curScale + 0.65) * 0.5
        const halfH = (cellH * curScale + 0.65) * 0.5
        const cx = curX + cellW * 0.5
        const cy = curY + cellH * 0.5

        ctx.globalAlpha = smoothstep(0.0, 0.34, rawT)
        if (Math.abs(curRot) > 0.01) {
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(curRot)
          ctx.drawImage(
            cached.sourceCanvas,
            tile.sx,
            tile.sy,
            tile.sw,
            tile.sh,
            -halfW,
            -halfH,
            halfW * 2,
            halfH * 2
          )
          ctx.restore()
        } else {
          ctx.drawImage(
            cached.sourceCanvas,
            tile.sx,
            tile.sy,
            tile.sw,
            tile.sh,
            cx - halfW,
            cy - halfH,
            halfW * 2,
            halfH * 2
          )
        }
      }
    }

    ctx.restore()
  }
}

/**
 * Cuts a line of text into tiny 2-3 char visual chunks preserving exact word wrapping.
 */
function renderChunkedLine(
  text: string,
  orderBase: number,
  orderSpan: number,
  chunkSize = 3
) {
  const words = text.split(' ')
  const totalChunks = words.reduce((acc, w) => acc + Math.max(1, Math.ceil(w.length / chunkSize)), 0)
  let seen = 0

  return words.map((word, wIdx) => {
    const chunks: string[] = []
    for (let i = 0; i < word.length; i += chunkSize) {
      chunks.push(word.slice(i, i + chunkSize))
    }
    return (
      <Fragment key={`${wIdx}-${word}`}>
        <span className="about-word">
          {chunks.map((chunk, cIdx) => {
            const order = orderBase + (seen / Math.max(1, totalChunks - 1)) * orderSpan
            seen += 1
            return (
              <span
                key={`${cIdx}-${chunk}`}
                className="about-part"
                data-order={order.toFixed(3)}
                data-shard="0"
                aria-hidden="true"
              >
                {chunk}
              </span>
            )
          })}
        </span>
        {wIdx < words.length - 1 ? ' ' : ''}
      </Fragment>
    )
  })
}

export function About({ embedded = false, stageMode = false }: AboutProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const nameChars = site.name.split('')

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const p = !stageMode ? 1 : Number(el.dataset.assembleP ?? '0')
    applyAboutStageVars(el, p)

    const imgEl = el.querySelector<HTMLImageElement>('.about-portrait-img')
    const handleReady = () => {
      const curP = !stageMode ? 1 : Number(el.dataset.assembleP ?? '0')
      applyAboutStageVars(el, curP)
    }
    if (imgEl && !imgEl.complete) {
      imgEl.addEventListener('load', handleReady, { once: true })
    }
    return () => {
      imgEl?.removeEventListener('load', handleReady)
      triggerAboutFormation(el, 'reset')
    }
  }, [stageMode])

  const stageContent = (
    <div ref={stageRef} className={`about-stage ${embedded ? 'about-stage--embedded' : ''}`}>
      {/* Laser Cut Seam Lines (cutting open from center outward & upward on section exit) */}
      <div className="about-cut-frame" aria-hidden="true">
        <div className="about-cut-line about-cut-line--top-left" />
        <div className="about-cut-line about-cut-line--top-right" />
        <div className="about-cut-line about-cut-line--left" />
        <div className="about-cut-line about-cut-line--right" />
        <div className="about-cut-corner about-cut-corner--tl" />
        <div className="about-cut-corner about-cut-corner--tr" />
      </div>

      {/* Subtle ambient backlight + diagonal capsule accents behind portrait */}
      <div className="about-decor" aria-hidden="true">
        <div className="about-glow" />
        <span className="about-streak about-streak--1" />
        <span className="about-streak about-streak--2" />
        <span className="about-streak about-streak--3" />
        <span className="about-dot about-dot--1" />
      </div>

      {/* HiDPI Canvas rendering tiny cropped pieces of the monochrome portrait photo */}
      <canvas className="about-portrait-canvas" aria-hidden="true" />

      <div className="about-grid">
        {/* Left editorial typography lockup sliced into tiny ordered parts */}
        <div className="about-copy">
          <p className="about-greeting" aria-label="Hello, I'm">
            {renderChunkedLine("Hello, I'm", 0.0, 0.14, 2)}
          </p>

          <h2 className="about-name" aria-label={site.name}>
            {nameChars.map((ch, idx) => {
              const charOrder = 0.14 + (idx / Math.max(1, nameChars.length - 1)) * 0.16
              return (
                <span key={`${idx}-${ch}`} className="about-shard-char" aria-hidden="true">
                  <span className="about-shard-sizer">{ch}</span>
                  <span
                    className="about-part about-part--top"
                    data-order={charOrder.toFixed(3)}
                    data-shard="-1"
                  >
                    {ch}
                  </span>
                  <span
                    className="about-part about-part--bot"
                    data-order={(charOrder + 0.025).toFixed(3)}
                    data-shard="1"
                  >
                    {ch}
                  </span>
                </span>
              )
            })}
          </h2>

          <p className="about-role" aria-label={site.role}>
            {renderChunkedLine(site.role, 0.30, 0.18, 2)}
          </p>

          <p className="about-bio-line" aria-label={site.bio[0]}>
            {renderChunkedLine(site.bio[0], 0.48, 0.24, 4)}
          </p>

          <div className="about-meta-row" aria-label="Focus areas and education">
            <span className="about-meta-edu" aria-label={site.education}>
              {renderChunkedLine(site.education, 0.72, 0.14, 4)}
            </span>
            <span className="about-meta-focus" aria-label={site.focus.join(' · ')}>
              {renderChunkedLine(site.focus.join(' · '), 0.84, 0.10, 4)}
            </span>
          </div>

          <div className="about-cta-wrap">
            <a
              href={site.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              download="Devesh_Resume.pdf"
              className="about-resume-link"
              aria-label="Download Resume"
            >
              {renderChunkedLine('Download Resume', 0.92, 0.08, 2)}
              <span className="about-resume-underline" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Right vertically centered portrait / placeholder visual (with 24x30 mosaic tile scatter & join) */}
        <div className="about-visual">
          <img
            src={portraitImg}
            alt={`${site.name} portrait`}
            className="about-portrait-img"
            data-defringed="1"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return stageContent
  }

  return <PageShell title="About - Devesh">{stageContent}</PageShell>
}

export default About
