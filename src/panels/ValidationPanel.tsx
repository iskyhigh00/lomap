import { useProjectStore } from '@store/projectStore'
import { useConstraints } from '@hooks/useConstraints'
import type { Conflict } from '@constraints/types'

const RULE_LABEL: Record<string, string> = {
  collision: 'Colisión',
  corridor: 'Pasillo mínimo',
  clearance: 'Distancia mínima',
}

function ConflictRow({ conflict }: { conflict: Conflict }) {
  const requestFocus = useProjectStore((s) => s.requestFocus)
  const color = conflict.severity === 'error' ? 'bg-danger' : 'bg-warn'

  return (
    <button
      onClick={() => requestFocus(conflict.entityIds[0])}
      className="flex w-full items-start gap-2 border-b border-surface-800 px-3 py-2 text-left text-xs hover:bg-surface-700"
    >
      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${color}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] uppercase tracking-wide text-text-muted">{RULE_LABEL[conflict.ruleId] ?? conflict.ruleId}</span>
        <span className="text-text-secondary">{conflict.message}</span>
      </span>
    </button>
  )
}

export function ValidationPanel() {
  const conflicts = useConstraints()
  const settings = useProjectStore((s) => s.constraintSettings)
  const setSettings = useProjectStore((s) => s.setConstraintSettings)

  const errors = conflicts.filter((c) => c.severity === 'error')
  const warnings = conflicts.filter((c) => c.severity === 'warning')

  const inputClass =
    'w-16 rounded border border-border bg-surface-800 px-1.5 py-0.5 text-right text-xs text-text-primary outline-none focus:border-accent'

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border px-3 py-2">
        <h2 className="mb-2 text-[10px] uppercase tracking-wide text-text-muted">Restricciones</h2>
        <label className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-text-secondary">
          Pasillo mínimo (cm)
          <input
            type="number"
            min={0}
            className={inputClass}
            value={settings.minCorridorWidth}
            onChange={(e) => setSettings({ minCorridorWidth: Math.max(0, Number(e.target.value)) })}
          />
        </label>
        <label className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-text-secondary">
          Distancia a muros (cm)
          <input
            type="number"
            min={0}
            className={inputClass}
            value={settings.minWallDistance}
            onChange={(e) => setSettings({ minWallDistance: Math.max(0, Number(e.target.value)) })}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-[11px] text-text-secondary">
          Distancia a pilares (cm)
          <input
            type="number"
            min={0}
            className={inputClass}
            value={settings.minPillarDistance}
            onChange={(e) => setSettings({ minPillarDistance: Math.max(0, Number(e.target.value)) })}
          />
        </label>
      </div>

      <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1 text-danger">
          <span className="h-2 w-2 rounded-full bg-danger" /> {errors.length} errores
        </span>
        <span className="flex items-center gap-1 text-warn">
          <span className="h-2 w-2 rounded-full bg-warn" /> {warnings.length} advertencias
        </span>
      </div>

      {conflicts.length === 0 ? (
        <p className="px-3 py-3 text-xs text-text-muted">Sin conflictos detectados.</p>
      ) : (
        <div>
          {[...errors, ...warnings].map((conflict) => (
            <ConflictRow key={conflict.id} conflict={conflict} />
          ))}
        </div>
      )}
    </div>
  )
}
