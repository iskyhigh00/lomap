import { create } from 'zustand'
import type { BlueprintDocument } from './types'

export interface BlueprintState {
  documents: Record<string, BlueprintDocument>
  order: string[]
  activeId: string | null
  /** Set while a 2-point scale calibration is in progress; the canvas reads
   * this to divert clicks into the calibration flow instead of any tool. */
  calibratingId: string | null

  _addDocument: (doc: BlueprintDocument) => void
  _removeDocument: (id: string) => void
  _updateDocument: (id: string, patch: Partial<BlueprintDocument>) => void
  _restoreDocument: (doc: BlueprintDocument, index?: number) => void

  setActiveId: (id: string | null) => void
  setCalibratingId: (id: string | null) => void
  loadDocuments: (documents: Record<string, BlueprintDocument>, order: string[]) => void
  reset: () => void
}

export const useBlueprintStore = create<BlueprintState>((set) => ({
  documents: {},
  order: [],
  activeId: null,
  calibratingId: null,

  _addDocument: (doc) =>
    set((state) => ({
      documents: { ...state.documents, [doc.id]: doc },
      order: [...state.order, doc.id],
      activeId: doc.id,
    })),

  _removeDocument: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.documents
      return {
        documents: rest,
        order: state.order.filter((existingId) => existingId !== id),
        activeId: state.activeId === id ? null : state.activeId,
      }
    }),

  _updateDocument: (id, patch) =>
    set((state) => {
      const existing = state.documents[id]
      if (!existing) return state
      return { documents: { ...state.documents, [id]: { ...existing, ...patch, updatedAt: Date.now() } } }
    }),

  _restoreDocument: (doc, index) =>
    set((state) => {
      const order = [...state.order]
      if (index !== undefined && index >= 0 && index <= order.length) {
        order.splice(index, 0, doc.id)
      } else {
        order.push(doc.id)
      }
      return { documents: { ...state.documents, [doc.id]: doc }, order }
    }),

  setActiveId: (id) => set({ activeId: id }),
  setCalibratingId: (id) => set({ calibratingId: id }),
  loadDocuments: (documents, order) => set({ documents, order, activeId: null, calibratingId: null }),
  reset: () => set({ documents: {}, order: [], activeId: null, calibratingId: null }),
}))
