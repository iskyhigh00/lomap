import type { Conflict, ConstraintRule } from '../types'
import type { DoorEntity, GenericEntity, MachineEntity } from '@engine/entities/types'
import { entityFootprints } from '../footprint'
import { convexPolygonsIntersect } from '@engine/geometry/sat'

const COLLIDABLE_TYPES = new Set(['island', 'machine', 'wall', 'pillar', 'door'])

/** Pairs that legitimately overlap by design and must never be flagged:
 * a machine and its own island, two machines in the same island (they're
 * meant to be packed tight), and a door with its own host wall (the door
 * sits *in* the wall by construction). */
function isExpectedOverlap(a: GenericEntity, b: GenericEntity): boolean {
  if (a.type === 'island' && b.type === 'machine' && (b as MachineEntity).islandId === a.id) return true
  if (b.type === 'island' && a.type === 'machine' && (a as MachineEntity).islandId === b.id) return true
  if (a.type === 'machine' && b.type === 'machine') {
    const ma = a as MachineEntity
    const mb = b as MachineEntity
    if (ma.islandId && ma.islandId === mb.islandId) return true
  }
  if (a.type === 'door' && b.type === 'wall' && (a as DoorEntity).wallId === b.id) return true
  if (b.type === 'door' && a.type === 'wall' && (b as DoorEntity).wallId === a.id) return true
  return false
}

/** Flags any physical overlap between islands, machines, walls, pillars, and
 * doors (including a door's swing clearance zone). This is the one rule
 * whose violations are always `error`, not `warning` — an overlap isn't a
 * matter of degree the way "too close" is. */
export const collisionRule: ConstraintRule = {
  id: 'collision',
  evaluate({ entities, entityMap }) {
    const relevant = entities.filter((e) => COLLIDABLE_TYPES.has(e.type) && e.visible && !e.locked)
    const withShapes = relevant.map((entity) => ({ entity, shapes: entityFootprints(entity, entityMap) }))
    const conflicts: Conflict[] = []

    for (let i = 0; i < withShapes.length; i++) {
      for (let j = i + 1; j < withShapes.length; j++) {
        const a = withShapes[i]
        const b = withShapes[j]
        if (isExpectedOverlap(a.entity, b.entity)) continue
        const collides = a.shapes.some((sa) => b.shapes.some((sb) => convexPolygonsIntersect(sa, sb)))
        if (collides) {
          conflicts.push({
            id: `collision:${a.entity.id}:${b.entity.id}`,
            ruleId: 'collision',
            severity: 'error',
            message: `"${a.entity.name}" se superpone con "${b.entity.name}"`,
            entityIds: [a.entity.id, b.entity.id],
          })
        }
      }
    }
    return conflicts
  },
}
