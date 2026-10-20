/**
 * PS1 Configuration & Tuning
 * 
 * Central config for all retro PlayStation 1 rendering techniques:
 * 1. Low-res internal rendering (scaled down & upscaled with nearest-neighbor)
 * 2. Vertex snapping (clip-space coordinate quantization / wobble)
 * 3. Affine texture warping (non-perspective-correct texture swimming)
 * 4. Nearest-neighbor 64x64 textures
 * 5. Simple lighting (flat/diffuse, 1 cool ambient + 1 warm directional)
 * 6. 15-bit color quantization + 4x4 Bayer ordered dithering
 * 7. Foggy paper void (short & heavy fog with no visible horizon)
 */

export type Ps1QualityPreset = 'crunchy' | 'balanced' | 'clean'

export interface Ps1PresetSettings {
  resolutionScale: number
  snapResolution: [number, number]
  colorSteps: number
}

export const PS1_PRESETS: Record<Ps1QualityPreset, Ps1PresetSettings> = {
  crunchy: {
    resolutionScale: 0.35,
    snapResolution: [160, 120],
    colorSteps: 32.0, // 5-bit color (32 steps per channel)
  },
  balanced: {
    resolutionScale: 0.5,
    snapResolution: [320, 240], // Reduced snap strength so shapes stay readable with authentic subtle wobble
    colorSteps: 32.0,
  },
  clean: {
    resolutionScale: 0.75,
    snapResolution: [640, 480],
    colorSteps: 48.0,
  },
}

export interface Ps1Config {
  activePreset: Ps1QualityPreset
  resolutionScale: number

  // Vertex wobble / snapping
  snapEnabled: boolean
  snapResolution: [number, number]

  // Affine texture warping
  affineEnabled: boolean

  // Color quantization & 4x4 Bayer dithering
  ditherEnabled: boolean
  colorSteps: number

  // Foggy void background
  fog: {
    color: string
    near: number
    far: number
  }

  // Palette: cream #f2f1ed, ink blue #1a1f9c, dark navy #0f1250, plus ONE warm accent (orange #ff7a3d)
  palette: {
    paper: string
    ink: string
    navy: string
    accent: string
    inkLight: string
  }

  // Lighting: Cool ambient + Warm directional
  lighting: {
    ambientColor: string
    ambientIntensity: number
    directionalColor: string
    directionalIntensity: number
    directionalPosition: [number, number, number]
  }
}

export const PS1_CONFIG: Ps1Config = {
  activePreset: 'balanced',
  resolutionScale: PS1_PRESETS.balanced.resolutionScale,

  snapEnabled: true,
  snapResolution: PS1_PRESETS.balanced.snapResolution,

  affineEnabled: true,

  ditherEnabled: true,
  colorSteps: PS1_PRESETS.balanced.colorSteps,

  // Seamless paper void: fog far is 15.0, ground is 200x200 + vertex fade, edge is never visible
  fog: {
    color: '#f2f1ed',
    near: 3.0,
    far: 15.0,
  },

  palette: {
    paper: '#f2f1ed',
    ink: '#1a1f9c',
    navy: '#0f1250',
    accent: '#ff7a3d',
    inkLight: '#4d54cf',
  },

  lighting: {
    ambientColor: '#dbe4f4', // Cool blue ambient
    ambientIntensity: 0.75,
    directionalColor: '#fff3e0', // Warm sunlight directional
    directionalIntensity: 1.35,
    directionalPosition: [6, 12, 5],
  },
}

/**
 * Helper to update PS1_CONFIG with a given preset
 */
export function applyQualityPreset(preset: Ps1QualityPreset) {
  const settings = PS1_PRESETS[preset]
  PS1_CONFIG.activePreset = preset
  PS1_CONFIG.resolutionScale = settings.resolutionScale
  PS1_CONFIG.snapResolution = settings.snapResolution
  PS1_CONFIG.colorSteps = settings.colorSteps
}
