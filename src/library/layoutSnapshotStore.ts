import { create } from 'zustand'
import { db, type StoredLayoutSnapshot } from '@persistence/db'
import { generateId } from '@engine/entities/factory'
import type { GenericEntity } from '@engine/entities/types'

interface LayoutSnapshotState {
  snapshots: StoredLayoutSnapshot[]
  loaded: boolean
  load: () => Promise<void>
  saveSnapshot: (name: string, entities: GenericEntity[]) => Promise<StoredLayoutSnapshot>
  removeSnapshot: (id: string) => Promise<void>
}

/**
 * Named, portable layout snapshots — global across projects, same reasoning
 * as `islandLibraryStore`. This is the payload for "copiar layout entre
 * proyectos" (save here from project A, paste into project B via
 * `createPasteEntitiesCommand` — no new paste logic) and for "comparar dos
 * layouts" (`optimizer/layoutDiff.ts` diffs a snapshot against the live
 * project).
 */
export const useLayoutSnapshotStore = create<LayoutSnapshotState>((set, get) => ({
  snapshots: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return
    const snapshots = await db.layoutSnapshots.orderBy('createdAt').reverse().toArray()
    set({ snapshots, loaded: true })
  },
  saveSnapshot: async (name, entities) => {
    const snapshot: StoredLayoutSnapshot = {
      id: generateId('snapshot'),
      name,
      entities: entities.map((e) => structuredClone(e)),
      createdAt: Date.now(),
    }
    await db.layoutSnapshots.put(snapshot)
    set((state) => ({ snapshots: [snapshot, ...state.snapshots] }))
    return snapshot
  },
  removeSnapshot: async (id) => {
    await db.layoutSnapshots.delete(id)
    set((state) => ({ snapshots: state.snapshots.filter((s) => s.id !== id) }))
  },
}))
