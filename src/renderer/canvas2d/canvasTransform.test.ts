import { describe, expect, it } from 'vitest'
import { computeWorldToCanvasMatrix } from './canvasTransform'

describe('computeWorldToCanvasMatrix', () => {
  it('is the identity scale/translate at zoom 1, no pan, dpr 1', () => {
    const m = computeWorldToCanvasMatrix({ x: 0, y: 0, zoom: 1 }, 1)
    expect(m).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
  })

  it('scales by zoom on both axes uniformly', () => {
    const m = computeWorldToCanvasMatrix({ x: 0, y: 0, zoom: 2.5 }, 1)
    expect(m.a).toBe(2.5)
    expect(m.d).toBe(2.5)
    expect(m.b).toBe(0)
    expect(m.c).toBe(0)
  })

  it('translates by pan, unaffected by zoom (pan is already in screen space)', () => {
    const m = computeWorldToCanvasMatrix({ x: 120, y: -40, zoom: 3 }, 1)
    expect(m.e).toBe(120)
    expect(m.f).toBe(-40)
  })

  it('multiplies both scale and pan by dpr — the exact bug this module fixes', () => {
    const m = computeWorldToCanvasMatrix({ x: 100, y: 50, zoom: 2 }, 2)
    expect(m.a).toBe(4) // zoom * dpr
    expect(m.d).toBe(4)
    expect(m.e).toBe(200) // x * dpr
    expect(m.f).toBe(100) // y * dpr
  })

  it('places a known world point at the expected device-pixel location', () => {
    const viewport = { x: 50, y: 20, zoom: 2 }
    const dpr = 2
    const m = computeWorldToCanvasMatrix(viewport, dpr)
    const worldPoint = { x: 30, y: 10 }
    const devicePixel = {
      x: worldPoint.x * m.a + m.e,
      y: worldPoint.y * m.d + m.f,
    }
    // world (30,10) -> screen (30*2+50, 10*2+20) = (110, 40) -> device *2 = (220, 80)
    expect(devicePixel).toEqual({ x: 220, y: 80 })
  })
})
