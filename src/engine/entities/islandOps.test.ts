import { describe, expect, it } from 'vitest'
import { computeCentroid, layoutIslandMachines } from './islandOps'
import { createMachine } from './factory'
import { IDENTITY_TRANSFORM } from '@engine/geometry/types'

describe('islandOps', () => {
  it('lays out machines linearly, centered on the island transform', () => {
    const machines = [
      createMachine({ x: 0, y: 0 }, { width: 60, depth: 70 }),
      createMachine({ x: 0, y: 0 }, { width: 60, depth: 70 }),
    ]
    const island = { shape: 'linear' as const, spacing: 10, transform: { ...IDENTITY_TRANSFORM, x: 100, y: 200 } }
    const placements = layoutIslandMachines(island, machines)

    expect(placements).toHaveLength(2)
    // Symmetric around the island center on the x axis.
    const [a, b] = placements
    expect(a.y).toBeCloseTo(200)
    expect(b.y).toBeCloseTo(200)
    expect(a.x + b.x).toBeCloseTo(200) // symmetric around x=100
    expect(b.x - a.x).toBeCloseTo(70) // machine width + spacing
  })

  it('splits back-to-back layout into two facing rows', () => {
    const machines = [
      createMachine({ x: 0, y: 0 }, { width: 50, depth: 60 }),
      createMachine({ x: 0, y: 0 }, { width: 50, depth: 60 }),
    ]
    const island = { shape: 'back-to-back' as const, spacing: 10, transform: { ...IDENTITY_TRANSFORM, x: 0, y: 0 } }
    const placements = layoutIslandMachines(island, machines)

    expect(placements[0].rotation).toBeCloseTo(0)
    expect(placements[1].rotation).toBeCloseTo(Math.PI)
    expect(placements[0].y).toBeLessThan(0)
    expect(placements[1].y).toBeGreaterThan(0)
  })

  it('rotates the whole layout with the island rotation', () => {
    const machines = [createMachine({ x: 0, y: 0 }, { width: 60, depth: 70 })]
    const island = { shape: 'linear' as const, spacing: 10, transform: { ...IDENTITY_TRANSFORM, x: 0, y: 0, rotation: Math.PI / 2 } }
    const placements = layoutIslandMachines(island, machines)
    expect(placements[0].rotation).toBeCloseTo(Math.PI / 2)
  })

  it('returns an empty array for an island with no machines', () => {
    const island = { shape: 'linear' as const, spacing: 10, transform: { ...IDENTITY_TRANSFORM } }
    expect(layoutIslandMachines(island, [])).toEqual([])
  })

  it('computes the centroid of a set of points', () => {
    expect(computeCentroid([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 15 }])).toEqual({ x: 5, y: 5 })
    expect(computeCentroid([])).toEqual({ x: 0, y: 0 })
  })
})
