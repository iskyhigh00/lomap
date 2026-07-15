import type { IslandTemplateMachine, StoredIslandTemplate } from '@persistence/db'
import type { IslandEntity, MachineEntity } from '@engine/entities/types'
import type { Point } from '@engine/geometry/types'
import { createIsland, createMachine, generateId } from '@engine/entities/factory'
import { layoutIslandMachines } from '@engine/entities/islandOps'

/** Snapshots an island's shape/spacing + its machines' identity (never their
 * absolute position — see `StoredIslandTemplate`'s docblock). */
export function createTemplateFromIsland(name: string, island: IslandEntity, machines: MachineEntity[]): StoredIslandTemplate {
  const byId = new Map(machines.map((m) => [m.id, m]))
  const orderedMachines = island.machineIds.map((id) => byId.get(id)).filter((m): m is MachineEntity => Boolean(m))
  return {
    id: generateId('template'),
    name,
    shape: island.shape,
    spacing: island.spacing,
    machines: orderedMachines.map(
      (m): IslandTemplateMachine => ({
        name: m.name,
        manufacturer: m.manufacturer,
        model: m.model,
        width: m.width,
        depth: m.depth,
        height: m.height,
        powerConsumption: m.powerConsumption,
        color: m.color,
        category: m.category,
      }),
    ),
    createdAt: Date.now(),
  }
}

/** Instantiates a template at `position` as a brand-new island + machines,
 * laid out by the exact same `layoutIslandMachines` `createAddIslandCommand`
 * uses — a template never carries its own placement math. */
export function instantiateTemplate(template: StoredIslandTemplate, position: Point): { island: IslandEntity; machines: MachineEntity[] } {
  const island = createIsland(position)
  island.name = template.name
  island.shape = template.shape
  island.spacing = template.spacing

  const machines: MachineEntity[] = template.machines.map((tm) =>
    createMachine(position, {
      name: tm.name,
      manufacturer: tm.manufacturer,
      model: tm.model,
      width: tm.width,
      depth: tm.depth,
      height: tm.height,
      powerConsumption: tm.powerConsumption,
      color: tm.color,
      category: tm.category,
      islandId: island.id,
    }),
  )
  island.machineIds = machines.map((m) => m.id)

  const placements = layoutIslandMachines(island, machines)
  const placedMachines = machines.map((machine) => {
    const placement = placements.find((p) => p.id === machine.id)
    if (!placement) return machine
    return { ...machine, transform: { ...machine.transform, x: placement.x, y: placement.y, rotation: placement.rotation } }
  })

  return { island, machines: placedMachines }
}
