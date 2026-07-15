import { create } from 'zustand'
import { db, type StoredIslandTemplate } from '@persistence/db'

interface IslandLibraryState {
  templates: StoredIslandTemplate[]
  loaded: boolean
  load: () => Promise<void>
  addTemplate: (template: StoredIslandTemplate) => Promise<void>
  removeTemplate: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
}

/** Global across projects, deliberately not part of `useProjectStore` — a
 * template outlives any single project (see `persistence/db.ts`). Loaded
 * once, then kept in sync with Dexie on every add/remove. */
export const useIslandLibraryStore = create<IslandLibraryState>((set, get) => ({
  templates: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return
    const templates = await db.islandTemplates.orderBy('createdAt').reverse().toArray()
    set({ templates, loaded: true })
  },
  addTemplate: async (template) => {
    await db.islandTemplates.put(template)
    set((state) => ({ templates: [template, ...state.templates] }))
  },
  removeTemplate: async (id) => {
    await db.islandTemplates.delete(id)
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }))
  },
  toggleFavorite: async (id) => {
    const template = get().templates.find((t) => t.id === id)
    if (!template) return
    const favorite = !template.favorite
    await db.islandTemplates.update(id, { favorite })
    set((state) => ({ templates: state.templates.map((t) => (t.id === id ? { ...t, favorite } : t)) }))
  },
}))
