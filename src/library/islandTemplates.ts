import type { IslandTemplateMachine, StoredIslandTemplate } from '@persistence/db'
import type { IslandEntity, MachineEntity } from '@engine/entities/types'
import type { Point } from '@engine/geometry/types'
import { createIsland, createMachine, generateId } from '@engine/entities/factory'
import { layoutIslandMachines } from '@engine/entities/islandOps'

/** Snapshots an island's shape/spacing + its machines' identity (never their
 * absolute position — see `StoredIslandTemplate`'s docblock). */
export function createTemplateFromIsland(
  name: string,
  island: IslandEntity,
  machines: MachineEntity[],
  category = 'General',
): StoredIslandTemplate {
  const byId = new Map(machines.map((m) => [m.id, m]))
  const orderedMachines = island.machineIds.map((id) => byId.get(id)).filter((m): m is MachineEntity => Boolean(m))
  const templateMachines = orderedMachines.map(
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
  )
  return {
    id: generateId('template'),
    name,
    shape: island.shape,
    spacing: island.spacing,
    machines: templateMachines,
    createdAt: Date.now(),
    category: category.trim() || 'General',
    favorite: false,
    thumbnail: renderIslandThumbnail(island.shape, island.spacing, templateMachines),
  }
}

/** A self-contained SVG "top-down" preview of the template's machine layout,
 * computed once at save time with the exact same `layoutIslandMachines` used
 * to place the real island — no second layout algorithm, just reused at the
 * origin with a throwaway island/machine shape. Returned as a `data:` URI so
 * the library grid can drop it straight into an `<img src>` with no runtime
 * rendering cost. */
export function renderIslandThumbnail(shape: IslandEntity['shape'], spacing: number, machines: IslandTemplateMachine[]): string {
  if (machines.length === 0) return ''
  const fakeIsland = { shape, spacing, transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } }
  const fakeMachines = machines.map(
    (m, i) =>
      ({
        id: `m${i}`,
        width: m.width,
        depth: m.depth,
        transform: { x: 0, y: 0, rotation: 0 },
      }) as MachineEntity,
  )
  const placements = layoutIslandMachines(fakeIsland, fakeMachines)
  const byId = new Map(placements.map((p) => [p.id, p]))

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < machines.length; i++) {
    const p = byId.get(`m${i}`)
    if (!p) continue
    const half = Math.max(machines[i].width, machines[i].depth) / 2
    minX = Math.min(minX, p.x - half)
    minY = Math.min(minY, p.y - half)
    maxX = Math.max(maxX, p.x + half)
    maxY = Math.max(maxY, p.y + half)
  }
  const pad = 12
  const width = Math.max(maxX - minX, 1) + pad * 2
  const height = Math.max(maxY - minY, 1) + pad * 2
  const offsetX = pad - minX
  const offsetY = pad - minY

  const rects = machines
    .map((m, i) => {
      const p = byId.get(`m${i}`)
      if (!p) return ''
      const rotationDeg = (p.rotation * 180) / Math.PI
      const x = p.x + offsetX - m.width / 2
      const y = p.y + offsetY - m.depth / 2
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${m.width}" height="${m.depth}" rx="2" fill="${m.color}" stroke="#0b0e14" stroke-width="1.5" transform="rotate(${rotationDeg.toFixed(1)} ${p.x + offsetX} ${p.y + offsetY})" />`
    })
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(1)} ${height.toFixed(1)}"><rect width="100%" height="100%" fill="#1a2029"/>${rects}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
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
