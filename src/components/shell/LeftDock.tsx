import { useState } from 'react'
import { LayersPanel } from '@panels/LayersPanel'
import { BlueprintPanel } from '@blueprint/BlueprintPanel'
import { ValidationPanel } from '@panels/ValidationPanel'
import { useConstraints } from '@hooks/useConstraints'

type Tab = 'layers' | 'blueprints' | 'validation'

export function LeftDock() {
  const [tab, setTab] = useState<Tab>('layers')
  const conflicts = useConstraints()
  const errorCount = conflicts.filter((c) => c.severity === 'error').length

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-900">
      <div className="flex border-b border-border text-[10px] uppercase tracking-wide">
        <button
          onClick={() => setTab('layers')}
          className={`flex-1 py-1.5 ${tab === 'layers' ? 'border-b-2 border-accent text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
        >
          Capas
        </button>
        <button
          onClick={() => setTab('blueprints')}
          className={`flex-1 py-1.5 ${tab === 'blueprints' ? 'border-b-2 border-accent text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
        >
          Planos
        </button>
        <button
          onClick={() => setTab('validation')}
          className={`relative flex-1 py-1.5 ${tab === 'validation' ? 'border-b-2 border-accent text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
        >
          Validación
          {conflicts.length > 0 && (
            <span
              className={`ml-1 rounded-full px-1.5 text-[9px] normal-case ${errorCount > 0 ? 'bg-danger text-white' : 'bg-warn text-surface-950'}`}
            >
              {conflicts.length}
            </span>
          )}
        </button>
      </div>
      {tab === 'layers' && <LayersPanel />}
      {tab === 'blueprints' && <BlueprintPanel />}
      {tab === 'validation' && <ValidationPanel />}
    </div>
  )
}
