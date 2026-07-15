import type { Point } from '@engine/geometry/types'
import { rotate } from '@engine/geometry/vector'
import type { IslandEntity, MachineEntity } from './types'

export interface MachinePlacement {
  id: string
  x: number
  y: number
  rotation: number
}

function layoutLinear(machines: MachineEntity[], spacing: number): MachinePlacement[] {
  let cursor = 0
  const placements: MachinePlacement[] = []
  for (const machine of machines) {
    const x = cursor + machine.width / 2
    placements.push({ id: machine.id, x, y: 0, rotation: 0 })
    cursor += machine.width + spacing
  }
  const totalWidth = cursor - spacing
  const offset = totalWidth / 2
  return placements.map((p) => ({ ...p, x: p.x - offset }))
}

function layoutBackToBack(machines: MachineEntity[], spacing: number): MachinePlacement[] {
  const half = Math.ceil(machines.length / 2)
  const rowA = machines.slice(0, half)
  const rowB = machines.slice(half)
  const maxDepth = Math.max(...machines.map((m) => m.depth), 0)
  const rowOffset = maxDepth / 2 + spacing / 2

  const placeRow = (row: MachineEntity[], y: number, rotation: number): MachinePlacement[] => {
    let cursor = 0
    const placements: MachinePlacement[] = []
    for (const machine of row) {
      const x = cursor + machine.width / 2
      placements.push({ id: machine.id, x, y, rotation })
      cursor += machine.width + spacing
    }
    const totalWidth = cursor - spacing
    const offset = totalWidth / 2
    return placements.map((p) => ({ ...p, x: p.x - offset }))
  }

  return [...placeRow(rowA, -rowOffset, 0), ...placeRow(rowB, rowOffset, Math.PI)]
}

function layoutCluster(machines: MachineEntity[], spacing: number): MachinePlacement[] {
  const columns = Math.max(1, Math.ceil(Math.sqrt(machines.length)))
  const cellWidth = Math.max(...machines.map((m) => m.width), 0) + spacing
  const cellDepth = Math.max(...machines.map((m) => m.depth), 0) + spacing
  const rows = Math.ceil(machines.length / columns)
  const totalWidth = columns * cellWidth - spacing
  const totalDepth = rows * cellDepth - spacing

  return machines.map((machine, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    return {
      id: machine.id,
      x: col * cellWidth - totalWidth / 2 + cellWidth / 2,
      y: row * cellDepth - totalDepth / 2 + cellDepth / 2,
      rotation: 0,
    }
  })
}

/**
 * Computes world-space positions for every machine in an island, given the
 * island's shape, spacing, center and rotation. Machine order follows
 * `island.machineIds`.
 */
export function layoutIslandMachines(
  island: Pick<IslandEntity, 'shape' | 'spacing' | 'transform'>,
  machines: MachineEntity[],
): MachinePlacement[] {
  if (machines.length === 0) return []
  const local =
    island.shape === 'back-to-back'
      ? layoutBackToBack(machines, island.spacing)
      : island.shape === 'cluster'
        ? layoutCluster(machines, island.spacing)
        : layoutLinear(machines, island.spacing)

  const center: Point = { x: island.transform.x, y: island.transform.y }
  return local.map((placement) => {
    const worldPos = rotate({ x: placement.x, y: placement.y }, island.transform.rotation, { x: 0, y: 0 })
    return {
      id: placement.id,
      x: center.x + worldPos.x,
      y: center.y + worldPos.y,
      rotation: placement.rotation + island.transform.rotation,
    }
  })
}

export function computeCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}
