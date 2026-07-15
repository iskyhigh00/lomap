import type { Command } from './types'
import { useProjectStore } from '@store/projectStore'
import type { DoorEntity, GenericEntity, IslandEntity, MachineEntity } from '@engine/entities/types'
import { generateId } from '@engine/entities/factory'
import { offsetEntityGeometry, rotateEntityGeometry } from '@engine/entities/geometryTransform'
import type { Point } from '@engine/geometry/types'
import { expandGroupIds } from '@selection/groupSelection'

export function createAddEntityCommand(entity: GenericEntity): Command {
  return {
    label: `Crear ${entity.name}`,
    do() {
      useProjectStore.getState()._addEntity(entity)
      useProjectStore.getState().setSelection([entity.id])
    },
    undo() {
      useProjectStore.getState()._removeEntity(entity.id)
    },
  }
}

export function createDeleteEntitiesCommand(ids: string[]): Command {
  const state = useProjectStore.getState()
  // A door can't outlive its host wall — cascade the deletion so we never
  // leave a door pointing at a wallId that no longer exists.
  const wallIds = new Set(ids.filter((id) => state.entities[id]?.type === 'wall'))
  const orphanedDoorIds = wallIds.size
    ? Object.values(state.entities)
        .filter((entity): entity is DoorEntity => entity.type === 'door')
        .filter((door) => wallIds.has(door.wallId))
        .map((door) => door.id)
    : []
  const expandedIds = [...new Set([...ids, ...orphanedDoorIds])]
  const removed = expandedIds
    .map((id) => ({ entity: state.entities[id], index: state.entityOrder.indexOf(id) }))
    .filter((item): item is { entity: GenericEntity; index: number } => Boolean(item.entity))

  return {
    label: removed.length > 1 ? `Eliminar ${removed.length} objetos` : `Eliminar ${removed[0]?.entity.name ?? ''}`,
    do() {
      for (const { entity } of removed) {
        useProjectStore.getState()._removeEntity(entity.id)
      }
    },
    undo() {
      const sorted = [...removed].sort((a, b) => a.index - b.index)
      for (const { entity, index } of sorted) {
        useProjectStore.getState()._restoreEntity(entity, index)
      }
    },
  }
}

export function createUpdateEntityCommand(
  id: string,
  patch: Partial<GenericEntity>,
  label = 'Editar objeto',
): Command {
  const before = useProjectStore.getState().entities[id]
  const previousPatch: Partial<GenericEntity> = {}
  for (const key of Object.keys(patch) as (keyof GenericEntity)[]) {
    ;(previousPatch as Record<string, unknown>)[key] = (before as unknown as Record<string, unknown>)[key]
  }

  return {
    label,
    do() {
      useProjectStore.getState()._updateEntity(id, patch)
    },
    undo() {
      useProjectStore.getState()._updateEntity(id, previousPatch)
    },
  }
}

export interface MoveDelta {
  id: string
  dx: number
  dy: number
}

export function createMoveEntitiesCommand(deltas: MoveDelta[], label = 'Mover'): Command {
  return {
    label,
    do() {
      const state = useProjectStore.getState()
      for (const { id, dx, dy } of deltas) {
        const entity = state.entities[id]
        if (!entity) continue
        state._updateEntity(id, offsetEntityGeometry(entity, dx, dy))
      }
    },
    undo() {
      const state = useProjectStore.getState()
      for (const { id, dx, dy } of deltas) {
        const entity = state.entities[id]
        if (!entity) continue
        state._updateEntity(id, offsetEntityGeometry(entity, -dx, -dy))
      }
    },
  }
}

