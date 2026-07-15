import { describe, expect, it } from 'vitest'
import { boundingBoxOfPoints, boxesIntersect, boxesOverlapWithMargin, expandBox, pointInBox, pointInPolygon, polygonArea } from './polygon'

describe('polygon geometry', () => {
  it('computes bounding box of points', () => {
    const box = boundingBoxOfPoints([{ x: 0, y: 0 }, { x: 5, y: -2 }, { x: -3, y: 4 }])
    expect(box).toEqual({ minX: -3, minY: -2, maxX: 5, maxY: 4 })
  })

  it('detects box intersection', () => {
    const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 }
    const b = { minX: 5, minY: 5, maxX: 15, maxY: 15 }
    const c = { minX: 20, minY: 20, maxX: 30, maxY: 30 }
    expect(boxesIntersect(a, b)).toBe(true)
    expect(boxesIntersect(a, c)).toBe(false)
  })

  it('tests point in box', () => {
    const box = { minX: 0, minY: 0, maxX: 10, maxY: 10 }
    expect(pointInBox({ x: 5, y: 5 }, box)).toBe(true)
    expect(pointInBox({ x: 15, y: 5 }, box)).toBe(false)
  })

  it('tests point in polygon (convex square)', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true)
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false)
  })

  it('computes polygon area', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    expect(polygonArea(square)).toBe(100)
  })

  it('detects overlap with margin', () => {
    const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 }
    const b = { minX: 12, minY: 0, maxX: 20, maxY: 10 }
    expect(boxesOverlapWithMargin(a, b, 0)).toBe(false)
    expect(boxesOverlapWithMargin(a, b, 5)).toBe(true)
  })

  it('expands a box', () => {
    const box = { minX: 0, minY: 0, maxX: 10, maxY: 10 }
    expect(expandBox(box, 2)).toEqual({ minX: -2, minY: -2, maxX: 12, maxY: 12 })
  })
})
