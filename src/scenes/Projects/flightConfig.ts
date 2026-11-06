/**
 * flightConfig.ts
 *
 * Central configuration and constants for the Selected Work Depth Flythrough
 * and the Welcome -> Projects handover.
 */

export const FLIGHT_CONFIG = {
  // Pinned scroll distances (in vh)
  DIVE_SCROLL_VH: 80,      // Phase A: dive into monitor (80vh)
  FLIGHT_SCROLL_VH: 400,   // Phase B: card flight (400vh for smooth tunnel flythrough matching HTML)

  // Derived handover point: fraction of total hero scroll where transition ends and flight begins
  // 80 / (80 + 400) = 80 / 480 = 0.166667...
  HANDOVER_P: 80 / (80 + 400),

  // Camera & Perspective: 100px = 1.0 Three.js unit
  PERSPECTIVE_DISTANCE: 15.0, // 1500px -> 15.0 units
  CAMERA_FOV: 60.0,           // Vertical FOV 60 matching HTML exactly
  CAMERA_Y: -1000,            // Card scene isolated at Y = -1000
  CAMERA_POS: [0, -1000 + 0.6, 15.0] as const,
  CAMERA_TARGET: [0, -1000 - 0.25, 0] as const,

  // Total Z travel for all cards
  Z_TRAVEL_TOTAL: 136.0,
  DEPTH: 126.0,
  GRID_TOTAL_HEIGHT: 900,     // Total grid height in CSS px

  // Grid layout scale (2100px width -> covers roughly +-45% of viewport width at bottom edge)
  GRID_WIDTH_VW: 2.10,

  // Real project cards dimensions & focus geometry
  REAL_CARD_W: 2.40,          // Width of real project plane (240px)
  REAL_CARD_H: 1.50,          // Height (16:10 aspect ratio)
  REAL_CORNER_R: 0.10,        // ~6% of shorter side
  TARGET_PROJ_WIDTH: 0.33,    // 33% projected width at hero moment (Required: 30-36%)
  REAL_FOCUS_DISTANCE: 5.94,  // Distance from camera at focus moment -> projected width 33%

  // Hero Targets (evenly spaced p_i from 0.44 to 0.92, alternating sides)
  HERO_TARGETS: [
    { p: 0.44, side: 'L' as const, nx: -0.38, ny:  0.08 }, // JeevaLink
    { p: 0.52, side: 'R' as const, nx:  0.42, ny: -0.10 }, // ChitGuard
    { p: 0.60, side: 'L' as const, nx: -0.44, ny:  0.10 }, // DR Detection
    { p: 0.68, side: 'R' as const, nx:  0.38, ny: -0.06 }, // CashPilot
    { p: 0.76, side: 'L' as const, nx: -0.40, ny:  0.06 }, // MediGuard AI
    { p: 0.84, side: 'R' as const, nx:  0.44, ny: -0.10 }, // HireConnect
    { p: 0.92, side: 'L' as const, nx: -0.40, ny:  0.05 }, // Campus IMS
  ],

  // Near-lens projected width dissolve (start fading at 45%, fully gone at 70%)
  NEAR_LENS_FADE_START_RATIO: 0.45,
  NEAR_LENS_FADE_END_RATIO: 0.70,

  // Placeholders dimensions
  PH_CARD_W: 1.80,            // 180px
  PH_CARD_H: 1.20,            // 120px (1.5 aspect)
  PH_CORNER_R: 0.08,

  // Fog settings: far = dark silhouettes, hero cards at distance ~5.94 have 0% fog haze
  FOG_COLOR: 0x000000,
  FOG_NEAR: 12.0,
  FOG_FAR: 60.0,

  // Dissolve & Fades
  INTRO_FADE: { start: 0.0, end: 0.06 },   // Cluster fades in out of pitch black
  HEADING_FADE: { start: 0.04, end: 0.12 }, // "Selected work" and hint fade out

  // Lenis smoothing parameter (lerp 0.1 ~ k = 6.0/s)
  LENIS_LERP: 0.1,

  // Visual brightness progression for placeholders
  BRIGHTNESS_START: 0.08,
  BRIGHTNESS_END: 2.0,

  // PRNG seed for deterministic layout
  SEED: 123456,
}
