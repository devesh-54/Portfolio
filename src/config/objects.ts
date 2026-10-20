/**
 * 3D Objects Configuration for the PS1 Welcome Scene
 * 
 * Objects arranged in a loose triangle around scene origin:
 * 1. Laptop ("01 / 03 Build")
 * 2. Neural Network ("02 / 03 Think")
 * 3. Smartphone ("03 / 03 Ship")
 */

export interface SceneObjectItem {
  id: string
  label: string
  title: string
  subtext: string
  type: 'glb' | 'procedural-neural-net' | 'procedural-laptop' | 'procedural-phone'
  modelUrl?: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number | [number, number, number]
  waypoint: {
    position: [number, number, number]
    target: [number, number, number]
  }
}

export const OBJECTS_CONFIG: SceneObjectItem[] = [
  {
    id: 'laptop',
    label: '01 / 03 Build',
    title: 'FULL-STACK SYSTEMS',
    subtext: 'Robust web architecture, modern toolchains, and scalable services.',
    type: 'procedural-laptop',
    position: [-2.6, 0.0, 0.8],
    rotation: [0, 0.75, 0], // Angled towards viewer & key light
    scale: 2.2, // ~1.5x increased scale for clear presence
    waypoint: {
      position: [-2.1, 0.95, 2.3],
      target: [-2.6, 0.45, 0.8],
    },
  },
  {
    id: 'neural-network',
    label: '02 / 03 Think',
    title: 'DEEP LEARNING & AI',
    subtext: 'Neural architectures, computer vision, and machine intelligence models.',
    type: 'procedural-neural-net',
    position: [0.0, 0.0, -2.4], // Ground position (plinth on floor, net elevated)
    rotation: [0, 0, 0],
    scale: 1.7, // ~1.5x increased scale
    waypoint: {
      position: [0.0, 1.45, -0.6],
      target: [0.0, 1.25, -2.4],
    },
  },
  {
    id: 'smartphone',
    label: '03 / 03 Ship',
    title: 'INTERACTIVE & MOBILE',
    subtext: 'Cross-platform experiences, tactile UX, and real-time 3D graphics.',
    type: 'procedural-phone',
    position: [2.6, 0.0, 0.8],
    rotation: [0, -0.65, 0], // Standing upright, angled towards viewer & center
    scale: 1.8, // ~1.5x increased scale
    waypoint: {
      position: [2.1, 0.95, 2.3],
      target: [2.6, 0.55, 0.8],
    },
  },
]
