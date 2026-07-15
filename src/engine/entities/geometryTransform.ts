import type { GenericEntity, PerimeterEntity, WallEntity, ZoneEntity } from './types'
import type { Point } from '@engine/geometry/types'
import { angleBetween, rotate } from '@engine/geometry/vector'
import { mirrorPoint } from '@engine/geometry/lineOps'

/**
 * Every entity is one of three kinds, and moving/rotating it must go through
 * the matching branch below or it silently no-ops:
 *
 * - **Transform-anchored** (pillar, machine, island, and other point-props):
 *   `transform.x/y/rotation` *is* the entity's position/orientation. Its
 *   shape is defined in local space around that anchor.
 * - **Geometry-anchored** (zone, perimeter, wall): the entity's own `points`
 *   *are* its complete position — every renderer and hit-test reads them
 *   directly and never applies `transform`. For these types `transform`
 *   stays at `IDENTITY_TRANSFORM` permanently; it must never be written to
 *   by move/rotate/duplicate, or it silently accumulates a dead value that
 *   does nothing today and will misleadingly look like real data to whoever
 *   reads it next.
 * - **Wall-anchored** (door): position is a parametric `offset` along a host
 *   wall's polyline, not a world-space coordinate at all. Moving or rotating
 *   the host wall moves the door for free (the offset stays valid), and
 *   moving/rotating a selection that doesn't include the host wall must
 *   leave the door exactly where it is — so this is a deliberate no-op, not
 *   a missing case.
 */
type GeometryAnchoredEntity = WallEntity | ZoneEntity | PerimeterEntity

/** True for entities whose own vertices are their complete position — see the
 * module docblock above. Exported so UI code (e.g. the properties panel) can
 * hide transform-editing controls that would otherwise silently do nothing. */
export function isGeometryAnchored(entity: GenericEntity): entity is GeometryAnchoredEntity {
  return entity.type === 'wall' || entity.type === 'zone' || entity.type === 'perimeter'
}

/** True for entities whose position is derived from a host entity (a door's
 * wallId + offset) rather than stored in `points` or `transform`. */
export function isHostAnchored(entity: GenericEntity): boolean {
  return entity.type === 'door'
}

/** Returns a copy of `entity` translated by (dx, dy) in world space. */
export function offsetEntityGeometry(entity: GenericEntity, dx: number, dy: number): GenericEntity {
  if (isHostAnchored(entity)) return entity
  if (isGeometryAnchored(entity)) {
    return { ...entity, points: entity.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
  }
  return { ...entity, transform: { ...entity.transform, x: entity.transform.x + dx, y: entity.transform.y + dy } }
}

/** Returns a copy of `entity` rotated by `deltaRadians` around `pivot` in world space. */
export function rotateEntityGeometry(entity: GenericEntity, deltaRadians: number, pivot: Point): GenericEntity {
  if (isHostAnchored(entity)) return entity
  if (isGeometryAnchored(entity)) {
    return { ...entity, points: entity.points.map((p) => rotate(p, deltaRadians, pivot)) }
  }
  const rotated = rotate({ x: entity.transform.x, y: entity.transform.y }, deltaRadians, pivot)
  return {
    ...entity,
    transform: { ...entity.transform, x: rotated.x, y: rotated.y, rotation: entity.transform.rotation + deltaRadians },
  }
}

/** Returns a copy of `entity` reflected across the infinite line through
 * `axisA`-`axisB`. Self-inverse — mirroring twice across the same axis
 * restores the original, which is what makes the undo side of the mirror
 * command trivial (see commands/cadCommands.ts). */
export function mirrorEntityGeometry(entity: GenericEntity, axisA: Point, axisB: Point): GenericEntity {
  if (isHostAnchored(entity)) return entity
  if (isGeometryAnchored(entity)) {
    return { ...entity, points: entity.points.map((p) => mirrorPoint(p, axisA, axisB)) }
  }
  const mirrored = mirrorPoint({ x: entity.transform.x, y: entity.transform.y }, axisA, axisB)
  const axisAngle = angleBetween(axisA, axisB)
  return {
    ...entity,
    transform: { ...entity.transform, x: mirrored.x, y: mirrored.y, rotation: 2 * axisAngle - entity.transform.rotation },
  }
}
