import type { ReactNode } from 'react'
import { useProjectStore } from '@store/projectStore'
import { useCommand } from '@hooks/useCommand'
import { createUpdateEntityCommand, createDeleteEntitiesCommand, createDuplicateEntitiesCommand } from '@commands/entityCommands'
import {
  createAddMachineToIslandCommand,
  createRemoveMachineFromIslandCommand,
  createSetIslandShapeCommand,
  createSetIslandSpacingCommand,
} from '@commands/islandCommands'
import type { GenericEntity, IslandEntity, MachineEntity, PillarEntity, WallEntity, ZoneEntity } from '@engine/entities/types'
import type { Command } from '@commands/types'
import { isGeometryAnchored } from '@engine/entities/geometryTransform'
import { createSetWallSegmentLengthCommand } from '@commands/wallCommands'
import { distance, polylineLength } from '@engine/geometry/vector'
import { WORLD_UNIT } from '@engine/coords/projectCoordinateSystem'

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
      <aside className="flex w-72 shrink-0 flex-col gap-2 border-l border-border bg-surface-900 p-4">
        <p className="mb-1 text-xs text-text-secondary">{selectedIds.length} objetos seleccionados</p>
        <button
          onClick={() => execute(createDuplicateEntitiesCommand(selectedIds))}
          className="rounded border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-700 hover:text-text-primary"
        >
          Duplicar (Ctrl+D)
        </button>
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

      {entity.type !== 'island' && !isGeometryAnchored(entity) && (
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
      )}

      <TypeSpecificFields entity={entity} update={update} execute={execute} />

      <button
        onClick={() => execute(createDuplicateEntitiesCommand([entity.id]))}
        className="rounded border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-700 hover:text-text-primary"
      >
        Duplicar (Ctrl+D)
      </button>

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
  execute,
}: {
  entity: GenericEntity
  update: (patch: Partial<GenericEntity>, label?: string) => void
  execute: (command: Command) => void
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
          <Field label="Altura">
            <input
              type="number"
              className={inputClass}
              value={wall.height}
              onChange={(e) => update({ height: Number(e.target.value) } as Partial<WallEntity>, 'Altura de muro')}
            />
          </Field>
          <Field label="Tipo">
            <select
              className={inputClass}
              value={wall.wallType}
              onChange={(e) => update({ wallType: e.target.value } as Partial<WallEntity>, 'Tipo de muro')}
            >
              <option value="partition">Tabique</option>
              <option value="load-bearing">Portante</option>
              <option value="exterior">Exterior</option>
              <option value="glass">Vidrio</option>
              <option value="temporary">Temporal</option>
            </select>
          </Field>
          <Field label="Material">
            <input
              className={inputClass}
              value={wall.material}
              onChange={(e) => update({ material: e.target.value } as Partial<WallEntity>, 'Material de muro')}
            />
          </Field>
          <Field label="Vértices">
            <span className="text-xs text-text-primary">{wall.points.length}</span>
          </Field>
          <Field label="Longitud total">
            <span className="text-xs text-text-primary">
              {polylineLength(wall.points).toFixed(0)} {WORLD_UNIT}
            </span>
          </Field>
          {wall.points.length > 1 && (
            <div className="mt-1">
              <h4 className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Segmentos</h4>
              {wall.points.slice(0, -1).map((point, i) => {
                const segmentLength = Math.round(distance(point, wall.points[i + 1]))
                return (
                  <Field key={i} label={`${i + 1}. ${segmentLength} ${WORLD_UNIT}`}>
                    <input
                      key={segmentLength}
                      type="number"
                      className={inputClass}
                      defaultValue={segmentLength}
                      onBlur={(e) => {
                        const value = Number(e.target.value)
                        if (value > 0) execute(createSetWallSegmentLengthCommand(wall.id, i, value))
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                    />
                  </Field>
                )
              })}
            </div>
          )}
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
          <Field label="Forma">
            <select
              className={inputClass}
              value={island.shape}
              onChange={(e) => execute(createSetIslandShapeCommand(island.id, e.target.value as IslandEntity['shape']))}
            >
              <option value="linear">Lineal</option>
              <option value="back-to-back">Espalda con espalda</option>
              <option value="cluster">Cluster</option>
            </select>
          </Field>
          <Field label="Separación">
            <input
              type="number"
              className={inputClass}
              value={island.spacing}
              onChange={(e) => execute(createSetIslandSpacingCommand(island.id, Number(e.target.value)))}
            />
          </Field>
          <Field label="Bloqueado (grupo)">
            <input
              type="checkbox"
              checked={island.groupLocked}
              onChange={(e) => update({ groupLocked: e.target.checked } as Partial<IslandEntity>, 'Bloquear grupo')}
            />
          </Field>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => execute(createAddMachineToIslandCommand(island.id))}
              className="flex-1 rounded border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface-700 hover:text-text-primary"
            >
              + Máquina
            </button>
            <button
              onClick={() => execute(createRemoveMachineFromIslandCommand(island.id))}
              disabled={island.machineIds.length === 0}
              className="flex-1 rounded border border-border px-2 py-1 text-xs text-text-secondary hover:bg-surface-700 hover:text-text-primary disabled:opacity-30"
            >
              − Máquina
            </button>
          </div>
        </section>
      )
    }
    default:
      return null
  }
}
