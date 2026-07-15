import { create } from 'zustand'
import type { GenericEntity, Layer } from '@engine/entities/types'
import { HistoryStack } from '@history/HistoryStack'
import { DEFAULT_CONSTRAINT_SETTINGS, type ConstraintSettings } from '@constraints/types'

export type ToolId =
  | 'select'
  | 'pan'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'measure'
  | 'perimeter'
  | 'wall'
  | 'pillar'
  | 'door'
  | 'zone'
  | 'machine'
  | 'island'
  | 'blueprint'
  | 'offset'
  | 'trim'
  | 'extend'
  | 'fillet'
  | 'mirror'

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface ProjectState {
  projectId: string | null
  projectName: string
  entities: Record<string, GenericEntity>
  entityOrder: string[]
  layers: Record<string, Layer>
  layerOrder: string[]
  selectedIds: string[]
  activeTool: ToolId
  viewport: Viewport
  gridSize: number
  snapEnabled: boolean
  constraintSettings: ConstraintSettings
  /** Bumped on every "navigate to entity" request from the validation
   * inspector (or anywhere else); the canvas centers on `entityId` whenever
   * `nonce` changes, even if it's the same entity clicked twice in a row. */
  focusRequest: { entityId: string; nonce: number } | null

  // Internal mutation primitives — only Commands should call these.
  _addEntity: (entity: GenericEntity) => void
  _removeEntity: (id: string) => void
  _updateEntity: (id: string, patch: Partial<GenericEntity>) => void
  _restoreEntity: (entity: GenericEntity, index?: number) => void
  _addLayer: (layer: Layer) => void
  _removeLayer: (id: string) => void
  _updateLayer: (id: string, patch: Partial<Layer>) => void
  _restoreLayer: (layer: Layer, index?: number) => void

  setSelection: (ids: string[]) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void
  setActiveTool: (tool: ToolId) => void
  setViewport: (viewport: Partial<Viewport>) => void
  setGridSize: (size: number) => void
  toggleSnap: () => void
  setConstraintSettings: (patch: Partial<ConstraintSettings>) => void
  requestFocus: (entityId: string) => void
  loadProject: (state: { entities: Record<string, GenericEntity>; entityOrder: string[]; layers: Record<string, Layer>; layerOrder: string[]; projectId: string; projectName: string }) => void
  resetProject: () => void
}

export const DEFAULT_LAYER: Layer = {
  id: 'layer_default',
  name: 'Capa 1',
  color: '#3d8bfd',
  visible: true,
  locked: false,
  order: 0,
}

export const history = new HistoryStack()

export const useProjectStore = create<ProjectState>((set) => ({
  projectId: null,
  projectName: 'Proyecto sin título',
  entities: {},
  entityOrder: [],
  layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER },
  layerOrder: [DEFAULT_LAYER.id],
  selectedIds: [],
  activeTool: 'select',
  viewport: { x: 0, y: 0, zoom: 1 },
  gridSize: 20,
  snapEnabled: true,
  constraintSettings: { ...DEFAULT_CONSTRAINT_SETTINGS },
  focusRequest: null,

  _addEntity: (entity) =>
    set((state) => ({
      entities: { ...state.entities, [entity.id]: entity },
      entityOrder: [...state.entityOrder, entity.id],
    })),

  _removeEntity: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.entities
      return {
        entities: rest,
        entityOrder: state.entityOrder.filter((existingId) => existingId !== id),
        selectedIds: state.selectedIds.filter((existingId) => existingId !== id),
      }
    }),

  _updateEntity: (id, patch) =>
    set((state) => {
      const existing = state.entities[id]
      if (!existing) return state
      return {
        entities: {
          ...state.entities,
          [id]: { ...existing, ...patch, updatedAt: Date.now() } as GenericEntity,
        },
      }
    }),

  _restoreEntity: (entity, index) =>
    set((state) => {
      const order = [...state.entityOrder]
      if (index !== undefined && index >= 0 && index <= order.length) {
        order.splice(index, 0, entity.id)
      } else {
        order.push(entity.id)
      }
      return {
        entities: { ...state.entities, [entity.id]: entity },
        entityOrder: order,
      }
    }),

  _addLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer.id]: layer },
      layerOrder: [...state.layerOrder, layer.id],
    })),

  _removeLayer: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.layers
      return { layers: rest, layerOrder: state.layerOrder.filter((existingId) => existingId !== id) }
    }),

  _updateLayer: (id, patch) =>
    set((state) => {
      const existing = state.layers[id]
      if (!existing) return state
      return { layers: { ...state.layers, [id]: { ...existing, ...patch } } }
    }),

  _restoreLayer: (layer, index) =>
    set((state) => {
      const order = [...state.layerOrder]
      if (index !== undefined && index >= 0 && index <= order.length) {
        order.splice(index, 0, layer.id)
      } else {
        order.push(layer.id)
      }
      return { layers: { ...state.layers, [layer.id]: layer }, layerOrder: order }
    }),

  setSelection: (ids) => set({ selectedIds: ids }),
  toggleSelection: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((existingId) => existingId !== id)
        : [...state.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
  setGridSize: (size) => set({ gridSize: size }),
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  setConstraintSettings: (patch) => set((state) => ({ constraintSettings: { ...state.constraintSettings, ...patch } })),
  requestFocus: (entityId) => set((state) => ({ focusRequest: { entityId, nonce: (state.focusRequest?.nonce ?? 0) + 1 } })),
  loadProject: (payload) =>
    set({
      projectId: payload.projectId,
      projectName: payload.projectName,
      entities: payload.entities,
      entityOrder: payload.entityOrder,
      layers: payload.layers,
      layerOrder: payload.layerOrder,
      selectedIds: [],
    }),
  resetProject: () =>
    set({
      projectId: null,
      projectName: 'Proyecto sin título',
      entities: {},
      entityOrder: [],
      layers: { [DEFAULT_LAYER.id]: DEFAULT_LAYER },
      layerOrder: [DEFAULT_LAYER.id],
      selectedIds: [],
      constraintSettings: { ...DEFAULT_CONSTRAINT_SETTINGS },
      focusRequest: null,
    }),
}))
