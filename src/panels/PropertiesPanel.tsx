import type { ReactNode } from 'react'
import { useProjectStore } from '@store/projectStore'
import { useCommand } from '@hooks/useCommand'
import { createUpdateEntityCommand, createDeleteEntitiesCommand } from '@commands/entityCommands'
import type { GenericEntity, IslandEntity, MachineEntity, PillarEntity, WallEntity, ZoneEntity } from '@engine/entities/types'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-text-secondary">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-28 rounded border border-border bg-surface-800 px-2 py-1 text-right text-xs text-text-primary outline-none focus:border-accent'

export function PropertiesPanel() {
  const selectedIds = useProjectStore((s) => s.selectedIds)
  const entities = useProjectStore((s) => s.entities)
  const { execute } = useCommand()

  if (selectedIds.length === 0) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-surface-900 p-4">
        <p className="text-xs text-text-muted">Selecciona un objeto para ver sus propiedades.</p>
      </aside>
    )
  }

  if (selectedIds.length > 1) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-surface-900 p-4">
        <p className="mb-3 text-xs text-text-secondary">{selectedIds.length} objetos seleccionados</p>
        <button
          onClick={() => execute(createDeleteEntitiesCommand(selectedIds))}
          className="rounded bg-danger/20 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/30"
        >
          Eliminar selección
        </button>
      </aside>
    )
  }

  const entity = entities[selectedIds[0]]
  if (!entity) return null

  const update = (patch: Partial<GenericEntity>, label?: string) =>
    execute(createUpdateEntityCommand(entity.id, patch, label ?? 'Editar propiedad'))

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-surface-900 p-4">
      <div>
        <p className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">{entity.type}</p>
        <input
          value={entity.name}
          onChange={(e) => update({ name: e.target.value }, 'Renombrar')}
          className="w-full rounded border border-border bg-surface-800 px-2 py-1 text-sm text-text-primary outline-none focus:border-accent"
        />
      </div>

      <section>
        <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Transformación</h3>
        <Field label="X">
          <input
            type="number"
            className={inputClass}
            value={Math.round(entity.transform.x)}
            onChange={(e) => update({ transform: { ...entity.transform, x: Number(e.target.value) } }, 'Mover objeto')}
          />
        </Field>
        <Field label="Y">
          <input
            type="number"
            className={inputClass}
            value={Math.round(entity.transform.y)}
            onChange={(e) => update({ transform: { ...entity.transform, y: Number(e.target.value) } }, 'Mover objeto')}
          />
        </Field>
        <Field label="Rotación°">
          <input
            type="number"
            className={inputClass}
            value={Math.round((entity.transform.rotation * 180) / Math.PI)}
            onChange={(e) =>
              update(
                { transform: { ...entity.transform, rotation: (Number(e.target.value) * Math.PI) / 180 } },
                'Rotar objeto',
              )
            }
          />
        </Field>
      </section>

      <TypeSpecificFields entity={entity} update={update} />

      <section>
        <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Estado</h3>
        <Field label="Bloqueado">
          <input type="checkbox" checked={entity.locked} onChange={(e) => update({ locked: e.target.checked }, 'Bloquear')} />
        </Field>
        <Field label="Visible">
          <input type="checkbox" checked={entity.visible} onChange={(e) => update({ visible: e.target.checked }, 'Visibilidad')} />
        </Field>
      </section>

      <section>
        <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Observaciones</h3>
        <textarea
          value={entity.notes ?? ''}
          onChange={(e) => update({ notes: e.target.value }, 'Notas')}
          rows={3}
          className="w-full rounded border border-border bg-surface-800 px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
        />
      </section>

      <button
        onClick={() => execute(createDeleteEntitiesCommand([entity.id]))}
        className="mt-auto rounded bg-danger/20 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/30"
      >
        Eliminar
      </button>
    </aside>
  )
}

