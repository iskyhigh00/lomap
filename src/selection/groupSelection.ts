import type { GenericEntity, IslandEntity, MachineEntity } from '@engine/entities/types'

/**
 * Expands a raw selection into the full set of entity ids that must move,
 * rotate, or duplicate together as one unit: islands always drag their
 * member machines, and machines belonging to a group-locked island pull
 * the whole island along with them.
 */
export function expandGroupIds(entities: Record<string, GenericEntity>, ids: string[]): string[] {
  const result = new Set<string>()

  for (const id of ids) {
    const entity = entities[id]
    if (!entity) continue

    if (entity.type === 'island') {
      const island = entity as IslandEntity
      result.add(island.id)
      for (const machineId of island.machineIds) result.add(machineId)
      continue
    }

    if (entity.type === 'machine') {
      const machine = entity as MachineEntity
      const island = machine.islandId ? (entities[machine.islandId] as IslandEntity | undefined) : undefined
      if (island?.groupLocked) {
        result.add(island.id)
        for (const machineId of island.machineIds) result.add(machineId)
        continue
      }
    }

    result.add(id)
  }

  return Array.from(result)
}

/** Resolves a click on a machine to the entity that should actually be selected —
 * the island itself when it is group-locked, otherwise the machine. */
export function resolveClickTarget(entities: Record<string, GenericEntity>, hitId: string): string {
  const entity = entities[hitId]
  if (entity?.type === 'machine') {
    const machine = entity as MachineEntity
    const island = machine.islandId ? (entities[machine.islandId] as IslandEntity | undefined) : undefined
    if (island?.groupLocked) return island.id
  }
  return hitId
}
