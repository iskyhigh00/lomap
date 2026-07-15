import { useMemo } from 'react'
import { useProjectStore } from '@store/projectStore'
import { runConstraints } from '@constraints/engine'
import type { Conflict } from '@constraints/types'

/**
 * Live validation results for the current project. Recomputes whenever
 * `entities` changes — which includes every frame of a drag, since the
 * existing live-mutate-then-commit drag pattern (`_updateEntity` during
 * `pointermove`) already writes a fresh `entities` object on every move.
 * Nothing here is renderer- or canvas-specific: this is the same
 * `runConstraints` call the optimizer/AI will make against a candidate
 * layout, just fed the live store state instead.
 */
export function useConstraints(): Conflict[] {
  const entities = useProjectStore((s) => s.entities)
  const entityOrder = useProjectStore((s) => s.entityOrder)
  const settings = useProjectStore((s) => s.constraintSettings)

  return useMemo(() => {
    const list = entityOrder.map((id) => entities[id]).filter(Boolean)
    return runConstraints(list, entities, settings)
  }, [entities, entityOrder, settings])
}
