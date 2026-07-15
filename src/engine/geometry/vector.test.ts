import { describe, expect, it } from 'vitest'
import { add, angleBetween, distance, midpoint, normalize, rotate, snapPointToGrid, snapToStep, subtract } from './vector'

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
})
