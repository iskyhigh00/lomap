import type { Point } from '@engine/geometry/types'
import { boxesIntersect, pointInPolygon } from '@engine/geometry/polygon'
import { distance, rotate } from '@engine/geometry/vector'
import type { GenericEntity, MachineEntity, PillarEntity, WallEntity, ZoneEntity, PerimeterEntity } from '@engine/entities/types'

/** Returns the id of the topmost entity under `worldPoint`, or null. `tolerance` is in world units. */
export function hitTestEntities(entities: GenericEntity[], worldPoint: Point, tolerance: number): string | null {
  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i]
    if (!entity.visible || entity.locked) continue
    if (hitTestEntity(entity, worldPoint, tolerance)) return entity.id
  }
  return null
}

function hitTestEntity(entity: GenericEntity, point: Point, tolerance: number): boolean {
  switch (entity.type) {
    case 'wall': {
      const wall = entity as WallEntity
      return distanceToSegment(point, wall.start, wall.end) <= Math.max(wall.thickness / 2, tolerance)
    }
    case 'pillar': {
      const pillar = entity as PillarEntity
      return pointInLocalRect(point, pillar.transform, pillar.width, pillar.depth)
    }
    case 'machine': {
      const machine = entity as MachineEntity
      return pointInLocalRect(point, machine.transform, machine.width, machine.depth)
    }
    case 'zone': {
      const zone = entity as ZoneEntity
      return pointInPolygon(point, zone.points)
    }
    case 'perimeter': {
      const perimeter = entity as PerimeterEntity
      for (let i = 0; i < perimeter.points.length; i++) {
        const a = perimeter.points[i]
        const b = perimeter.points[(i + 1) % perimeter.points.length]
        if (distanceToSegment(point, a, b) <= tolerance) return true
      }
      return false
    }
    default:
      return distance(point, { x: entity.transform.x, y: entity.transform.y }) <= tolerance
  }
}

function pointInLocalRect(point: Point, transform: { x: number; y: number; rotation: number }, width: number, depth: number): boolean {
  const local = rotate(point, -transform.rotation, { x: transform.x, y: transform.y })
  const dx = local.x - transform.x
  const dy = local.y - transform.y
  return Math.abs(dx) <= width / 2 && Math.abs(dy) <= depth / 2
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const lengthSquared = abx * abx + aby * aby
  if (lengthSquared === 0) return distance(point, a)
  let t = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSquared
  t = Math.max(0, Math.min(1, t))
  const projection = { x: a.x + t * abx, y: a.y + t * aby }
  return distance(point, projection)
}

export function entityBoundingBox(entity: GenericEntity): { minX: number; minY: number; maxX: number; maxY: number } {
  switch (entity.type) {
    case 'wall': {
      const wall = entity as WallEntity
      return {
        minX: Math.min(wall.start.x, wall.end.x),
        minY: Math.min(wall.start.y, wall.end.y),
        maxX: Math.max(wall.start.x, wall.end.x),
        maxY: Math.max(wall.start.y, wall.end.y),
      }
    }
    case 'pillar': {
      const pillar = entity as PillarEntity
      return {
        minX: pillar.transform.x - pillar.width / 2,
        minY: pillar.transform.y - pillar.depth / 2,
        maxX: pillar.transform.x + pillar.width / 2,
        maxY: pillar.transform.y + pillar.depth / 2,
      }
    }
    case 'machine': {
      const machine = entity as MachineEntity
      return {
        minX: machine.transform.x - machine.width / 2,
        minY: machine.transform.y - machine.depth / 2,
        maxX: machine.transform.x + machine.width / 2,
        maxY: machine.transform.y + machine.depth / 2,
      }
    }
    case 'zone':
    case 'perimeter': {
      const points = (entity as ZoneEntity | PerimeterEntity).points
      const xs = points.map((p) => p.x)
      const ys = points.map((p) => p.y)
      return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
    }
    default:
      return {
        minX: entity.transform.x,
        minY: entity.transform.y,
        maxX: entity.transform.x,
        maxY: entity.transform.y,
      }
  }
}

export function entitiesInBox(entities: GenericEntity[], box: { minX: number; minY: number; maxX: number; maxY: number }): string[] {
  const ids: string[] = []
  for (const entity of entities) {
    if (!entity.visible || entity.locked) continue
    if (boxesIntersect(entityBoundingBox(entity), box)) ids.push(entity.id)
  }
  return ids
}
