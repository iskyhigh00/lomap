import { useEffect, useRef } from 'react'
import { useBlueprintStore } from './blueprintStore'
import { loadBlueprintsForProject, saveBlueprintMetadata } from './blueprintPersistence'
import { loadBlueprintBitmapFromBlob } from './blueprintImageCache'
import type { BlueprintDocument } from './types'

const AUTOSAVE_DEBOUNCE_MS = 800

/** Loads this project's blueprint documents (metadata + bitmaps) on mount /
 * project switch, and autosaves metadata (position, opacity, calibration...)
 * whenever they change. Create/delete persist immediately from their own
 * commands (see blueprintCommands.ts) — this hook only handles the ongoing
 * "keep metadata in sync" autosave, mirroring useAutosave's role for the
 * layout model but on its own independent path. */
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

    loadBlueprintsForProject(projectId).then(async (records) => {
      if (cancelled) return
      const docs: Record<string, BlueprintDocument> = {}
      const ids: string[] = []
      for (const record of records) {
        const { projectId: _projectId, blob, ...doc } = record
        docs[doc.id] = doc
        ids.push(doc.id)
        await loadBlueprintBitmapFromBlob(doc.id, blob)
      }
      if (cancelled) return
      loadDocuments(docs, ids)
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
