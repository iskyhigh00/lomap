import { describe, expect, it } from 'vitest'
import {
  add,
  angleBetween,
  distance,
  distanceAlongPolyline,
  distanceToPolyline,
  distanceToSegment,
  midpoint,
  normalize,
  pointAtDistance,
  polylineLength,
  rotate,
  slicePolyline,
  snapPointToGrid,
  snapToStep,
  subtract,
} from './vector'

describe('vector math', () => {
  it('adds and subtracts points', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 })
    expect(subtract({ x: 5, y: 5 }, { x: 2, y: 1 })).toEqual({ x: 3, y: 4 })
  })

  it('computes distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('computes midpoint', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 10 })).toEqual({ x: 5, y: 5 })
  })

  it('normalizes a vector', () => {
    const result = normalize({ x: 3, y: 4 })
    expect(result.x).toBeCloseTo(0.6)
    expect(result.y).toBeCloseTo(0.8)
  })

  it('returns zero vector when normalizing a zero vector', () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })

  it('rotates a point around the origin by 90 degrees', () => {
    const result = rotate({ x: 1, y: 0 }, Math.PI / 2)
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(1)
  })

  it('rotates a point around an arbitrary origin', () => {
    const result = rotate({ x: 2, y: 1 }, Math.PI, { x: 1, y: 1 })
    expect(result.x).toBeCloseTo(0)
    expect(result.y).toBeCloseTo(1)
  })

  it('computes angle between two points', () => {
    expect(angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0)
    expect(angleBetween({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2)
  })

  it('snaps a value to a step', () => {
    expect(snapToStep(23, 10)).toBe(20)
    expect(snapToStep(27, 10)).toBe(30)
    expect(snapToStep(23, 0)).toBe(23)
  })

  it('snaps a point to a grid', () => {
    expect(snapPointToGrid({ x: 23, y: 47 }, 10)).toEqual({ x: 20, y: 50 })
  })

  it('measures distance from a point to the nearest point on a segment', () => {
    expect(distanceToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5)
    expect(distanceToSegment({ x: -5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5) // clamps before the segment
    expect(distanceToSegment({ x: 15, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5) // clamps past the segment
    expect(distanceToSegment({ x: 3, y: 0 }, { x: 5, y: 5 }, { x: 5, y: 5 })).toBe(distance({ x: 3, y: 0 }, { x: 5, y: 5 })) // zero-length segment
  })

  it('measures distance to the nearest segment of an open polyline', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]
    expect(distanceToPolyline({ x: 5, y: 1 }, points)).toBeCloseTo(1) // near the first segment
    expect(distanceToPolyline({ x: 11, y: 5 }, points)).toBeCloseTo(1) // near the second segment
    // Not closed: distance from a point near the "missing" closing edge should be large.
    expect(distanceToPolyline({ x: 5, y: 15 }, points)).toBeGreaterThan(5)
  })

  it('measures distance to a closed polyline, including the wrap-around segment', () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    expect(distanceToPolyline({ x: 5, y: 10.5 }, square, false)).toBeGreaterThan(0.4)
    expect(distanceToPolyline({ x: 5, y: 10.5 }, square, true)).toBeCloseTo(0.5)
  })

  it('handles degenerate polylines gracefully', () => {
    expect(distanceToPolyline({ x: 0, y: 0 }, [])).toBe(Infinity)
    expect(distanceToPolyline({ x: 3, y: 4 }, [{ x: 0, y: 0 }])).toBe(5)
  })

  it('sums segment lengths for an open polyline', () => {
    expect(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 14 }])).toBe(15)
  })

  it('includes the wrap-around edge for a closed polyline', () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    expect(polylineLength(square, false)).toBe(30)
    expect(polylineLength(square, true)).toBe(40)
  })

  it('places a point at a given distance along a multi-segment polyline, with tangent angle', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]
    expect(pointAtDistance(points, 5)).toEqual({ point: { x: 5, y: 0 }, angle: 0 })
    const onSecondSegment = pointAtDistance(points, 15)
    expect(onSecondSegment.point).toEqual({ x: 10, y: 5 })
    expect(onSecondSegment.angle).toBeCloseTo(Math.PI / 2)
  })

  it('clamps pointAtDistance to the polyline ends', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    expect(pointAtDistance(points, -5).point).toEqual({ x: 0, y: 0 })
    expect(pointAtDistance(points, 50).point).toEqual({ x: 10, y: 0 })
  })

  it('projects a world point back onto the polyline as a distance-along value', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]
    expect(distanceAlongPolyline(points, { x: 5, y: 3 })).toBeCloseTo(5)
    expect(distanceAlongPolyline(points, { x: 12, y: 5 })).toBeCloseTo(15)
  })

  it('slices a mid-segment span out of a polyline, keeping interior vertices', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }]
    expect(slicePolyline(points, 4, 8)).toEqual([{ x: 4, y: 0 }, { x: 8, y: 0 }])
    // Span crossing the interior vertex at (10,0) keeps it.
    expect(slicePolyline(points, 8, 12)).toEqual([{ x: 8, y: 0 }, { x: 10, y: 0 }, { x: 12, y: 0 }])
  })

  it('returns an empty slice for a zero-length or out-of-range span', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    expect(slicePolyline(points, 5, 5)).toEqual([])
  })
})
