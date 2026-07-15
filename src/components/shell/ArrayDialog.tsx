import { useState } from 'react'

/** Small modal for the rectangular Array tool: rows/cols + spacing, applied
 * to the current selection on confirm. */
export function ArrayDialog({
  onApply,
  onClose,
}: {
  onApply: (rows: number, cols: number, dx: number, dy: number) => void
  onClose: () => void
}) {
  const [rows, setRows] = useState(2)
  const [cols, setCols] = useState(2)
  const [dx, setDx] = useState(100)
  const [dy, setDy] = useState(100)

  const inputClass = 'w-full rounded border border-border bg-surface-800 px-2 py-1 text-xs text-text-primary outline-none focus:border-accent'

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-72 rounded border border-border bg-surface-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-sm font-medium text-text-primary">Matriz (Array)</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-text-secondary">
            Filas
            <input
              type="number"
              min={1}
              className={`${inputClass} mt-1`}
              value={rows}
              onChange={(e) => setRows(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label className="text-xs text-text-secondary">
            Columnas
            <input
              type="number"
              min={1}
              className={`${inputClass} mt-1`}
              value={cols}
              onChange={(e) => setCols(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label className="text-xs text-text-secondary">
            Espaciado X (cm)
            <input type="number" className={`${inputClass} mt-1`} value={dx} onChange={(e) => setDx(Number(e.target.value))} />
          </label>
          <label className="text-xs text-text-secondary">
            Espaciado Y (cm)
            <input type="number" className={`${inputClass} mt-1`} value={dy} onChange={(e) => setDy(Number(e.target.value))} />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-700 hover:text-text-primary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
            onClick={() => onApply(rows, cols, dx, dy)}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
