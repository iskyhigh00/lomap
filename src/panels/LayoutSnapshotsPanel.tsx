import { useEffect, useState } from 'react'
import { useProjectStore } from '@store/projectStore'
import { useCommand } from '@hooks/useCommand'
import { createPasteEntitiesCommand } from '@commands/entityCommands'
import { useLayoutSnapshotStore } from '@library/layoutSnapshotStore'
import { diffLayouts, type LayoutDiffEntry } from '@optimizer/layoutDiff'
import type { StoredLayoutSnapshot } from '@persistence/db'
import { expandGroupIds } from '@selection/groupSelection'

const KIND_LABEL: Record<LayoutDiffEntry['kind'], string> = {
  added: 'Agregado',
  removed: 'Eliminado',
  moved: 'Movido',
  modified: 'Modificado',
}
const KIND_COLOR: Record<LayoutDiffEntry['kind'], string> = {
  added: 'text-ok',
  removed: 'text-danger',
  moved: 'text-accent',
  modified: 'text-warn',
}

/**
 * "Copiar layout entre proyectos" + "comparar dos layouts" (Fase 7).
 * Snapshots are plain entity arrays, global across projects (see
 * `library/layoutSnapshotStore.ts`). Pasting a snapshot reuses
 * `createPasteEntitiesCommand` unchanged — no separate cross-project import
 * logic — and comparing reuses `optimizer/layoutDiff.ts`'s pure diff, with
 * "resaltar diferencias" implemented as selecting every differing entity so
 * the existing (already-shared, 2D+3D) selection highlight does the work
 * instead of a second highlight-rendering system.
 */
export function LayoutSnapshotsPanel() {
  const snapshots = useLayoutSnapshotStore((s) => s.snapshots)
  const load = useLayoutSnapshotStore((s) => s.load)
  const saveSnapshot = useLayoutSnapshotStore((s) => s.saveSnapshot)
  const removeSnapshot = useLayoutSnapshotStore((s) => s.removeSnapshot)

  const entities = useProjectStore((s) => s.entities)
  const entityOrder = useProjectStore((s) => s.entityOrder)
  const selectedIds = useProjectStore((s) => s.selectedIds)
  const setSelection = useProjectStore((s) => s.setSelection)
  const { execute } = useCommand()

  const [compareTarget, setCompareTarget] = useState<StoredLayoutSnapshot | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  const currentEntityList = () => entityOrder.map((id) => entities[id]).filter(Boolean)

  const diff = compareTarget ? diffLayouts(compareTarget.entities, currentEntityList()) : null

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border px-3 py-2">
        <h2 className="mb-2 text-[10px] uppercase tracking-wide text-text-muted">Layouts</h2>
        <button
          onClick={() => {
            const name = window.prompt('Nombre del layout')
            if (!name?.trim()) return
            const list =
              selectedIds.length > 0
                ? expandGroupIds(entities, selectedIds)
                    .map((id) => entities[id])
                    .filter(Boolean)
                : currentEntityList()
            void saveSnapshot(name.trim(), list)
          }}
          className="w-full rounded border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface-700 hover:text-text-primary"
        >
          {selectedIds.length > 0 ? `Guardar selección (${selectedIds.length})…` : 'Guardar layout completo…'}
        </button>
      </div>

      {snapshots.length === 0 ? (
        <p className="px-3 py-3 text-xs text-text-muted">Sin layouts guardados todavía.</p>
      ) : (
        <div>
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="border-b border-surface-800 px-3 py-2 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="min-w-0 flex-1 truncate text-text-primary">{snapshot.name}</span>
                <span className="shrink-0 text-[10px] text-text-muted">{snapshot.entities.length} obj.</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => execute(createPasteEntitiesCommand(snapshot.entities, 30, 30, `Pegar ${snapshot.name}`))}
                  className="flex-1 rounded border border-border px-1.5 py-1 text-text-secondary hover:bg-surface-700 hover:text-text-primary"
                >
                  Pegar aquí
                </button>
                <button
                  onClick={() => setCompareTarget(compareTarget?.id === snapshot.id ? null : snapshot)}
                  className={`flex-1 rounded border px-1.5 py-1 ${
                    compareTarget?.id === snapshot.id ? 'border-accent bg-accent/20 text-text-primary' : 'border-border text-text-secondary hover:bg-surface-700 hover:text-text-primary'
                  }`}
                >
                  Comparar
                </button>
                <button
                  onClick={() => void removeSnapshot(snapshot.id)}
                  className="rounded border border-border px-1.5 py-1 text-text-muted hover:text-danger"
                  title="Eliminar layout guardado"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {diff && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-[10px] uppercase tracking-wide text-text-muted">
              Diferencias vs. "{compareTarget!.name}" ({diff.length})
            </h3>
            {diff.length > 0 && (
              <button
                onClick={() => setSelection(diff.filter((d) => d.kind !== 'removed').map((d) => d.entityId))}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-surface-700"
              >
                Resaltar
              </button>
            )}
          </div>
          {diff.length === 0 ? (
            <p className="px-3 py-3 text-xs text-text-muted">Sin diferencias.</p>
          ) : (
            diff.map((entry) => (
              <div key={`${entry.entityId}-${entry.kind}`} className="flex items-center justify-between border-b border-surface-800 px-3 py-1.5 text-xs">
                <span className="min-w-0 flex-1 truncate text-text-secondary">{entry.name}</span>
                <span className={`shrink-0 text-[10px] uppercase ${KIND_COLOR[entry.kind]}`}>{KIND_LABEL[entry.kind]}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
