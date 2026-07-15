import { useEffect, useRef } from 'react'
import { useBlueprintStore } from './blueprintStore'
import { loadBlueprintAsset, loadBlueprintsForProject, saveBlueprintMetadata } from './blueprintPersistence'
import { clearBlueprintBitmapCache, loadBlueprintBitmapFromBlob } from './blueprintImageCache'
import type { BlueprintDocument } from './types'

const AUTOSAVE_DEBOUNCE_MS = 800

/** Loads this project's blueprint documents (metadata + bitmaps) on mount /
 * project switch, and autosaves metadata (position, opacity, calibration...)
 * whenever they change. Create/delete persist immediately from their own
 * commands (see blueprintCommands.ts) — this hook only handles the ongoing
 * "keep metadata in sync" autosave, mirroring useAutosave's role for the
 * layout model but on its own independent path.
 *
 * NOTE: this clears the bitmap cache on every project switch, but the app's
 * `HistoryStack` is NOT cleared on project switch (a pre-existing, currently
 * dormant gap in store/projectStore.ts — there's no "open another project"
 * UI yet to reach it). When that ships, `history.clear()` must run alongside
 * this, or an undo from the previous project could resurrect a blueprint (or
 * entity) into the newly loaded one.
 */
export function useBlueprintSync(projectId: string | null) {
  const documents = useBlueprintStore((s) => s.documents)
  const order = useBlueprintStore((s) => s.order)
  const loadDocuments = useBlueprintStore((s) => s.loadDocuments)
  const hasLoaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!projectId) return
    hasLoaded.current = false
    let cancelled = false
    clearBlueprintBitmapCache()

    loadBlueprintsForProject(projectId).then(async (docs) => {
      if (cancelled) return
      const byId: Record<string, BlueprintDocument> = {}
      const ids: string[] = []
      for (const doc of docs) {
        const blob = await loadBlueprintAsset(doc.id)
        if (!blob) continue
        byId[doc.id] = doc
        ids.push(doc.id)
        await loadBlueprintBitmapFromBlob(doc.id, blob)
      }
      if (cancelled) return
      loadDocuments(byId, ids)
      hasLoaded.current = true
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (!hasLoaded.current || !projectId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      for (const id of order) {
        const doc = documents[id]
        if (doc) saveBlueprintMetadata(projectId, doc)
      }
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [projectId, documents, order])
}
