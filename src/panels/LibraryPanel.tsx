import { useEffect, useMemo, useState } from 'react'
import { useIslandLibraryStore } from '@library/islandLibraryStore'
import type { StoredIslandTemplate } from '@persistence/db'

/** MIME type used for the drag payload — Canvas2D's `onDrop` reads it back
 * to know which template was dropped (see Canvas2D.tsx's `handleDrop`). */
export const ISLAND_TEMPLATE_DND_TYPE = 'application/x-casino-island-template'

function TemplateCard({ template }: { template: StoredIslandTemplate }) {
  const removeTemplate = useIslandLibraryStore((s) => s.removeTemplate)
  const toggleFavorite = useIslandLibraryStore((s) => s.toggleFavorite)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(ISLAND_TEMPLATE_DND_TYPE, template.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group relative flex cursor-grab flex-col overflow-hidden rounded border border-border bg-surface-800 active:cursor-grabbing"
      title="Arrastra al lienzo para insertar"
    >
      <div className="flex h-20 items-center justify-center bg-surface-900">
        {template.thumbnail ? (
          <img src={template.thumbnail} alt="" className="h-full w-full object-contain p-1" draggable={false} />
        ) : (
          <span className="text-2xl text-text-muted">⠿</span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          void toggleFavorite(template.id)
        }}
        title={template.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
        className={`absolute right-1 top-1 rounded px-1 text-sm ${template.favorite ? 'text-warn' : 'text-text-muted opacity-0 group-hover:opacity-100'}`}
      >
        {template.favorite ? '★' : '☆'}
      </button>
      <div className="flex items-center gap-1 px-2 py-1.5 text-xs">
        <span className="min-w-0 flex-1 truncate text-text-primary">{template.name}</span>
        <span className="shrink-0 text-[10px] text-text-muted">{template.machines.length} máq.</span>
        <button
          onClick={() => void removeTemplate(template.id)}
          className="shrink-0 rounded px-1 text-text-muted opacity-0 hover:text-danger group-hover:opacity-100"
          title="Eliminar de la biblioteca"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/** Reusable island library (Fase 7, visual refresh in the "sentirse como
 * app comercial" pass). Templates are saved from the properties panel
 * ("Guardar en biblioteca…" on a selected island) and dropped back onto the
 * canvas here. Global across projects (see `persistence/db.ts`), not tied
 * to the current one. */
export function LibraryPanel() {
  const templates = useIslandLibraryStore((s) => s.templates)
  const load = useIslandLibraryStore((s) => s.load)
  const [onlyFavorites, setOnlyFavorites] = useState(false)

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(() => {
    const filtered = onlyFavorites ? templates.filter((t) => t.favorite) : templates
    const byCategory = new Map<string, StoredIslandTemplate[]>()
    for (const template of filtered) {
      const category = template.category || 'General'
      const list = byCategory.get(category) ?? []
      list.push(template)
      byCategory.set(category, list)
    }
    return [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [templates, onlyFavorites])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-[10px] uppercase tracking-wide text-text-muted">Biblioteca de islas</h2>
        <button
          onClick={() => setOnlyFavorites((v) => !v)}
          className={`rounded px-1.5 py-0.5 text-[10px] ${onlyFavorites ? 'bg-accent/20 text-warn' : 'text-text-muted hover:text-text-primary'}`}
          title="Mostrar solo favoritos"
        >
          {onlyFavorites ? '★ Favoritos' : '☆ Favoritos'}
        </button>
      </div>
      {templates.length === 0 ? (
        <p className="px-3 py-3 text-xs text-text-muted">
          Selecciona una isla y usa "Guardar en biblioteca…" en su panel de propiedades para empezar.
        </p>
      ) : groups.length === 0 ? (
        <p className="px-3 py-3 text-xs text-text-muted">Sin favoritos todavía.</p>
      ) : (
        <div className="flex flex-col gap-3 p-3">
          {groups.map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-1.5 text-[10px] uppercase tracking-wide text-text-muted">
                {category} <span className="text-text-muted/60">({items.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {items.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