export function createRotateEntityCommand(id: string, deltaRadians: number, label = 'Rotar'): Command {
  return {
    label,
    do() {
      const state = useProjectStore.getState()
      const entity = state.entities[id]
      if (!entity) return
      state._updateEntity(id, { transform: { ...entity.transform, rotation: entity.transform.rotation + deltaRadians } })
    },
    undo() {
      const state = useProjectStore.getState()
      const entity = state.entities[id]
      if (!entity) return
      state._updateEntity(id, { transform: { ...entity.transform, rotation: entity.transform.rotation - deltaRadians } })
    },
  }
}

/** Rotates a group of entities rigidly around a shared pivot — used for island/multi-select rotation. */
export function createRotateGroupCommand(ids: string[], pivot: Point, deltaRadians: number, label = 'Rotar'): Command {
  const applyDelta = (delta: number) => {
    const state = useProjectStore.getState()
    for (const id of ids) {
      const entity = state.entities[id]
      if (!entity) continue
      state._updateEntity(id, rotateEntityGeometry(entity, delta, pivot))
    }
  }
  return {
    label,
    do() {
      applyDelta(deltaRadians)
    },
    undo() {
      applyDelta(-deltaRadians)
    },
  }
}

/** Clones a set of source entities as a rigid group, remapping cross-references
 * (machine.islandId / island.machineIds) so a duplicated island stays intact and
 * independent from its original. Shared by duplicate and paste. */
export function cloneEntityGroup(sourceEntities: GenericEntity[], dx: number, dy: number): { clones: GenericEntity[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>()
  const clones: GenericEntity[] = []

  for (const source of sourceEntities) {
    const now = Date.now()
    const clone = offsetEntityGeometry(source, dx, dy)
    // Doors are wall-anchored (offsetEntityGeometry no-ops on them), so a
    // duplicate would otherwise land on the exact same wall span as its
    // source — nudge it along the wall instead of overlapping it.
    if (clone.type === 'door') {
      const door = clone as DoorEntity
      door.offset += door.width + 20
    }
    clone.id = generateId(source.type)
    clone.createdAt = now
    clone.updatedAt = now
    idMap.set(source.id, clone.id)
    clones.push(clone)
  }

  for (const clone of clones) {
    if (clone.type === 'machine') {
      const machine = clone as MachineEntity
      machine.islandId = machine.islandId ? (idMap.get(machine.islandId) ?? null) : null
    } else if (clone.type === 'island') {
      const island = clone as IslandEntity
      island.machineIds = island.machineIds.map((mid) => idMap.get(mid)).filter((mid): mid is string => Boolean(mid))
    }
  }

  return { clones, idMap }
}

/** Duplicates a selection as a rigid group: islands always bring their machines. */
export function createDuplicateEntitiesCommand(ids: string[], dx = 30, dy = 30, label = 'Duplicar'): Command {
  const state = useProjectStore.getState()
  const expandedIds = expandGroupIds(state.entities, ids)
  const sourceEntities = expandedIds.map((id) => state.entities[id]).filter((e): e is GenericEntity => Boolean(e))
  const { clones, idMap } = cloneEntityGroup(sourceEntities, dx, dy)
  const newSelection = ids.map((id) => idMap.get(id)).filter((id): id is string => Boolean(id))

  return {
    label,
    do() {
      const s = useProjectStore.getState()
      for (const clone of clones) s._addEntity(clone)
      s.setSelection(newSelection)
    },
    undo() {
      const s = useProjectStore.getState()
      for (const clone of clones) s._removeEntity(clone.id)
    },
  }
}

/** Pastes a previously copied set of entities (already deep-cloned, own ids) as new entities. */
export function createPasteEntitiesCommand(sourceEntities: GenericEntity[], dx: number, dy: number, label = 'Pegar'): Command {
  const { clones } = cloneEntityGroup(sourceEntities, dx, dy)
  return {
    label,
    do() {
      const s = useProjectStore.getState()
      for (const clone of clones) s._addEntity(clone)
      s.setSelection(clones.map((c) => c.id))
    },
    undo() {
      const s = useProjectStore.getState()
      for (const clone of clones) s._removeEntity(clone.id)
    },
  }
}
