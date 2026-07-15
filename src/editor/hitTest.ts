import type { Point } from '@engine/geometry/types'
import { boxesIntersect, expandBox, pointInPolygon } from '@engine/geometry/polygon'
import { distance, distanceToPolyline, rotate } from '@engine/geometry/vector'
import type {
  GenericEntity,
  IslandEntity,
  MachineEntity,
  PillarEntity,
  WallEntity,
  ZoneEntity,
  PerimeterEntity,
} from '@engine/entities/types'

const ISLAND_BOUNDS_PADDING = 10

type EntityMap = Record<string, GenericEntity>

/** Returns the id of the topmost entity under `worldPoint`, or null. `tolerance` is in world units.
 * Islands are tested last (as a bbox-of-members fallback) so a click on an individual
 * machine always wins over the island it belongs to. */
export function hitTestEntities(entities: GenericEntity[], entityMap: EntityMap, worldPoint: Point, tolerance: number): string | null {
  let islandFallback: string | null = null
  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i]
    if (!entity.visible || entity.locked) continue
    if (entity.type === 'island') {
      if (!islandFallback && hitTestIsland(entity as IslandEntity, entityMap, worldPoint)) {
        islandFallback = entity.id
      }
      continue
    }
    if (hitTestEntity(entity, worldPoint, tolerance)) return entity.id
  }
  return islandFallback
}

function hitTestIsland(island: IslandEntity, entityMap: EntityMap, point: Point): boolean {
  const box = islandBoundingBox(island, entityMap)
  if (!box) return false
  return point.x >= box.minX && point.x <= box.maxX && point.y >= box.minY && point.y <= box.maxY
}

function hitTestEntity(entity: GenericEntity, point: Point, tolerance: number): boolean {
  switch (entity.type) {
    case 'wall': {
      const wall = entity as WallEntity
      return distanceToPolyline(point, wall.points) <= Math.max(wall.thickness / 2, tolerance)
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
      return distanceToPolyline(point, perimeter.points, true) <= tolerance
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

export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function islandBoundingBox(island: IslandEntity, entityMap: EntityMap): Box | null {
  const machines = island.machineIds
    .map((id) => entityMap[id])
    .filter((entity): entity is MachineEntity => entity?.type === 'machine')
  if (machines.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const machine of machines) {
    minX = Math.min(minX, machine.transform.x - machine.width / 2)
    minY = Math.min(minY, machine.transform.y - machine.depth / 2)
    maxX = Math.max(maxX, machine.transform.x + machine.width / 2)
    maxY = Math.max(maxY, machine.transform.y + machine.depth / 2)
  }
  return expandBox({ minX, minY, maxX, maxY }, ISLAND_BOUNDS_PADDING)
}

export function entityBoundingBox(entity: GenericEntity, entityMap: EntityMap): Box {
  switch (entity.type) {
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
    case 'island': {
      const box = islandBoundingBox(entity as IslandEntity, entityMap)
      if (box) return box
      return { minX: entity.transform.x, minY: entity.transform.y, maxX: entity.transform.x, maxY: entity.transform.y }
    }
    case 'zone':
    case 'perimeter':
    case 'wall': {
      const points = (entity as ZoneEntity | PerimeterEntity | WallEntity).points
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

export function entitiesInBox(entities: GenericEntity[], entityMap: EntityMap, box: Box): string[] {
  const ids: string[] = []
  for (const entity of entities) {
    if (!entity.visible || entity.locked) continue
    if (boxesIntersect(entityBoundingBox(entity, entityMap), box)) ids.push(entity.id)
  }
  return ids
}
