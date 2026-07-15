import { describe, expect, it } from 'vitest'
import { lineIntersection, mirrorPoint, offsetPolyline, signedOffsetDistance } from './lineOps'

describe('lineIntersection', () => {
  it('finds the intersection of two crossing lines', () => {
    expect(lineIntersection({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toEqual({ x: 5, y: 5 })
  })

  it('finds the intersection of two infinite lines even beyond their segments', () => {
    // Horizontal line y=0 and a line that only passes through x=20 at y=0 when extended.
    expect(lineIntersection({ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 20, y: -5 }, { x: 20, y: 5 })).toEqual({ x: 20, y: 0 })
  })

  it('returns null for parallel lines', () => {
    expect(lineIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBeNull()
  })
})

describe('mirrorPoint', () => {
  it('reflects a point across a horizontal axis', () => {
    expect(mirrorPoint({ x: 5, y: 10 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ x: 5, y: -10 })
  })

  it('reflects a point across a vertical axis', () => {
    expect(mirrorPoint({ x: 10, y: 5 }, { x: 0, y: 0 }, { x: 0, y: 10 })).toEqual({ x: -10, y: 5 })
  })

  it('is its own inverse', () => {
    const p = { x: 7, y: 3 }
    const mirrored = mirrorPoint(p, { x: 0, y: 0 }, { x: 1, y: 1 })
    expect(mirrorPoint(mirrored, { x: 0, y: 0 }, { x: 1, y: 1 })).toEqual(p)
  })
})

describe('offsetPolyline', () => {
  it('shifts a straight 2-point polyline parallel by the given distance', () => {
    const result = offsetPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], 5)
    expect(result).toEqual([{ x: 0, y: 5 }, { x: 10, y: 5 }])
  })

  it('offsets to the opposite side for a negative distance', () => {
    const result = offsetPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], -5)
    expect(result).toEqual([{ x: 0, y: -5 }, { x: 10, y: -5 }])
  })

  it('mirroring the sign flips which side the offset lands on', () => {
    const positive = offsetPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], 5)
    const negative = offsetPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], -5)
    expect(positive[0].y).toBe(-negative[0].y)
  })

  it('miters an L-shaped polyline\'s corner instead of stepping it', () => {
    const result = offsetPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 2)
    // Both segments shift by 2, and the corner is the single miter point, not two disjoint ends.
    expect(result).toHaveLength(3)
    expect(result[1].x).toBeCloseTo(8)
    expect(result[1].y).toBeCloseTo(2)
  })
})

describe('signedOffsetDistance', () => {
  it('feeds straight back into offsetPolyline to reproduce the previewed offset', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    const cursor = { x: 5, y: 3 }
    const dist = signedOffsetDistance(points, cursor)
    expect(dist).toBeCloseTo(3)
    expect(offsetPolyline(points, dist)[0].y).toBeCloseTo(3)
  })

  it('flips sign on the opposite side', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    expect(signedOffsetDistance(points, { x: 5, y: -3 })).toBeCloseTo(-3)
  })
})
