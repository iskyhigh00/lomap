import type { Point } from '@engine/geometry/types'
import { distance } from '@engine/geometry/vector'

/**
 * Given two points clicked in the blueprint's current world space and the
 * real-world distance they represent, returns the scale multiplier to apply
 * to the blueprint's existing scale so that distance becomes accurate.
 * Pure function — no store/canvas dependency, fully unit-testable.
 */
export function computeCalibrationFactor(pointA: Point, pointB: Point, knownDistance: number): number {
  const currentWorldDistance = distance(pointA, pointB)
  if (currentWorldDistance === 0 || knownDistance <= 0) return 1
  return knownDistance / currentWorldDistance
}
