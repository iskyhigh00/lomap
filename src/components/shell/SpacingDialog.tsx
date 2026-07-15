import { useState } from 'react'

/** Small modal for "Espaciado uniforme" (Fase 7): an exact gap value +
 * axis, applied to the current selection on confirm. Mirrors ArrayDialog's
 * style/interaction pattern. */
export function SpacingDialog({
  onApply,
  onClose,
}: {
  onApply: (axis: 'x' | 'y', spacing: number) => void
  onClose: () => void
}) {
  const [axis, setAxis] = useState<'x' | 'y'>('x')
  const [spacing, setSpacing] = useState(50)

  const inputClass = 'w-full rounded border border-border bg-surface-800 px-2 py-1 text-xs text-text-primary outline-none focus:border-accent'

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-72 rounded border border-border bg-surface-900 p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-medium text-text-primary">Espaciado uniforme</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-text-secondary">
            Eje
            <select className={`${inputClass} mt-1`} value={axis} onChange={(e) => setAxis(e.target.value as 'x' | 'y')}>
              <option value="x">Horizontal</option>
              <option value="y">Vertical</option>
            </select>
          </label>
          <label className="text-xs text-text-secondary">
            Espaciado (cm)
            <input
              type="number"
              min={0}
              className={`${inputClass} mt-1`}
              value={spacing}
              onChange={(e) => setSpacing(Math.max(0, Number(e.target.value)))}
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-700 hover:text-text-primary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
            onClick={() => onApply(axis, spacing)}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
