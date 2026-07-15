import type { Command } from './types'
import { useProjectStore } from '@store/projectStore'
import type { Layer } from '@engine/entities/types'
import { generateId } from '@engine/entities/factory'

const PALETTE = ['#3d8bfd', '#3ecf8e', '#f2a93b', '#e5484d', '#c084fc', '#38bdf8']

export function createAddLayerCommand(): Command {
  const state = useProjectStore.getState()
  const layer: Layer = {
    id: generateId('layer'),
    name: `Capa ${state.layerOrder.length + 1}`,
    color: PALETTE[state.layerOrder.length % PALETTE.length],
    visible: true,
    locked: false,
    order: state.layerOrder.length,
  }
  return {
    label: 'Crear capa',
    do() {
      useProjectStore.getState()._addLayer(layer)
    },
    undo() {
      useProjectStore.getState()._removeLayer(layer.id)
    },
  }
}

export function createUpdateLayerCommand(id: string, patch: Partial<Layer>, label = 'Editar capa'): Command {
  const before = useProjectStore.getState().layers[id]
  const previousPatch: Partial<Layer> = {}
  for (const key of Object.keys(patch) as (keyof Layer)[]) {
    ;(previousPatch as Record<string, unknown>)[key] = (before as unknown as Record<string, unknown>)[key]
  }
  return {
    label,
    do() {
      useProjectStore.getState()._updateLayer(id, patch)
    },
    undo() {
      useProjectStore.getState()._updateLayer(id, previousPatch)
    },
  }
}

export function createDeleteLayerCommand(id: string): Command {
  const state = useProjectStore.getState()
  const layer = state.layers[id]
  const index = state.layerOrder.indexOf(id)
  const fallbackLayerId = state.layerOrder.find((layerId) => layerId !== id) ?? id
  const affectedEntities = state.entityOrder
    .map((entityId) => state.entities[entityId])
    .filter((entity) => entity.layerId === id)

  return {
    label: `Eliminar ${layer?.name ?? 'capa'}`,
    do() {
      const s = useProjectStore.getState()
      for (const entity of affectedEntities) s._updateEntity(entity.id, { layerId: fallbackLayerId })
      s._removeLayer(id)
    },
    undo() {
      const s = useProjectStore.getState()
      if (layer) s._restoreLayer(layer, index)
      for (const entity of affectedEntities) s._updateEntity(entity.id, { layerId: id })
    },
  }
}

export function createAssignLayerCommand(entityIds: string[], layerId: string): Command {
  const state = useProjectStore.getState()
  const before = entityIds.map((id) => ({ id, layerId: state.entities[id]?.layerId }))
  return {
    label: 'Asignar capa',
    do() {
      const s = useProjectStore.getState()
      for (const id of entityIds) s._updateEntity(id, { layerId })
    },
    undo() {
      const s = useProjectStore.getState()
      for (const { id, layerId: previous } of before) {
        if (previous) s._updateEntity(id, { layerId: previous })
      }
    },
  }
}
