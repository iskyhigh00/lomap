import { useState } from 'react'
import { useProjectStore } from '@store/projectStore'
import { useCommand, useHistoryState } from '@hooks/useCommand'

const MENUS = ['Proyecto', 'Editar', 'Ver', 'Insertar', 'Herramientas', 'Optimización', 'IA', 'Exportar', 'Configuración']

export function TopBar() {
  const projectName = useProjectStore((s) => s.projectName)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const { undo, redo } = useCommand()
  const { canUndo, canRedo } = useHistoryState()

  return (
    <header className="flex h-10 shrink-0 items-center border-b border-border bg-surface-900 px-2 text-sm select-none">
      <div className="mr-4 flex items-center gap-2 px-2 font-semibold tracking-tight text-text-primary">
        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
        Casino Layout Studio
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
              <div className="absolute left-0 top-full z-20 min-w-[180px] rounded-b border border-border bg-surface-800 py-1 shadow-xl">
                <div className="px-3 py-1.5 text-xs text-text-muted">Próximamente</div>
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1 px-2">
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
