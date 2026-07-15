import type { Command } from './types'
import { useProjectStore } from '@store/projectStore'
import type { GenericEntity } from '@engine/entities/types'

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
  const removed = ids
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
        state._updateEntity(id, {
          transform: { ...entity.transform, x: entity.transform.x + dx, y: entity.transform.y + dy },
        })
      }
    },
    undo() {
      const state = useProjectStore.getState()
      for (const { id, dx, dy } of deltas) {
        const entity = state.entities[id]
        if (!entity) continue
        state._updateEntity(id, {
          transform: { ...entity.transform, x: entity.transform.x - dx, y: entity.transform.y - dy },
        })
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
