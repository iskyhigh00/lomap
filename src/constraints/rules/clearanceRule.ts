import type { Conflict, ConstraintRule } from '../types'
import type { GenericEntity, MachineEntity } from '@engine/entities/types'
import type { Point } from '@engine/geometry/types'
import { entityFootprints } from '../footprint'
import { convexPolygonDistance } from '@engine/geometry/sat'

function minDistanceToShapes(shape: Point[], shapes: Point[][]): number {
  let min = Infinity
  for (const s of shapes) min = Math.min(min, convexPolygonDistance(shape, s))
  return min
}

/** Flags a machine group (island, or standalone machine) that sits closer
 * than the configured minimum to a wall or a pillar. Physical overlap is
 * `collisionRule`'s job (distance 0 is skipped here to avoid double-reporting
 * the same spot as both an error and a clearance warning). */
export const clearanceRule: ConstraintRule = {
  id: 'clearance',
  evaluate({ entities, entityMap, settings }) {
    if (settings.minWallDistance <= 0 && settings.minPillarDistance <= 0) return []

    const movables = entities.filter(
      (e) => e.visible && !e.locked && (e.type === 'island' || (e.type === 'machine' && !(e as MachineEntity).islandId)),
    )
    const walls = entities.filter((e) => e.type === 'wall' && e.visible)
    const pillars = entities.filter((e) => e.type === 'pillar' && e.visible)
    const conflicts: Conflict[] = []

    for (const movable of movables) {
      const shape = entityFootprints(movable, entityMap)[0]
      if (!shape) continue

      if (settings.minWallDistance > 0) {
        for (const wall of walls) {
          const dist = minDistanceToShapes(shape, entityFootprints(wall, entityMap))
          if (dist > 0 && dist < settings.minWallDistance) {
            conflicts.push(clearanceConflict(movable, wall, dist, settings.minWallDistance, 'muro'))
          }
        }
      }

      if (settings.minPillarDistance > 0) {
        for (const pillar of pillars) {
          const pillarShape = entityFootprints(pillar, entityMap)[0]
          if (!pillarShape) continue
          const dist = convexPolygonDistance(shape, pillarShape)
          if (dist > 0 && dist < settings.minPillarDistance) {
            conflicts.push(clearanceConflict(movable, pillar, dist, settings.minPillarDistance, 'pilar'))
          }
        }
      }
    }
    return conflicts
  },
}

function clearanceConflict(movable: GenericEntity, obstacle: GenericEntity, dist: number, min: number, kind: string): Conflict {
  return {
    id: `clearance:${movable.id}:${obstacle.id}`,
    ruleId: 'clearance',
    severity: 'warning',
    message: `"${movable.name}" está a ${dist.toFixed(0)} cm del ${kind} "${obstacle.name}" (mínimo ${min} cm)`,
    entityIds: [movable.id, obstacle.id],
  }
}
