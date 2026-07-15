import { useProjectStore } from '@store/projectStore'
import { useCommand } from '@hooks/useCommand'
import { createAddLayerCommand, createAssignLayerCommand, createDeleteLayerCommand, createUpdateLayerCommand } from '@commands/layerCommands'

export function LayersPanel() {
  const layers = useProjectStore((s) => s.layers)
  const layerOrder = useProjectStore((s) => s.layerOrder)
  const selectedIds = useProjectStore((s) => s.selectedIds)
  const { execute } = useCommand()

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-900">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-[10px] uppercase tracking-wide text-text-muted">Capas</h2>
        <button
          onClick={() => execute(createAddLayerCommand())}
          title="Nueva capa"
          className="rounded px-1.5 text-sm text-text-secondary hover:bg-surface-700 hover:text-text-primary"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {layerOrder.map((id) => {
          const layer = layers[id]
          if (!layer) return null
          return (
            <div key={id} className="flex items-center gap-1.5 border-b border-surface-800 px-2 py-1.5 text-xs">
              <input
                type="color"
                value={layer.color}
                onChange={(e) => execute(createUpdateLayerCommand(id, { color: e.target.value }, 'Color de capa'))}
                className="h-4 w-4 shrink-0 cursor-pointer border-0 bg-transparent p-0"
              />
              <input
                value={layer.name}
                onChange={(e) => execute(createUpdateLayerCommand(id, { name: e.target.value }, 'Renombrar capa'))}
                className="min-w-0 flex-1 truncate bg-transparent text-text-primary outline-none focus:underline"
              />
              <button
                title={layer.visible ? 'Ocultar' : 'Mostrar'}
                onClick={() => execute(createUpdateLayerCommand(id, { visible: !layer.visible }, 'Visibilidad de capa'))}
                className="shrink-0 text-text-secondary hover:text-text-primary"
              >
                {layer.visible ? '👁' : '⌀'}
              </button>
              <button
                title={layer.locked ? 'Desbloquear' : 'Bloquear'}
                onClick={() => execute(createUpdateLayerCommand(id, { locked: !layer.locked }, 'Bloqueo de capa'))}
                className="shrink-0 text-text-secondary hover:text-text-primary"
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
              {selectedIds.length > 0 && (
                <button
                  title="Asignar selección a esta capa"
                  onClick={() => execute(createAssignLayerCommand(selectedIds, id))}
                  className="shrink-0 text-text-secondary hover:text-accent"
                >
                  ⇥
                </button>
              )}
              {layerOrder.length > 1 && (
                <button
                  title="Eliminar capa"
                  onClick={() => execute(createDeleteLayerCommand(id))}
                  className="shrink-0 text-text-secondary hover:text-danger"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
