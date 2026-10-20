import { LOGOS_CONFIG } from '../../config/logos'

export interface CameraWaypointConfig {
  name: string
  position: [number, number, number]
  target: [number, number, number]
  enabled: boolean
}

/**
 * Helper to compute waypoint for a featured logo:
 * Camera stops about 3.4 units from it, offset along the direction from
 * the cluster center (0,0,0) to that logo, slightly above it (y + 0.4),
 * with the target at the logo position.
 */
export function computeLogoWaypoint(
  position: [number, number, number],
  distance = 3.4,
  yOffset = 0.4
): { position: [number, number, number]; target: [number, number, number] } {
  const [px, py, pz] = position
  const len = Math.sqrt(px * px + py * py + pz * pz) || 1
  const ux = px / len
  const uy = py / len
  const uz = pz / len

  return {
    position: [
      Number((px + ux * distance).toFixed(2)),
      Number((py + uy * distance + yOffset).toFixed(2)),
      Number((pz + uz * distance).toFixed(2)),
    ],
    target: [px, py, pz],
  }
}

/**
 * Builds the complete waypoints array from featured logos (sorted 1, 2, 3),
 * starting far and high and transitioning gracefully to the wide shot.
 */
export function buildWaypointsFromFeaturedLogos(): CameraWaypointConfig[] {
  const featured = [...LOGOS_CONFIG]
    .filter((l) => typeof l.featured === 'number')
    .sort((a, b) => (a.featured || 0) - (b.featured || 0))

  const waypoints: CameraWaypointConfig[] = [
    {
      name: 'Start: High & Far Entry',
      position: [0.0, 6.0, 20.0],
      target: [0.0, 0.0, 0.0],
      enabled: true,
    },
  ]

  featured.forEach((logo) => {
    const wp = computeLogoWaypoint(logo.position, 3.4, 0.4)
    waypoints.push({
      name: `Featured ${logo.featured}: ${logo.label} (${logo.tagline || ''})`,
      position: wp.position,
      target: wp.target,
      enabled: true,
    })
  })

  return waypoints
}
