import { describe, expect, it } from 'vitest'
import { computeCalibrationFactor } from './calibration'

describe('computeCalibrationFactor', () => {
  it('returns 1 when the clicked distance already matches the known distance', () => {
    const factor = computeCalibrationFactor({ x: 0, y: 0 }, { x: 100, y: 0 }, 100)
    expect(factor).toBeCloseTo(1)
  })

  it('returns >1 to grow the image when it currently reads too small', () => {
    // Clicked points are 50 world units apart but represent 200 real units.
    const factor = computeCalibrationFactor({ x: 0, y: 0 }, { x: 50, y: 0 }, 200)
    expect(factor).toBeCloseTo(4)
  })

  it('returns <1 to shrink the image when it currently reads too large', () => {
    const factor = computeCalibrationFactor({ x: 0, y: 0 }, { x: 200, y: 0 }, 50)
    expect(factor).toBeCloseTo(0.25)
  })

  it('is safe against a zero-length click (same point twice)', () => {
    expect(computeCalibrationFactor({ x: 5, y: 5 }, { x: 5, y: 5 }, 100)).toBe(1)
  })

  it('is safe against a non-positive known distance', () => {
    expect(computeCalibrationFactor({ x: 0, y: 0 }, { x: 100, y: 0 }, 0)).toBe(1)
    expect(computeCalibrationFactor({ x: 0, y: 0 }, { x: 100, y: 0 }, -10)).toBe(1)
  })

  it('works diagonally, not just axis-aligned', () => {
    const factor = computeCalibrationFactor({ x: 0, y: 0 }, { x: 3, y: 4 }, 10) // pixel distance 5
    expect(factor).toBeCloseTo(2)
  })
})
