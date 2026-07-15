import type { Point } from '@engine/geometry/types'
import type { DoorEntity, GenericEntity, IslandEntity, MachineEntity, PillarEntity, WallEntity } from '@engine/entities/types'
import { resolveDoorPlacement } from '@engine/entities/doorGeometry'

const ISLAND_FOOTPRINT_PADDING = 10

function rotatedRect(cx: number, cy: number, width: number, depth: number, rotation: number): Point[] {
  const hw = width / 2
  const hd = depth / 2
  const corners = [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ]
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return corners.map((p) => ({ x: cx + p.x * cos - p.y * sin, y: cy + p.x * sin + p.y * cos }))
}

/** Bounding rect of an island's member machines, padded the same way the
 * selection/hit-test outline is (`editor/hitTest.ts`'s `islandBoundingBox`) —
 * kept as a local, dependency-free copy so `constraints/` never has to reach
 * into the interaction layer. */
function islandFootprint(island: IslandEntity, entityMap: Record<string, GenericEntity>): Point[] {
  const machines = island.machineIds
    .map((id) => entityMap[id])
    .filter((e): e is MachineEntity => e?.type === 'machine')
  if (machines.length === 0) return []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const m of machines) {
    minX = Math.min(minX, m.transform.x - m.width / 2)
    minY = Math.min(minY, m.transform.y - m.depth / 2)
    maxX = Math.max(maxX, m.transform.x + m.width / 2)
    maxY = Math.max(maxY, m.transform.y + m.depth / 2)
  }
  const p = ISLAND_FOOTPRINT_PADDING
  return [
    { x: minX - p, y: minY - p },
    { x: maxX + p, y: minY - p },
    { x: maxX + p, y: maxY + p },
    { x: minX - p, y: maxY + p },
  ]
}

function wallFootprints(wall: WallEntity): Point[][] {
  const shapes: Point[][] = []
  for (let i = 0; i < wall.points.length - 1; i++) {
    const a = wall.points[i]
    const b = wall.points[i + 1]
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    if (length === 0) continue
    const angle = Math.atan2(b.y - a.y, b.x - a.x)
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    shapes.push(rotatedRect(mid.x, mid.y, length, wall.thickness, angle))
  }
  return shapes
}

function doorFootprints(door: DoorEntity, entityMap: Record<string, GenericEntity>): Point[][] {
  const wall = entityMap[door.wallId]
  if (wall?.type !== 'wall') return []
  const { center, angle } = resolveDoorPlacement(wall as WallEntity, door)
  const shapes = [rotatedRect(center.x, center.y, door.width, (wall as WallEntity).thickness, angle)]
  // Single/double doors need swing clearance on the side they open into;
  // sliding doors and bare openings ("vano") don't sweep into the room.
  if (door.doorType === 'single' || door.doorType === 'double') {
    const sign = door.flip ? -1 : 1
    const offset = (wall as WallEntity).thickness / 2 + door.width / 2
    const swingCenter = { x: center.x - Math.sin(angle) * sign * offset, y: center.y + Math.cos(angle) * sign * offset }
    shapes.push(rotatedRect(swingCenter.x, swingCenter.y, door.width, door.width, angle))
  }
  return shapes
}

/**
 * Every entity's collision geometry, as a list of convex polygons (rotated
 * rectangles) in world space. A list because some entities need more than
 * one shape (a multi-segment wall, a swinging door's frame + clearance
 * zone). Circular pillars are approximated by their bounding square, the
 * same convention `editor/hitTest.ts`'s `entityBoundingBox` already uses for
 * box-select — good enough for "does this roughly collide", and cheap.
 */
export function entityFootprints(entity: GenericEntity, entityMap: Record<string, GenericEntity>): Point[][] {
  switch (entity.type) {
    case 'machine': {
      const m = entity as MachineEntity
      return [rotatedRect(m.transform.x, m.transform.y, m.width, m.depth, m.transform.rotation)]
    }
    case 'pillar': {
      const p = entity as PillarEntity
      return [rotatedRect(p.transform.x, p.transform.y, p.width, p.depth, p.transform.rotation)]
    }
    case 'island':
      return [islandFootprint(entity as IslandEntity, entityMap)].filter((shape) => shape.length > 0)
    case 'wall':
      return wallFootprints(entity as WallEntity)
    case 'door':
      return doorFootprints(entity as DoorEntity, entityMap)
    default:
      return []
  }
}
