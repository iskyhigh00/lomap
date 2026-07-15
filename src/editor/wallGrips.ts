import type { Point } from '@engine/geometry/types'
import type { WallEntity } from '@engine/entities/types'
import { distance, midpoint } from '@engine/geometry/vector'

/** Returns the index of the vertex under `point` within `tolerance`, or null. */
export function hitTestWallVertex(wall: WallEntity, point: Point, tolerance: number): number | null {
  for (let i = 0; i < wall.points.length; i++) {
    if (distance(point, wall.points[i]) <= tolerance) return i
  }
  return null
}

/** Returns the segment index under `point` (its midpoint grip) within
 * `tolerance`, or null. Clicking/dragging this grip inserts a new vertex
 * between `points[segmentIndex]` and `points[segmentIndex + 1]`. */
export function hitTestWallMidpoint(wall: WallEntity, point: Point, tolerance: number): number | null {
  for (let i = 0; i < wall.points.length - 1; i++) {
    const mid = midpoint(wall.points[i], wall.points[i + 1])
    if (distance(point, mid) <= tolerance) return i
  }
  return null
}
