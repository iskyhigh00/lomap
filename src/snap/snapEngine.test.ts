import { describe, expect, it } from 'vitest'
import { resolveSnapPoint } from './snapEngine'

const baseContext = { gridSize: 20, gridEnabled: true, candidatePoints: [], endpointTolerance: 10 }

describe('resolveSnapPoint', () => {
  it('snaps to grid when nothing else applies', () => {
    const result = resolveSnapPoint({ x: 23, y: 47 }, baseContext)
    expect(result).toEqual({ point: { x: 20, y: 40 }, type: 'grid' })
  })

  it('returns the raw candidate when grid is disabled and nothing else applies', () => {
    const result = resolveSnapPoint({ x: 23, y: 47 }, { ...baseContext, gridEnabled: false })
    expect(result).toEqual({ point: { x: 23, y: 47 }, type: 'none' })
  })

  it('snaps to the nearest existing vertex within tolerance, beating grid snap', () => {
    const context = { ...baseContext, candidatePoints: [{ x: 100, y: 100 }, { x: 500, y: 500 }] }
    const result = resolveSnapPoint({ x: 105, y: 103 }, context)
    expect(result).toEqual({ point: { x: 100, y: 100 }, type: 'endpoint' })
  })

  it('picks the closest candidate point when multiple are in range', () => {
    const context = { ...baseContext, endpointTolerance: 50, candidatePoints: [{ x: 100, y: 100 }, { x: 110, y: 100 }] }
    const result = resolveSnapPoint({ x: 108, y: 100 }, context)
    expect(result.point).toEqual({ x: 110, y: 100 })
  })

  it('falls through to angle/grid snap when no vertex is within tolerance', () => {
    const context = { ...baseContext, candidatePoints: [{ x: 1000, y: 1000 }] }
    const result = resolveSnapPoint({ x: 23, y: 47 }, context)
    expect(result.type).toBe('grid')
  })

  it('snaps direction to the nearest 45° step from the angle origin', () => {
    // Cursor at (100, 4) from origin (0,0): angle ~2.3° off the 0° axis — should snap flat.
    const context = { ...baseContext, gridEnabled: false, angleOrigin: { x: 0, y: 0 } }
    const result = resolveSnapPoint({ x: 100, y: 4 }, context)
    expect(result.type).toBe('angle')
    expect(result.point.y).toBeCloseTo(0)
    expect(result.point.x).toBeCloseTo(100, 0)
  })

  it('does not angle-snap when the candidate is too far from any step angle', () => {
    // ~26.6° from the axis — well outside the default 4° tolerance.
    const context = { ...baseContext, gridEnabled: false, angleOrigin: { x: 0, y: 0 } }
    const result = resolveSnapPoint({ x: 100, y: 50 }, context)
    expect(result.type).toBe('none')
    expect(result.point).toEqual({ x: 100, y: 50 })
  })

  it('angle snap still applies grid snap on top when grid is enabled', () => {
    const context = { ...baseContext, angleOrigin: { x: 0, y: 0 }, gridSize: 25 }
    const result = resolveSnapPoint({ x: 103, y: 2 }, context)
    expect(result.type).toBe('angle')
    expect(result.point.x % 25).toBe(0)
    expect(result.point.y % 25).toBe(0)
  })

  it('endpoint snap always wins over angle snap', () => {
    const context = {
      ...baseContext,
      angleOrigin: { x: 0, y: 0 },
      candidatePoints: [{ x: 100, y: 50 }], // far off-axis, but close to the candidate below
      endpointTolerance: 10,
    }
    const result = resolveSnapPoint({ x: 103, y: 48 }, context)
    expect(result).toEqual({ point: { x: 100, y: 50 }, type: 'endpoint' })
  })

  it('snaps to a right angle (90°) as well as the axis', () => {
    const context = { ...baseContext, gridEnabled: false, angleOrigin: { x: 0, y: 0 } }
    const result = resolveSnapPoint({ x: 3, y: 100 }, context)
    expect(result.type).toBe('angle')
    expect(result.point.x).toBeCloseTo(0)
  })
})
