import type { Point } from '@engine/geometry/types'
import type { WallEntity } from '@engine/entities/types'
import { distanceToSegment } from '@engine/geometry/vector'

/** Angle (radians) of the wall segment nearest `pivot`, or `null` if there
 * are no walls at all. Used by "rotación inteligente" (Fase 7) to align an
 * island with the wall it's sitting closest to. */
export function findNearestWallAngle(pivot: Point, walls: WallEntity[]): number | null {
  let best: number | null = null
  let bestDist = Infinity
  for (const wall of walls) {
    for (let i = 0; i < wall.points.length - 1; i++) {
      const a = wall.points[i]
      const b = wall.points[i + 1]
      const d = distanceToSegment(pivot, a, b)
      if (d < bestDist) {
        bestDist = d
        best = Math.atan2(b.y - a.y, b.x - a.x)
      }
    }
  }
  return best
}

/**
 * The smallest rotation that aligns `currentRotation` with `targetAngle`,
 * treating a straight line (and, close enough, an island's rectangular
 * footprint) as symmetric under a 180° flip — snapping to whichever of the
 * wall's two facing directions is closer avoids spinning an island upside
 * down just to match a wall that runs "the other way" along the same line.
 * Always in [-π/2, π/2].
 */
export function smartRotationDelta(currentRotation: number, targetAngle: number): number {
  const wrapToHalfPi = (angle: number) => {
    let a = angle
    while (a > Math.PI / 2) a -= Math.PI
    while (a < -Math.PI / 2) a += Math.PI
    return a
  }
  return wrapToHalfPi(wrapToHalfPi(targetAngle) - wrapToHalfPi(currentRotation))
}
