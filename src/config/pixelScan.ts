/**
 * Pixel Scan Transition Configuration
 * All tunable parameters for grid resolution, scan/burst behavior, sequence timeline and color palettes.
 */

export type PixelScanPalette = 'darkToDark' | 'darkToLight' | 'lightToLight'

export interface TransitionStep {
  type: 'transition'
  from: 'void' | 'about' | 'skills' | 'contact'
  to: 'about' | 'skills' | 'contact'
  mode: 'scan' | 'burst'
  dir?: 1 | -1 // 1: left-to-right, -1: right-to-left
  vh: number
  palette: PixelScanPalette
}

export interface HoldStep {
  type: 'hold'
  screen: 'about' | 'skills' | 'contact'
  vh: number
}

export type SequenceStep = TransitionStep | HoldStep

export const PIXEL_SCAN_CONFIG = {
  // Grid resolution rules: cell = clamp(round(viewportHeight / 28), 20, 48)
  cellMin: 20,
  cellMax: 48,
  cellDivisor: 28,

  // Band geometry: tuned for 60fps target performance
  bandCells: 4,
  jitterCells: 2,
  sparkCells: 2, // sparks just ahead of the edge

  // Reversible flicker quantization: flicker frame = floor(p * 120)
  flickerSteps: 120,

  // Glow visual tuning
  glowBlurPx: 10,
  glowBrightness: 1.4,

  // Staged scroll sequence across the stage sections (starting seamlessly from Projects end)
  sequence: [
    { type: 'hold', screen: 'skills', vh: 110 },
    { type: 'transition', from: 'skills', to: 'about', mode: 'scan', dir: 1, vh: 90, palette: 'darkToDark' },
    { type: 'hold', screen: 'about', vh: 70 },
    { type: 'transition', from: 'about', to: 'contact', mode: 'scan', dir: -1, vh: 90, palette: 'darkToDark' },
    { type: 'hold', screen: 'contact', vh: 70 },
  ] as SequenceStep[],

  // Color palettes:
  // white (#ffffff) first = the hot core; green and yellow are sparse accents (<10% frequency)
  // Keep darkToLight and lightToLight in file for light siteTheme switching.
  palettes: {
    darkToDark: ['#ffffff', '#2fd0ff', '#8fc4ff', '#4d73d9', '#8bff9a', '#ffe45c'],
    darkToLight: ['#ffffff', '#2fd0ff', '#8fc4ff', '#4d73d9', '#8bff9a', '#ffe45c'],
    lightToLight: ['#ffffff', '#2fd0ff', '#101A91', '#4d73d9', '#ffe45c'],
  },
} as const

/**
 * Computes grid cell size based on viewport height.
 */
export function computeCellSize(viewportHeight: number): number {
  const raw = Math.round(viewportHeight / PIXEL_SCAN_CONFIG.cellDivisor)
  return Math.min(Math.max(raw, PIXEL_SCAN_CONFIG.cellMin), PIXEL_SCAN_CONFIG.cellMax)
}

export default PIXEL_SCAN_CONFIG
