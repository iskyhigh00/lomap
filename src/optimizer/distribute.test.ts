import { describe, expect, it } from 'vitest'
import { distributeAlongAxis, setUniformSpacing } from './distribute'

const box = (minX: number, maxX: number) => ({ minX, minY: 0, maxX, maxY: 100 })

describe('distributeAlongAxis', () => {
  it('equalizes gaps between 3+ items, keeping the extremes fixed', () => {
    const items = [
      { id: 'a', box: box(0, 100) },
      { id: 'b', box: box(150, 200) }, // too close to a
      { id: 'c', box: box(500, 600) },
    ]
    const deltas = distributeAlongAxis(items, 'x')
    // total span 0..600 = 600, total item size = 100+50+100=250, gap = (600-250)/2 = 175
    expect(deltas.find((d) => d.id === 'a')!.dx).toBe(0)
    expect(deltas.find((d) => d.id === 'c')!.dx).toBe(0)
    const b = deltas.find((d) => d.id === 'b')!
    expect(b.dx).toBeCloseTo(100 + 175 - 150) // new minX for b = 275
  })

  it('is a no-op for fewer than 3 items', () => {
    expect(distributeAlongAxis([{ id: 'a', box: box(0, 10) }, { id: 'b', box: box(20, 30) }], 'x')).toEqual([])
  })
})

describe('setUniformSpacing', () => {
  it('sets an exact gap between consecutive items, anchored on the first', () => {
    const items = [
      { id: 'a', box: box(0, 100) },
      { id: 'b', box: box(300, 350) },
    ]
    const deltas = setUniformSpacing(items, 'x', 20)
    expect(deltas.find((d) => d.id === 'a')!.dx).toBe(0)
    // b should move so its minX becomes 100 (a's maxX) + 20 = 120
    expect(deltas.find((d) => d.id === 'b')!.dx).toBeCloseTo(120 - 300)
  })

  it('works along the y axis', () => {
    const items = [
      { id: 'a', box: { minX: 0, minY: 0, maxX: 10, maxY: 50 } },
      { id: 'b', box: { minX: 0, minY: 200, maxX: 10, maxY: 250 } },
    ]
    const deltas = setUniformSpacing(items, 'y', 10)
    expect(deltas.find((d) => d.id === 'b')!.dy).toBeCloseTo(60 - 200)
  })

  it('is a no-op for fewer than 2 items', () => {
    expect(setUniformSpacing([{ id: 'a', box: box(0, 10) }], 'x', 20)).toEqual([])
  })
})
