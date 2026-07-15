import { useRef, useState } from 'react'
import { useBlueprintStore } from './blueprintStore'
import {
  createDeleteBlueprintCommand,
  createImportBlueprintCommand,
  createUpdateBlueprintCommand,
  executeBlueprintCommand,
} from './blueprintCommands'
import { WORLD_UNIT } from '@engine/coords/projectCoordinateSystem'

const inputClass =
  'w-20 rounded border border-border bg-surface-800 px-1.5 py-1 text-right text-xs text-text-primary outline-none focus:border-accent'

export function BlueprintPanel() {
  const documents = useBlueprintStore((s) => s.documents)
  const order = useBlueprintStore((s) => s.order)
  const activeId = useBlueprintStore((s) => s.activeId)
  const setActiveId = useBlueprintStore((s) => s.setActiveId)
  const setCalibratingId = useBlueprintStore((s) => s.setCalibratingId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleImport = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setImportError(null)
    try {
      const command = await createImportBlueprintCommand(file)
      executeBlueprintCommand(command)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo importar el archivo.')
    }
  }

  const activeDoc = activeId ? documents[activeId] : null

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-[10px] uppercase tracking-wide text-text-muted">Planos</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Importar plano"
          className="rounded px-1.5 text-sm text-text-secondary hover:bg-surface-700 hover:text-text-primary"
        >
          +
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            void handleImport(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {importError && <p className="border-b border-border px-3 py-2 text-xs text-danger">{importError}</p>}

      <div>
        {order.map((id) => {
          const doc = documents[id]
          if (!doc) return null
          return (
            <div
              key={id}
              onClick={() => setActiveId(id)}
              className={`flex cursor-pointer items-center gap-1.5 border-b border-surface-800 px-2 py-1.5 text-xs ${
                activeId === id ? 'bg-surface-800' : ''
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-text-primary">{doc.name}</span>
              <button
                title={doc.visible ? 'Ocultar' : 'Mostrar'}
                onClick={(e) => {
                  e.stopPropagation()
                  executeBlueprintCommand(createUpdateBlueprintCommand(id, { visible: !doc.visible }, 'Visibilidad de plano'))
                }}
                className="shrink-0 text-text-secondary hover:text-text-primary"
              >
                {doc.visible ? '👁' : '⌀'}
              </button>
              <button
                title={doc.locked ? 'Desbloquear' : 'Bloquear'}
                onClick={(e) => {
                  e.stopPropagation()
                  executeBlueprintCommand(createUpdateBlueprintCommand(id, { locked: !doc.locked }, 'Bloqueo de plano'))
                }}
                className="shrink-0 text-text-secondary hover:text-text-primary"
              >
                {doc.locked ? '🔒' : '🔓'}
              </button>
            </div>
          )
        })}
        {order.length === 0 && <p className="px-3 py-3 text-xs text-text-muted">Sin planos importados.</p>}
      </div>

      {activeDoc && (
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <h3 className="text-[10px] uppercase tracking-wide text-text-muted">Ajustes del plano</h3>

          <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">Opacidad</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={activeDoc.opacity}
              onChange={(e) => executeBlueprintCommand(createUpdateBlueprintCommand(activeDoc.id, { opacity: Number(e.target.value) }, 'Opacidad de plano'))}
              className="flex-1"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">Brillo</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={activeDoc.brightness}
              onChange={(e) => executeBlueprintCommand(createUpdateBlueprintCommand(activeDoc.id, { brightness: Number(e.target.value) }, 'Brillo de plano'))}
              className="flex-1"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">Contraste</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={activeDoc.contrast}
              onChange={(e) => executeBlueprintCommand(createUpdateBlueprintCommand(activeDoc.id, { contrast: Number(e.target.value) }, 'Contraste de plano'))}
              className="flex-1"
            />
          </label>

          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Rotación°</span>
            <input
              type="number"
              className={inputClass}
              value={Math.round((activeDoc.transform.rotation * 180) / Math.PI)}
              onChange={(e) =>
                executeBlueprintCommand(
                  createUpdateBlueprintCommand(
                    activeDoc.id,
                    { transform: { ...activeDoc.transform, rotation: (Number(e.target.value) * Math.PI) / 180 } },
                    'Rotar plano',
                  ),
                )
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">Escala %</span>
            <input
              type="number"
              className={inputClass}
              value={Math.round(activeDoc.transform.scaleX * 100)}
              onChange={(e) => {
                const scale = Number(e.target.value) / 100
                executeBlueprintCommand(
                  createUpdateBlueprintCommand(activeDoc.id, { transform: { ...activeDoc.transform, scaleX: scale, scaleY: scale } }, 'Escalar plano'),
                )
              }}
            />
          </div>

          <button
            onClick={() => setCalibratingId(activeDoc.id)}
            className="rounded border border-border px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-700 hover:text-text-primary"
          >
            Calibrar escala (2 puntos)
          </button>
          {activeDoc.calibration && (
            <p className="text-[10px] text-text-muted">
              Última calibración: {activeDoc.calibration.knownDistance.toFixed(0)} {WORLD_UNIT}
            </p>
          )}

          <button
            onClick={async () => executeBlueprintCommand(await createDeleteBlueprintCommand(activeDoc.id))}
            className="rounded bg-danger/20 px-2 py-1.5 text-xs font-medium text-danger hover:bg-danger/30"
          >
            Eliminar plano
          </button>
        </div>
      )}
    </div>
  )
}
