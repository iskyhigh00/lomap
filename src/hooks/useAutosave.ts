import { useEffect, useRef } from 'react'
import { useProjectStore } from '@store/projectStore'
import { loadLastProject, newProjectId, saveProject } from '@persistence/projectRepository'

const AUTOSAVE_DEBOUNCE_MS = 800

export function useAutosave() {
  const hasLoaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const projectId = useProjectStore((s) => s.projectId)
  const projectName = useProjectStore((s) => s.projectName)
  const entities = useProjectStore((s) => s.entities)
  const entityOrder = useProjectStore((s) => s.entityOrder)
  const layers = useProjectStore((s) => s.layers)
  const layerOrder = useProjectStore((s) => s.layerOrder)
  const loadProjectIntoStore = useProjectStore((s) => s.loadProject)

  useEffect(() => {
    let cancelled = false
    loadLastProject().then((stored) => {
      if (cancelled) return
      if (stored) {
        loadProjectIntoStore({
          projectId: stored.id,
          projectName: stored.name,
          entities: stored.entities,
          entityOrder: stored.entityOrder,
          layers: stored.layers,
          layerOrder: stored.layerOrder,
        })
      } else {
        useProjectStore.setState({ projectId: newProjectId() })
      }
      hasLoaded.current = true
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasLoaded.current || !projectId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveProject({ id: projectId, name: projectName, entities, entityOrder, layers, layerOrder })
    }, AUTOSAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [projectId, projectName, entities, entityOrder, layers, layerOrder])
}
