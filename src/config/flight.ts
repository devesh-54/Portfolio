export interface FlightConfig {
  perspective: number
  columns: number
  columnsMobile: number
  gap: string
  wrapWidth: string
  itemRatio: number
  innerScale: number
  rows: number
  rowsMobile: number
  zStart: [number, number]
  rotXStart: [number, number]
  xPercentEnd: [number, number]
  yPercentEnd: [number, number]
  wrapZEnd: number
  seed: number
  select: {
    minWidthVw: number
    maxWidthVw: number
    minVisibleRatio: number
    maxShade: number
    checkHz: number
  }
}

export const flightConfig: FlightConfig = {
  perspective: 1500,
  columns: 8,
  columnsMobile: 4,
  gap: '2vw',
  wrapWidth: '105%',
  itemRatio: 1.5,
  innerScale: 0.5,
  rows: 6,
  rowsMobile: 3,
  zStart: [-5000, -2000],
  rotXStart: [-65, -25],
  xPercentEnd: [-150, 150],
  yPercentEnd: [-300, 300],
  wrapZEnd: 6500,
  seed: 7,
  select: {
    minWidthVw: 14,
    maxWidthVw: 70,
    minVisibleRatio: 0.7,
    maxShade: 0.35,
    checkHz: 10,
  },
}

export default flightConfig
