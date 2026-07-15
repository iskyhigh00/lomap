import { useState } from 'react'
import { useProjectStore } from '@store/projectStore'
import { useCommand, useHistoryState } from '@hooks/useCommand'
import { createAlignEntitiesCommand, createArrayCommand, type AlignMode } from '@commands/cadCommands'
import { createDistributeCommand, createSmartRotateCommand, createUniformSpacingCommand } from '@commands/layoutCommands'
import { ArrayDialog } from './ArrayDialog'
import { SpacingDialog } from './SpacingDialog'

const MENUS = ['Proyecto', 'Editar', 'Ver', 'Insertar', 'Herramientas', 'Optimización', 'IA', 'Exportar', 'Configuración']

const ALIGN_ITEMS: { mode: AlignMode; label: string }[] = [
  { mode: 'left', label: 'Alinear a la izquierda' },
  { mode: 'right', label: 'Alinear a la derecha' },
  { mode: 'top', label: 'Alinear arriba' },
  { mode: 'bottom', label: 'Alinear abajo' },
  { mode: 'center-h', label: 'Centrar horizontalmente' },
  { mode: 'center-v', label: 'Centrar verticalmente' },
]

export function TopBar() {
  const projectName = useProjectStore((s) => s.projectName)
  const selectedIds = useProjectStore((s) => s.selectedIds)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)
  const viewMode = useProjectStore((s) => s.viewMode)
  const setViewMode = useProjectStore((s) => s.setViewMode)
  const entities = useProjectStore((s) => s.entities)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [arrayDialogOpen, setArrayDialogOpen] = useState(false)
  const [spacingDialogOpen, setSpacingDialogOpen] = useState(false)
  const { execute, undo, redo } = useCommand()
  const { canUndo, canRedo } = useHistoryState()

  const selectedIslandCount = selectedIds.filter((id) => entities[id]?.type === 'island').length
  const singleSelectedIsland = selectedIslandCount === 1 ? selectedIds.find((id) => entities[id]?.type === 'island') : null

  const menuItemClass = (disabled: boolean) =>
    `block w-full px-3 py-1.5 text-left text-xs transition-colors ${
      disabled ? 'cursor-not-allowed text-text-muted/50' : 'text-text-secondary hover:bg-surface-700 hover:text-text-primary'
    }`

  const renderMenuContent = (menu: string) => {
    if (menu !== 'Herramientas') {
      return <div className="px-3 py-1.5 text-xs text-text-muted">Próximamente</div>
    }
    return (
      <>
        <button className={menuItemClass(false)} onClick={() => setActiveTool('offset')}>
          Offset
        </button>
        <button className={menuItemClass(false)} onClick={() => setActiveTool('trim')}>
          Recortar (Trim)
        </button>
        <button className={menuItemClass(false)} onClick={() => setActiveTool('extend')}>
          Extender (Extend)
        </button>
        <button className={menuItemClass(false)} onClick={() => setActiveTool('fillet')}>
          Unión de esquina (Fillet)
        </button>
        <button
          className={menuItemClass(selectedIds.length === 0)}
          disabled={selectedIds.length === 0}
          onClick={() => setActiveTool('mirror')}
        >
          Espejo (Mirror)
        </button>
        <div className="my-1 border-t border-border" />
        <button
          className={menuItemClass(selectedIds.length === 0)}
          disabled={selectedIds.length === 0}
          onClick={() => setArrayDialogOpen(true)}
        >
          Matriz (Array)…
        </button>
        <div className="my-1 border-t border-border" />
        {ALIGN_ITEMS.map(({ mode, label }) => (
          <button
            key={mode}
            className={menuItemClass(selectedIds.length < 2)}
            disabled={selectedIds.length < 2}
            onClick={() => {
              const command = createAlignEntitiesCommand(selectedIds, mode)
              if (command) execute(command)
            }}
          >
            {label}
          </button>
        ))}
        <div className="my-1 border-t border-border" />
        <button
          className={menuItemClass(selectedIds.length < 3)}
          disabled={selectedIds.length < 3}
          onClick={() => {
            const command = createDistributeCommand(selectedIds, 'x')
            if (command) execute(command)
          }}
        >
          Distribuir horizontalmente
        </button>
        <button
          className={menuItemClass(selectedIds.length < 3)}
          disabled={selectedIds.length < 3}
          onClick={() => {
            const command = createDistributeCommand(selectedIds, 'y')
            if (command) execute(command)
          }}
        >
          Distribuir verticalmente
        </button>
        <button
          className={menuItemClass(selectedIds.length < 2)}
          disabled={selectedIds.length < 2}
          onClick={() => setSpacingDialogOpen(true)}
        >
          Espaciado uniforme…
        </button>
        <div className="my-1 border-t border-border" />
        <button
          className={menuItemClass(!singleSelectedIsland)}
          disabled={!singleSelectedIsland}
          title="Rota la isla seleccionada para alinearla con el muro más cercano"
          onClick={() => {
            if (!singleSelectedIsland) return
            const command = createSmartRotateCommand(singleSelectedIsland)
            if (command) execute(command)
          }}
        >
          Rotación inteligente (a muro cercano)
        </button>
      </>
    )
  }

  return (
    <header className="flex h-10 shrink-0 items-center border-b border-border bg-surface-900 px-2 text-sm select-none">
      <div className="mr-4 flex items-center gap-2 px-2 font-semibold tracking-tight text-text-primary">
        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
        Casino Layout Studio
        <span className="rounded bg-surface-700 px-1.5 py-0.5 font-mono text-[10px] font-normal text-text-muted" title="Versión de la aplicación">
          v{__APP_VERSION__}
        </span>
      </div>
      <nav className="flex h-full items-center">
        {MENUS.map((menu) => (
          <div key={menu} className="relative h-full">
            <button
              className={`h-full px-3 text-xs text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary ${
                openMenu === menu ? 'bg-surface-700 text-text-primary' : ''
              }`}
              onClick={() => setOpenMenu(openMenu === menu ? null : menu)}
              onBlur={() => setTimeout(() => setOpenMenu(null), 120)}
            >
              {menu}
            </button>
            {openMenu === menu && (
              <div className="absolute left-0 top-full z-20 min-w-[220px] rounded-b border border-border bg-surface-800 py-1 shadow-xl">
                {renderMenuContent(menu)}
              </div>
            )}
          </div>
        ))}
      </nav>
      {arrayDialogOpen && (
        <ArrayDialog
          onClose={() => setArrayDialogOpen(false)}
          onApply={(rows, cols, dx, dy) => {
            const command = createArrayCommand(selectedIds, rows, cols, dx, dy)
            if (command) execute(command)
            setArrayDialogOpen(false)
          }}
        />
      )}
      {spacingDialogOpen && (
        <SpacingDialog
          onClose={() => setSpacingDialogOpen(false)}
          onApply={(axis, spacing) => {
            const command = createUniformSpacingCommand(selectedIds, axis, spacing)
            if (command) execute(command)
            setSpacingDialogOpen(false)
          }}
        />
      )}
      <div className="ml-auto flex items-center gap-1 px-2">
        <div className="mr-2 flex rounded border border-border text-xs">
          <button
            onClick={() => setViewMode('2d')}
            className={`rounded-l px-2 py-1 ${viewMode === '2d' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-700'}`}
          >
            2D
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`rounded-r px-2 py-1 ${viewMode === '3d' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-700'}`}
          >
            3D
          </button>
        </div>
        <button
          disabled={!canUndo}
          onClick={undo}
          title="Deshacer (Ctrl+Z)"
          className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface-700 hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ↶ Deshacer
        </button>
        <button
          disabled={!canRedo}
          onClick={redo}
          title="Rehacer (Ctrl+Y)"
          className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-surface-700 hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ↷ Rehacer
        </button>
        <span className="ml-3 truncate text-xs text-text-muted">{projectName}</span>
      </div>
    </header>
  )
}
