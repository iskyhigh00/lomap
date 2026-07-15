import { useMemo } from 'react'
import { useProjectStore } from '@store/projectStore'
import { computeLayoutStats } from '@optimizer/layoutStats'

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-surface-800 px-3 py-2 text-xs">
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono text-text-primary">{value}</span>
    </div>
  )
}

const fmt = (n: number | null, digits = 1) => (n === null ? '—' : n.toLocaleString('es', { maximumFractionDigits: digits }))

/** Live layout statistics (Fase 7) — recomputed from `computeLayoutStats`
 * (`optimizer/layoutStats.ts`) on every entity change, the same way
 * `useConstraints` recomputes conflicts live during a drag. */
export function LayoutStatsPanel() {
  const entities = useProjectStore((s) => s.entities)
  const entityOrder = useProjectStore((s) => s.entityOrder)

  const stats = useMemo(() => {
    const list = entityOrder.map((id) => entities[id]).filter(Boolean)
    return computeLayoutStats(list, entities)
  }, [entities, entityOrder])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-[10px] uppercase tracking-wide text-text-muted">Estadísticas del layout</h2>
      </div>
      <StatRow label="Máquinas" value={String(stats.machineCount)} />
      <StatRow label="Islas" value={String(stats.islandCount)} />
      <StatRow label="Área ocupada" value={`${fmt(stats.occupiedAreaM2)} m²`} />
      <StatRow label="Área total (perímetro)" value={stats.totalAreaM2 === null ? '—' : `${fmt(stats.totalAreaM2)} m²`} />
      <StatRow label="Área libre" value={stats.freeAreaM2 === null ? '—' : `${fmt(stats.freeAreaM2)} m²`} />
      <StatRow label="Densidad" value={stats.densityPerM2 === null ? '—' : `${fmt(stats.densityPerM2, 2)} máq/m²`} />
      <StatRow label="Ocupación" value={stats.occupancyPercent === null ? '—' : `${fmt(stats.occupancyPercent)}%`} />
      {stats.totalAreaM2 === null && (
        <p className="px-3 py-3 text-[11px] text-text-muted">Dibuja un perímetro para ver área total, libre, densidad y ocupación.</p>
      )}
    </div>
  )
}
