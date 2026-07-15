import type { Conflict, ConstraintRule } from '../types'
import type { GenericEntity, MachineEntity } from '@engine/entities/types'
import type { Point } from '@engine/geometry/types'
import { entityFootprints } from '../footprint'
import { convexPolygonDistance } from '@engine/geometry/sat'

/** Flags two machine groups (islands, or standalone machines not in an
 * island) that are closer together than the configured minimum corridor
 * width — circulation space, not a physical overlap (that's `collisionRule`,
 * which already covers `distance === 0`). */
export const corridorRule: ConstraintRule = {
  id: 'corridor',
  evaluate({ entities, entityMap, settings }) {
    if (settings.minCorridorWidth <= 0) return []
    const groups = entities.filter(
      (e) => e.visible && !e.locked && (e.type === 'island' || (e.type === 'machine' && !(e as MachineEntity).islandId)),
    )
    const withShape: { entity: GenericEntity; shape: Point[] }[] = groups
      .map((entity) => ({ entity, shape: entityFootprints(entity, entityMap)[0] }))
      .filter((g): g is { entity: GenericEntity; shape: Point[] } => Boolean(g.shape))

    const conflicts: Conflict[] = []
    for (let i = 0; i < withShape.length; i++) {
      for (let j = i + 1; j < withShape.length; j++) {
        const a = withShape[i]
        const b = withShape[j]
        const dist = convexPolygonDistance(a.shape, b.shape)
        if (dist > 0 && dist < settings.minCorridorWidth) {
          conflicts.push({
            id: `corridor:${a.entity.id}:${b.entity.id}`,
            ruleId: 'corridor',
            severity: 'warning',
            message: `Pasillo de ${dist.toFixed(0)} cm entre "${a.entity.name}" y "${b.entity.name}" (mínimo ${settings.minCorridorWidth} cm)`,
            entityIds: [a.entity.id, b.entity.id],
          })
        }
      }
    }
    return conflicts
  },
}
