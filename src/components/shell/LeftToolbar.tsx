import { useProjectStore, type ToolId } from '@store/projectStore'

interface ToolDef {
  id: ToolId
  label: string
  icon: string
}

const TOOL_GROUPS: ToolDef[][] = [
  [
    { id: 'select', label: 'Seleccionar', icon: '⭆' },
    { id: 'pan', label: 'Mover vista', icon: '✋' },
    { id: 'move', label: 'Mover', icon: '✥' },
    { id: 'rotate', label: 'Rotar', icon: '⟳' },
    { id: 'scale', label: 'Escalar', icon: '⤢' },
  ],
  [
    { id: 'measure', label: 'Medir', icon: '📏' },
  ],
  [
    { id: 'perimeter', label: 'Perímetro', icon: '▱' },
    { id: 'wall', label: 'Muro', icon: '▤' },
    { id: 'pillar', label: 'Pilar', icon: '▪' },
    { id: 'zone', label: 'Zona', icon: '▧' },
  ],
  [
    { id: 'machine', label: 'Máquina', icon: '▭' },
    { id: 'island', label: 'Isla', icon: '▦' },
  ],
]

export function LeftToolbar() {
  const activeTool = useProjectStore((s) => s.activeTool)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)

  return (
    <aside className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-border bg-surface-900 py-2">
      {TOOL_GROUPS.map((group, groupIndex) => (
        <div key={groupIndex} className="flex w-full flex-col items-center gap-0.5 border-b border-surface-800 pb-2 last:border-b-0">
          {group.map((tool) => (
            <button
              key={tool.id}
              title={tool.label}
              onClick={() => setActiveTool(tool.id)}
              className={`flex h-9 w-9 items-center justify-center rounded text-base transition-colors ${
                activeTool === tool.id
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-surface-700 hover:text-text-primary'
              }`}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      ))}
    </aside>
  )
}
