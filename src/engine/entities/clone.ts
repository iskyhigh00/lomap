import type { GenericEntity, PerimeterEntity, WallEntity, ZoneEntity } from './types'

/** Returns a copy of `entity` with every point of its geometry shifted by (dx, dy). */
export function offsetEntityGeometry(entity: GenericEntity, dx: number, dy: number): GenericEntity {
  const clone: GenericEntity = {
    ...entity,
    transform: { ...entity.transform, x: entity.transform.x + dx, y: entity.transform.y + dy },
  }
  if (clone.type === 'wall') {
    const wall = clone as WallEntity
    wall.start = { x: wall.start.x + dx, y: wall.start.y + dy }
    wall.end = { x: wall.end.x + dx, y: wall.end.y + dy }
  } else if (clone.type === 'zone' || clone.type === 'perimeter') {
    const shaped = clone as ZoneEntity | PerimeterEntity
    shaped.points = shaped.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
  }
  return clone
}
