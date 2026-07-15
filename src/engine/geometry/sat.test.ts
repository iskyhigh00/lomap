import { describe, expect, it } from 'vitest'
import { convexPolygonDistance, convexPolygonsIntersect } from './sat'

const square = (cx: number, cy: number, size: number) => [
  { x: cx - size / 2, y: cy - size / 2 },
  { x: cx + size / 2, y: cy - size / 2 },
  { x: cx + size / 2, y: cy + size / 2 },
  { x: cx - size / 2, y: cy + size / 2 },
]

describe('convexPolygonsIntersect', () => {
  it('detects overlapping axis-aligned rectangles', () => {
    expect(convexPolygonsIntersect(square(0, 0, 10), square(5, 5, 10))).toBe(true)
  })

  it('does not flag rectangles that are merely touching edge-to-edge', () => {
    expect(convexPolygonsIntersect(square(0, 0, 10), square(10, 0, 10))).toBe(false)
  })

  it('does not flag separated rectangles', () => {
    expect(convexPolygonsIntersect(square(0, 0, 10), square(100, 100, 10))).toBe(false)
  })

  it('detects overlap between a rotated rectangle and an axis-aligned one', () => {
    const rotated = [
      { x: 0, y: -7 },
      { x: 7, y: 0 },
      { x: 0, y: 7 },
      { x: -7, y: 0 },
    ] // a diamond (45°-rotated square) centered at origin
    expect(convexPolygonsIntersect(rotated, square(5, 0, 4))).toBe(true)
    expect(convexPolygonsIntersect(rotated, square(20, 0, 4))).toBe(false)
  })
})

describe('convexPolygonDistance', () => {
  it('is zero for overlapping shapes', () => {
    expect(convexPolygonDistance(square(0, 0, 10), square(5, 0, 10))).toBe(0)
  })

  it('is zero for touching shapes', () => {
    expect(convexPolygonDistance(square(0, 0, 10), square(10, 0, 10))).toBe(0)
  })

  it('measures the gap between two separated rectangles', () => {
    expect(convexPolygonDistance(square(0, 0, 10), square(30, 0, 10))).toBeCloseTo(20)
  })
})
