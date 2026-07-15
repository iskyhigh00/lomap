import { describe, expect, it } from 'vitest'
import { hitTestWallMidpoint, hitTestWallVertex } from './wallGrips'
import { createWall } from '@engine/entities/factory'

describe('wall grip hit-testing', () => {
  const wall = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }])

  it('finds the vertex under a point within tolerance', () => {
    expect(hitTestWallVertex(wall, { x: 2, y: -1 }, 5)).toBe(0)
    expect(hitTestWallVertex(wall, { x: 100, y: 3 }, 5)).toBe(1)
    expect(hitTestWallVertex(wall, { x: 98, y: 100 }, 5)).toBe(2)
  })

  it('returns null when no vertex is within tolerance', () => {
    expect(hitTestWallVertex(wall, { x: 50, y: 50 }, 5)).toBeNull()
  })

  it('finds the midpoint grip of a segment within tolerance', () => {
    expect(hitTestWallMidpoint(wall, { x: 50, y: 1 }, 5)).toBe(0)
    expect(hitTestWallMidpoint(wall, { x: 99, y: 50 }, 5)).toBe(1)
  })

  it('returns null when no segment midpoint is within tolerance', () => {
    expect(hitTestWallMidpoint(wall, { x: 0, y: 0 }, 5)).toBeNull()
  })
})
