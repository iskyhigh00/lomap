import { describe, expect, it } from 'vitest'
import { computeLayoutStats } from './layoutStats'
import { createIsland, createMachine, createPerimeter } from '@engine/entities/factory'
import type { GenericEntity } from '@engine/entities/types'

function toMap(entities: GenericEntity[]): Record<string, GenericEntity> {
  return Object.fromEntries(entities.map((e) => [e.id, e]))
}

describe('computeLayoutStats', () => {
  it('reports null area fields when no perimeter has been drawn', () => {
    const machine = createMachine({ x: 0, y: 0 }, { width: 60, depth: 70 })
    const stats = computeLayoutStats([machine], toMap([machine]))
    expect(stats.machineCount).toBe(1)
    expect(stats.totalAreaM2).toBeNull()
    expect(stats.freeAreaM2).toBeNull()
    expect(stats.densityPerM2).toBeNull()
    expect(stats.occupancyPercent).toBeNull()
  })

  it('computes occupied/total/free area, density and occupancy from a perimeter + machines', () => {
    // 10m x 10m perimeter (1000cm x 1000cm) = 100 m²
    const perimeter = createPerimeter([
      { x: 0, y: 0 },
      { x: 1000, y: 0 },
      { x: 1000, y: 1000 },
      { x: 0, y: 1000 },
    ])
    // Two 2m x 1m machines = 2 m² each, 4 m² occupied total.
    const machineA = createMachine({ x: 100, y: 100 }, { width: 200, depth: 100 })
    const machineB = createMachine({ x: 400, y: 100 }, { width: 200, depth: 100 })
    const entities = [perimeter, machineA, machineB]

    const stats = computeLayoutStats(entities, toMap(entities))
    expect(stats.machineCount).toBe(2)
    expect(stats.totalAreaM2).toBeCloseTo(100)
    expect(stats.occupiedAreaM2).toBeCloseTo(4)
    expect(stats.freeAreaM2).toBeCloseTo(96)
    expect(stats.densityPerM2).toBeCloseTo(2 / 100)
    expect(stats.occupancyPercent).toBeCloseTo(4)
  })

  it('counts islands separately from machines and does not double-count island bounds as occupied area', () => {
    const machine = createMachine({ x: 0, y: 0 }, { width: 60, depth: 70 })
    const island = createIsland({ x: 0, y: 0 }, [machine.id])
    const entities = [machine, island]
    const stats = computeLayoutStats(entities, toMap(entities))
    expect(stats.islandCount).toBe(1)
    // Occupied area is only the machine's own footprint (0.42 m²), never the
    // island's padded bounding box on top of it.
    expect(stats.occupiedAreaM2).toBeCloseTo((0.6 * 0.7))
  })

  it('ignores hidden entities', () => {
    const machine = { ...createMachine({ x: 0, y: 0 }, { width: 60, depth: 70 }), visible: false }
    const stats = computeLayoutStats([machine], toMap([machine]))
    expect(stats.machineCount).toBe(0)
  })
})
