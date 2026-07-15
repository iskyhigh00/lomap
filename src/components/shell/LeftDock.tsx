import { useState } from 'react'
import { LayersPanel } from '@panels/LayersPanel'
import { BlueprintPanel } from '@blueprint/BlueprintPanel'

type Tab = 'layers' | 'blueprints'

export function LeftDock() {
  const [tab, setTab] = useState<Tab>('layers')

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
      </div>
      {tab === 'layers' ? <LayersPanel /> : <BlueprintPanel />}
    </div>
  )
}
