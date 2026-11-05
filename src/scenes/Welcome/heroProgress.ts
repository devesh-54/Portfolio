/**
 * Module-level store for hero scroll progress (0..1)
 * Updated on ScrollTrigger scrub, read per-frame by ScreenDive without triggering React renders.
 */
export const heroProgress = {
  value: 0,
  activeProjectTitle: '',
  activeProjectOpacity: 0,
  get() {
    return this.value
  },
  set(v: number) {
    this.value = v
  },
  debug: {
    rawProgress: 0,
    smoothedP: 0,
    e: 0,
    externalPoseActive: false,
    canvasVisibility: 'visible',
    frameloop: 'always',
    overlayOpacity: '0',
    flightP: 0,
    activeCards: 0,
    screenColorHex: '#000000',
    heroBgColor: '#03050a',
    cameraPos: [0, 0, 0] as [number, number, number],
    distToEnd: 0,
  },
}

export default heroProgress
