import { useState } from 'react'
import { LayersPanel } from '@panels/LayersPanel'
import { BlueprintPanel } from '@blueprint/BlueprintPanel'
import { ValidationPanel } from '@panels/ValidationPanel'
import { LibraryPanel } from '@panels/LibraryPanel'
import { LayoutStatsPanel } from '@panels/LayoutStatsPanel'
import { LayoutSnapshotsPanel } from '@panels/LayoutSnapshotsPanel'
import { useConstraints } from '@hooks/useConstraints'

type Tab = 'layers' | 'blueprints' | 'validation' | 'library' | 'stats' | 'layouts'

const TABS: { id: Tab; label: string }[] = [
  { id: 'layers', label: 'Capas' },
  { id: 'blueprints', label: 'Planos' },
  { id: 'library', label: 'Biblioteca' },
  { id: 'stats', label: 'Stats' },
  { id: 'layouts', label: 'Layouts' },
  { id: 'validation', label: 'Validación' },
]

export function LeftDock() {
  const [tab, setTab] = useState<Tab>('layers')
  const conflicts = useConstraints()
  const errorCount = conflicts.filter((c) => c.severity === 'error').length

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-900">
      <div className="flex flex-wrap border-b border-border text-[10px] uppercase tracking-wide">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex-1 basis-1/3 py-1.5 ${tab === id ? 'border-b-2 border-accent text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            {label}
            {id === 'validation' && conflicts.length > 0 && (
              <span
                className={`ml-1 rounded-full px-1.5 text-[9px] normal-case ${errorCount > 0 ? 'bg-danger text-white' : 'bg-warn text-surface-950'}`}
              >
                {conflicts.length}
              </span>
            )}
          </button>
        ))}
      </div>
      {tab === 'layers' && <LayersPanel />}
      {tab === 'blueprints' && <BlueprintPanel />}
      {tab === 'validation' && <ValidationPanel />}
      {tab === 'library' && <LibraryPanel />}
      {tab === 'stats' && <LayoutStatsPanel />}
      {tab === 'layouts' && <LayoutSnapshotsPanel />}
    </div>
  )
}