function TypeSpecificFields({
  entity,
  update,
}: {
  entity: GenericEntity
  update: (patch: Partial<GenericEntity>, label?: string) => void
}) {
  switch (entity.type) {
    case 'wall': {
      const wall = entity as WallEntity
      return (
        <section>
          <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Muro</h3>
          <Field label="Espesor">
            <input
              type="number"
              className={inputClass}
              value={wall.thickness}
              onChange={(e) => update({ thickness: Number(e.target.value) } as Partial<WallEntity>, 'Espesor de muro')}
            />
          </Field>
        </section>
      )
    }
    case 'pillar': {
      const pillar = entity as PillarEntity
      return (
        <section>
          <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Pilar</h3>
          <Field label="Ancho">
            <input
              type="number"
              className={inputClass}
              value={pillar.width}
              onChange={(e) => update({ width: Number(e.target.value) } as Partial<PillarEntity>, 'Tamaño de pilar')}
            />
          </Field>
          <Field label="Profundidad">
            <input
              type="number"
              className={inputClass}
              value={pillar.depth}
              onChange={(e) => update({ depth: Number(e.target.value) } as Partial<PillarEntity>, 'Tamaño de pilar')}
            />
          </Field>
        </section>
      )
    }
    case 'zone': {
      const zone = entity as ZoneEntity
      return (
        <section>
          <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Zona</h3>
          <Field label="Restringida">
            <input
              type="checkbox"
              checked={zone.restricted}
              onChange={(e) => update({ restricted: e.target.checked } as Partial<ZoneEntity>, 'Zona restringida')}
            />
          </Field>
          <Field label="Color">
            <input
              type="color"
              value={zone.color}
              onChange={(e) => update({ color: e.target.value } as Partial<ZoneEntity>, 'Color de zona')}
            />
          </Field>
        </section>
      )
    }
    case 'machine': {
      const machine = entity as MachineEntity
      return (
        <section>
          <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Máquina</h3>
          <Field label="Fabricante">
            <input
              className={inputClass}
              value={machine.manufacturer}
              onChange={(e) => update({ manufacturer: e.target.value } as Partial<MachineEntity>, 'Fabricante')}
            />
          </Field>
          <Field label="Modelo">
            <input
              className={inputClass}
              value={machine.model}
              onChange={(e) => update({ model: e.target.value } as Partial<MachineEntity>, 'Modelo')}
            />
          </Field>
          <Field label="Ancho">
            <input
              type="number"
              className={inputClass}
              value={machine.width}
              onChange={(e) => update({ width: Number(e.target.value) } as Partial<MachineEntity>, 'Tamaño de máquina')}
            />
          </Field>
          <Field label="Profundidad">
            <input
              type="number"
              className={inputClass}
              value={machine.depth}
              onChange={(e) => update({ depth: Number(e.target.value) } as Partial<MachineEntity>, 'Tamaño de máquina')}
            />
          </Field>
          <Field label="Categoría">
            <select
              className={inputClass}
              value={machine.category}
              onChange={(e) => update({ category: e.target.value } as Partial<MachineEntity>, 'Categoría')}
            >
              <option value="slot">Slot</option>
              <option value="table-game">Mesa de juego</option>
              <option value="poker">Póker</option>
              <option value="vip">VIP</option>
              <option value="other">Otro</option>
            </select>
          </Field>
          <Field label="Estado">
            <select
              className={inputClass}
              value={machine.status}
              onChange={(e) => update({ status: e.target.value } as Partial<MachineEntity>, 'Estado')}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="reserved">Reservada</option>
            </select>
          </Field>
          <Field label="Color">
            <input
              type="color"
              value={machine.color}
              onChange={(e) => update({ color: e.target.value } as Partial<MachineEntity>, 'Color de máquina')}
            />
          </Field>
        </section>
      )
    }
    case 'island': {
      const island = entity as IslandEntity
      return (
        <section>
          <h3 className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Isla</h3>
          <Field label="Máquinas">
            <span className="text-xs text-text-primary">{island.machineIds.length}</span>
          </Field>
          <Field label="Separación">
            <input
              type="number"
              className={inputClass}
              value={island.spacing}
              onChange={(e) => update({ spacing: Number(e.target.value) } as Partial<IslandEntity>, 'Separación de isla')}
            />
          </Field>
        </section>
      )
    }
    default:
      return null
  }
}
