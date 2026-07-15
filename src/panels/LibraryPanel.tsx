import { useEffect } from 'react'
import { useIslandLibraryStore } from '@library/islandLibraryStore'
import type { StoredIslandTemplate } from '@persistence/db'

/** MIME type used for the drag payload — Canvas2D's `onDrop` reads it back
 * to know which template was dropped (see Canvas2D.tsx's `handleDrop`). */
export const ISLAND_TEMPLATE_DND_TYPE = 'application/x-casino-island-template'

function TemplateCard({ template }: { template: StoredIslandTemplate }) {
  const removeTemplate = useIslandLibraryStore((s) => s.removeTemplate)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(ISLAND_TEMPLATE_DND_TYPE, template.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group flex cursor-grab items-center gap-2 border-b border-surface-800 px-3 py-2 text-xs active:cursor-grabbing"
      title="Arrastra al lienzo para insertar"
    >
      <span className="text-base text-text-muted">⠿</span>
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
  )
}

/** Reusable island library (Fase 7) — templates are saved from the
 * properties panel ("Guardar en biblioteca…" on a selected island) and
 * dropped back onto the canvas here. Global across projects (see
 * `persistence/db.ts`'s `StoredIslandTemplate`), not tied to the current
 * one. */
export function LibraryPanel() {
  const templates = useIslandLibraryStore((s) => s.templates)
  const load = useIslandLibraryStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-[10px] uppercase tracking-wide text-text-muted">Biblioteca de islas</h2>
      </div>
      {templates.length === 0 ? (
        <p className="px-3 py-3 text-xs text-text-muted">
          Selecciona una isla y usa "Guardar en biblioteca…" en su panel de propiedades para empezar.
        </p>
      ) : (
        <div>
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  )
}
