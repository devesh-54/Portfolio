/**
 * Welcome Scene 3D Object Layout Configuration
 *
 * Let L = the height of one DEVESH letter (0.8)
 * Let W = the width of the whole word (4.48)
 *
 * - DEVESH text centered at x = 0
 * - monitor: height 2.6 L, center x = -0.34 W, z = -1.5 L, yaw +8 degrees
 * - PC tower: height 2.3 L, center x = +0.28 W, z = -1.5 L, yaw -22 degrees (glass side toward camera)
 * - Monitor and tower group centered above the word
 */

export const TEXT_LETTER_HEIGHT = 0.8 // L
export const TEXT_TOTAL_WIDTH = 4.48   // W

export const welcomeLayout = {
  // Foreground right dynamic 3D angle from Fig 2 (facing right, receding back, full name visible)
  text: {
    letterHeight: TEXT_LETTER_HEIGHT,
    wordWidth: TEXT_TOTAL_WIDTH,
    position: [2.38, 0, 1.8] as [number, number, number],
    rotation: [0, (40 * Math.PI) / 180, 0] as [number, number, number],
    scale: 0.9,
  },
  // Mid-left viewport: unpowered matte-black curved monitor angled toward center
  monitor: {
    targetHeight: 2.6 * TEXT_LETTER_HEIGHT, // 2.08
    position: [-1.95, 0, -1.2] as [number, number, number],
    rotation: [0, (8 * Math.PI) / 180, 0] as [number, number, number],
  },
  // Center-right: Gaming PC tower with internal components (clear of monitor collision)
  pcTower: {
    targetHeight: 2.3 * TEXT_LETTER_HEIGHT, // 1.84
    position: [0.82, 0, -1.2] as [number, number, number],
    rotation: [0, (-25 * Math.PI) / 180, 0] as [number, number, number],
  },
  tower: {
    showInternals: true,
    edgeAngle: 32,
    minEdgeLenRatio: 0.015,
    maxSegments: 5000,
    internalInset: 0.06,
    minPartVolumeRatio: 0.005,
  },
}

export default welcomeLayout
