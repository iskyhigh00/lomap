import type { Command } from './types'
import { useProjectStore } from '@store/projectStore'
import type { IslandEntity, MachineEntity } from '@engine/entities/types'
import { createIsland, createMachine } from '@engine/entities/factory'
import { layoutIslandMachines } from '@engine/entities/islandOps'
import type { Point } from '@engine/geometry/types'
import type { StoredIslandTemplate } from '@persistence/db'
import { instantiateTemplate } from '@library/islandTemplates'

function applyLayout(island: IslandEntity) {
  const state = useProjectStore.getState()
  const machines = island.machineIds
    .map((id) => state.entities[id])
    .filter((entity): entity is MachineEntity => entity?.type === 'machine')
  const placements = layoutIslandMachines(island, machines)
  for (const placement of placements) {
    const machine = state.entities[placement.id]
    if (!machine) continue
    state._updateEntity(placement.id, {
      transform: { ...machine.transform, x: placement.x, y: placement.y, rotation: placement.rotation },
    })
  }
}

/** Creates a new island pre-populated with `machineCount` machines, laid out immediately. */
export function createAddIslandCommand(
  position: Point,
  machineCount = 4,
  shape: IslandEntity['shape'] = 'linear',
  spacing = 10,
): Command {
  const island = createIsland(position)
  island.shape = shape
  island.spacing = spacing
  const machines: MachineEntity[] = Array.from({ length: machineCount }, (_, i) =>
    createMachine(position, { name: `Máquina ${i + 1}`, islandId: island.id }),
  )
  island.machineIds = machines.map((m) => m.id)

  const placements = layoutIslandMachines(island, machines)
  const placedMachines = machines.map((machine) => {
    const placement = placements.find((p) => p.id === machine.id)
    if (!placement) return machine
    return { ...machine, transform: { ...machine.transform, x: placement.x, y: placement.y, rotation: placement.rotation } }
  })

  return {
    label: 'Crear isla',
    do() {
      const state = useProjectStore.getState()
      state._addEntity(island)
      for (const machine of placedMachines) state._addEntity(machine)
      state.setSelection([island.id])
    },
    undo() {
      const state = useProjectStore.getState()
      for (const machine of placedMachines) state._removeEntity(machine.id)
      state._removeEntity(island.id)
    },
  }
}

/** Drops a library template onto the canvas as a brand-new island — the
 * "arrastrar y soltar islas desde la biblioteca" tool (Fase 7). */
export function createInstantiateTemplateCommand(template: StoredIslandTemplate, position: Point): Command {
  const { island, machines } = instantiateTemplate(template, position)
  return {
    label: `Insertar ${template.name}`,
    do() {
      const state = useProjectStore.getState()
      state._addEntity(island)
      for (const machine of machines) state._addEntity(machine)
      state.setSelection([island.id])
    },
    undo() {
      const state = useProjectStore.getState()
      for (const machine of machines) state._removeEntity(machine.id)
      state._removeEntity(island.id)
    },
  }
}

export function createSetIslandShapeCommand(islandId: string, shape: IslandEntity['shape']): Command {
  return createRelayoutCommand(islandId, { shape }, 'Cambiar forma de isla')
}

export function createSetIslandSpacingCommand(islandId: string, spacing: number): Command {
  return createRelayoutCommand(islandId, { spacing }, 'Cambiar separación de isla')
}

function createRelayoutCommand(islandId: string, patch: Partial<IslandEntity>, label: string): Command {
  const state = useProjectStore.getState()
  const island = state.entities[islandId] as IslandEntity | undefined
  if (!island) return { label, do() {}, undo() {} }

  const before = island.machineIds.map((id) => state.entities[id] as MachineEntity).filter(Boolean)
  const beforeTransforms = before.map((m) => ({ id: m.id, transform: m.transform }))
  const beforePatch: Partial<IslandEntity> = {}
  for (const key of Object.keys(patch) as (keyof IslandEntity)[]) {
    ;(beforePatch as Record<string, unknown>)[key] = (island as unknown as Record<string, unknown>)[key]
  }

  return {
    label,
    do() {
      const s = useProjectStore.getState()
      s._updateEntity(islandId, patch)
      const updated = s.entities[islandId] as IslandEntity
      applyLayout(updated)
    },
    undo() {
      const s = useProjectStore.getState()
      s._updateEntity(islandId, beforePatch)
      for (const { id, transform } of beforeTransforms) {
        s._updateEntity(id, { transform })
      }
    },
  }
}

/** Adds one more machine to an island and relayouts the whole group. */
export function createAddMachineToIslandCommand(islandId: string): Command {
  const state = useProjectStore.getState()
  const island = state.entities[islandId] as IslandEntity | undefined
  if (!island) return { label: 'Agregar máquina', do() {}, undo() {} }

  const machine = createMachine(
    { x: island.transform.x, y: island.transform.y },
    { name: `Máquina ${island.machineIds.length + 1}`, islandId: island.id },
  )
  const beforeMachineIds = [...island.machineIds]
  const beforeTransforms = island.machineIds
    .map((id) => state.entities[id] as MachineEntity)
    .filter(Boolean)
    .map((m) => ({ id: m.id, transform: m.transform }))

  return {
    label: 'Agregar máquina',
    do() {
      const s = useProjectStore.getState()
      s._addEntity(machine)
      const current = s.entities[islandId] as IslandEntity
      s._updateEntity(islandId, { machineIds: [...current.machineIds, machine.id] })
      applyLayout({ ...current, machineIds: [...current.machineIds, machine.id] })
    },
    undo() {
      const s = useProjectStore.getState()
      s._removeEntity(machine.id)
      s._updateEntity(islandId, { machineIds: beforeMachineIds })
      for (const { id, transform } of beforeTransforms) {
        s._updateEntity(id, { transform })
      }
    },
  }
}

/** Removes the last machine from an island and relayouts the remaining ones. */
export function createRemoveMachineFromIslandCommand(islandId: string): Command {
  const state = useProjectStore.getState()
  const island = state.entities[islandId] as IslandEntity | undefined
  if (!island || island.machineIds.length === 0) return { label: 'Quitar máquina', do() {}, undo() {} }

  const removedId = island.machineIds[island.machineIds.length - 1]
  const removedMachine = state.entities[removedId] as MachineEntity
  const beforeMachineIds = [...island.machineIds]
  const remainingIds = island.machineIds.slice(0, -1)
  const beforeTransforms = remainingIds
    .map((id) => state.entities[id] as MachineEntity)
    .filter(Boolean)
    .map((m) => ({ id: m.id, transform: m.transform }))

  return {
    label: 'Quitar máquina',
    do() {
      const s = useProjectStore.getState()
      s._removeEntity(removedId)
      s._updateEntity(islandId, { machineIds: remainingIds })
      const current = s.entities[islandId] as IslandEntity
      applyLayout(current)
    },
    undo() {
      const s = useProjectStore.getState()
      s._restoreEntity(removedMachine)
      s._updateEntity(islandId, { machineIds: beforeMachineIds })
      for (const { id, transform } of beforeTransforms) {
        s._updateEntity(id, { transform })
      }
    },
  }
}
