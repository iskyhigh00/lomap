import { describe, expect, it } from 'vitest'
import { findAlignmentSnap } from './alignmentGuides'

describe('findAlignmentSnap', () => {
  it('snaps the left edge to a nearby left edge within tolerance', () => {
    const moving = { minX: 103, minY: 0, maxX: 203, maxY: 100 }
    const other = { minX: 100, minY: 200, maxX: 200, maxY: 300 }
    const result = findAlignmentSnap(moving, [other], 10)
    expect(result.dx).toBeCloseTo(-3)
    expect(result.guides.some((g) => g.axis === 'x' && g.position === 100)).toBe(true)
  })

  it('snaps centers to each other', () => {
    // moving center x = 150, other center x = 155 → within tolerance
    const moving = { minX: 100, minY: 0, maxX: 200, maxY: 100 }
    const other = { minX: 105, minY: 300, maxX: 205, maxY: 400 }
    const result = findAlignmentSnap(moving, [other], 10)
    expect(result.dx).toBeCloseTo(5)
  })

  it('does not snap when nothing is within tolerance', () => {
    const moving = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
    const other = { minX: 500, minY: 500, maxX: 600, maxY: 600 }
    const result = findAlignmentSnap(moving, [other], 10)
    expect(result.dx).toBe(0)
    expect(result.dy).toBe(0)
    expect(result.guides).toEqual([])
  })

  it('snaps x and y independently against different neighbors', () => {
    const moving = { minX: 103, minY: 0, maxX: 203, maxY: 100 }
    const neighborX = { minX: 100, minY: 900, maxX: 200, maxY: 1000 } // matches x only
    const neighborY = { minX: 900, minY: 4, maxX: 1000, maxY: 104 } // matches y only (maxY 100 vs 104)
    const result = findAlignmentSnap(moving, [neighborX, neighborY], 10)
    expect(result.dx).toBeCloseTo(-3)
    expect(result.dy).toBeCloseTo(4)
    expect(result.guides).toHaveLength(2)
  })

  it('picks the closest match when multiple candidates are within tolerance', () => {
    const moving = { minX: 100, minY: 0, maxX: 200, maxY: 100 }
    const closer = { minX: 102, minY: 300, maxX: 202, maxY: 400 }
    const farther = { minX: 108, minY: 500, maxX: 208, maxY: 600 }
    const result = findAlignmentSnap(moving, [closer, farther], 10)
    expect(result.dx).toBeCloseTo(2)
  })
})
