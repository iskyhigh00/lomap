import { describe, expect, it } from 'vitest'
import { findNearestWallAngle, smartRotationDelta } from './smartRotate'
import { createWall } from '@engine/entities/factory'

describe('findNearestWallAngle', () => {
  it('returns null when there are no walls', () => {
    expect(findNearestWallAngle({ x: 0, y: 0 }, [])).toBeNull()
  })

  it('returns the angle of the closest wall segment', () => {
    const horizontal = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }])
    const vertical = createWall([{ x: 500, y: -500 }, { x: 500, y: 500 }])
    // Pivot much closer to the horizontal wall.
    const angle = findNearestWallAngle({ x: 50, y: 5 }, [horizontal, vertical])
    expect(angle).toBeCloseTo(0)
  })

  it('picks the nearer of two candidate walls', () => {
    const near = createWall([{ x: 0, y: 100 }, { x: 100, y: 100 }])
    const far = createWall([{ x: 0, y: 1000 }, { x: 0, y: 1100 }]) // vertical, far away
    const angle = findNearestWallAngle({ x: 50, y: 105 }, [far, near])
    expect(angle).toBeCloseTo(0)
  })
})

describe('smartRotationDelta', () => {
  it('is zero when already aligned', () => {
    expect(smartRotationDelta(0, 0)).toBeCloseTo(0)
  })

  it('is zero when aligned to the same line but facing the opposite direction', () => {
    expect(smartRotationDelta(0, Math.PI)).toBeCloseTo(0)
  })

  it('rotates toward a perpendicular wall by the shorter direction', () => {
    const delta = smartRotationDelta(0, Math.PI / 2)
    expect(Math.abs(delta)).toBeCloseTo(Math.PI / 2)
  })

  it('never returns a delta larger than a quarter turn', () => {
    for (const current of [0, 0.3, 1.2, 2.5, -1.8]) {
      for (const target of [0, 0.7, 1.9, -2.2, 3.0]) {
        expect(Math.abs(smartRotationDelta(current, target))).toBeLessThanOrEqual(Math.PI / 2 + 1e-9)
      }
    }
  })
})
