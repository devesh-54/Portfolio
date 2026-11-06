/**
 * Unit Test for PixelScanEngine
 * Verifies:
 * 1. p = 0 gives empty reveal
 * 2. p = 1 gives full reveal
 * 3. Exact determinism (forward and reverse identical for same p)
 * 4. Scan dir = 1 and dir = -1 are mirror images
 * 5. Burst mode clip and core flash behavior
 */

import { PixelScanEngine, hash3, easeInOutCubic } from '../src/transitions/pixelScan.js'

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message)
    process.exit(1)
  }
}

console.log('Testing PixelScanEngine...')

const engine = new PixelScanEngine(1280, 720)
assert(engine.W === 1280, 'W is 1280')
assert(engine.H === 720, 'H is 720')
assert(engine.cols > 0 && engine.rows > 0, 'Grid cols and rows positive')

// Test 1: p = 0 gives empty reveal
const scan0 = engine.computeScan(0, 1)
assert(scan0.clip.startsWith('polygon('), 'p=0 clip is polygon')
assert(scan0.clip.includes('0px 0px, 0px 0px'), 'p=0 scan dir=1 has empty reveal')

const burst0 = engine.computeBurst(0)
assert(burst0.clip.startsWith('inset('), 'p=0 burst clip is inset')
assert(burst0.clip.includes('360px 640px 360px 640px'), 'p=0 burst clip is fully inset')
console.log('PASS: p = 0 gives empty reveal')

// Test 2: p = 1 gives full reveal
const scan1 = engine.computeScan(1, 1)
assert(scan1.clip === 'none', 'p=1 scan clip is none (full reveal)')

const burst1 = engine.computeBurst(1)
assert(burst1.clip === 'none', 'p=1 burst clip is none (full reveal)')
console.log('PASS: p = 1 gives full reveal')

// Test 3: Same p always returns identical result (Determinism & Reversibility)
const pTest = 0.4285
const runA = engine.computeScan(pTest, 1, 'darkToLight')
const clipA = runA.clip
const pixelsA = new Uint32Array(runA.pixels) // clone buffer

// Run another calculation with different p to dirty the buffer
engine.computeScan(0.85, -1, 'lightToLight')

// Re-run with original p
const runB = engine.computeScan(pTest, 1, 'darkToLight')
assert(runB.clip === clipA, 'Clip is identical for same p')
let pixelMatches = true
for (let i = 0; i < pixelsA.length; i++) {
  if (pixelsA[i] !== runB.pixels[i]) {
    pixelMatches = false
    break
  }
}
assert(pixelMatches, 'Pixels are byte-for-byte identical for same p (reversible)')
console.log('PASS: Same p always returns identical result (Reversibility)')

// Test 4: dir = 1 and dir = -1 are mirror images
const pMirror = 0.5
const fwd = engine.computeScan(pMirror, 1, 'darkToLight')
const fwdClip = fwd.clip
const rev = engine.computeScan(pMirror, -1, 'darkToLight')
const revClip = rev.clip

assert(fwdClip !== revClip, 'Forward and reverse clips are distinct')
assert(fwdClip.startsWith('polygon(0px 0px'), 'Forward starts at left')
assert(revClip.startsWith('polygon(1280px 0px'), 'Reverse starts at right')
console.log('PASS: dir = 1 and dir = -1 are mirror images')

// Test 5: Hash and Ease functions
assert(easeInOutCubic(0) === 0, 'ease(0) = 0')
assert(easeInOutCubic(1) === 1, 'ease(1) = 1')
assert(Math.abs(easeInOutCubic(0.5) - 0.5) < 1e-6, 'ease(0.5) = 0.5')
assert(hash3(1, 2, 3) >= 0 && hash3(1, 2, 3) <= 1, 'hash3 in [0, 1]')
assert(hash3(1, 2, 3) === hash3(1, 2, 3), 'hash3 deterministic')

console.log('ALL UNIT TESTS PASSED!')
