/**
 * flightConfig.ts
 *
 * Central configuration and constants for the Selected Work Depth Flythrough
 * and the Welcome -> Projects handover.
 */

export const FLIGHT_CONFIG = {
  // Pinned scroll distances (in vh) — Monitor Dive hands cleanly into About Me (White)
  DIVE_SCROLL_VH: 78,      // Phase A: dive into curved monitor OLED (78vh)
  STREAM_SCROLL_VH: 24,    // Smooth monitor OLED black -> white handoff beat
  FLIGHT_SCROLL_VH: 0,     // Legacy tunnel retired from hero (moved after Hackathons in #stage)
  TOTAL_SCROLL_VH: 102,    // Total pinned hero scroll (>= 100vh so #stage rests completely off-screen at y=0)

  // Derived progress milestones
  DIVE_END_P: 78 / 102,    // 0.7647 - Camera fills monitor OLED screen
  STREAM_START_P: 78 / 102,// 0.7647 - Begin clean black -> white monitor interior handoff
  HANDOVER_P: 1.0,         // Pure white screen hands seamlessly over to #stage (About Me)
  CORRIDOR_WHITE_START_S: 0.14,
  CORRIDOR_WHITE_END_S: 0.86,
  WHITE_WORLD_P: 0.88,     // Flip header theme dark -> light as screen brightens into About Me

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
    { p: 0.52, side: 'R' as const, nx:  0.42, ny: -0.10 }, // SafeChit
    { p: 0.60, side: 'L' as const, nx: -0.44, ny:  0.10 }, // HireConnect
    { p: 0.68, side: 'R' as const, nx:  0.38, ny: -0.06 }, // Campus-IMS
    { p: 0.76, side: 'L' as const, nx: -0.40, ny:  0.06 }, // DR Detection
    { p: 0.84, side: 'R' as const, nx:  0.44, ny: -0.10 }, // CashPilot
    { p: 0.92, side: 'L' as const, nx: -0.40, ny:  0.05 }, // MediGuard AI
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
