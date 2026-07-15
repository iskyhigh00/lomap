import type { DoorEntity, WallEntity } from './types'
import type { Point } from '@engine/geometry/types'
import { pointAtDistance, polylineLength } from '@engine/geometry/vector'

export interface DoorPlacement {
  /** Center of the door opening, in world space. */
  center: Point
  /** Angle of the host wall at this point, in radians. */
  angle: number
}

/** Center + host-wall angle for a door, derived from its host wall's current
 * geometry every time — a door never stores its own position. */
export function resolveDoorPlacement(wall: WallEntity, door: DoorEntity): DoorPlacement {
  const { point, angle } = pointAtDistance(wall.points, door.offset)
  return { center: point, angle }
}

/** Clamps a door's offset so its opening never spills past the host wall's
 * ends (or, for very short walls, centers it). */
export function clampDoorOffset(wall: WallEntity, width: number, offset: number): number {
  const total = polylineLength(wall.points)
  const half = width / 2
  if (total <= width) return total / 2
  return Math.max(half, Math.min(offset, total - half))
}

/** The [start, end) span (as distances along the wall polyline) that this
 * door's opening occupies — used to cut a gap out of the wall's stroke. */
export function doorSpan(door: DoorEntity): { start: number; end: number } {
  return { start: door.offset - door.width / 2, end: door.offset + door.width / 2 }
}
