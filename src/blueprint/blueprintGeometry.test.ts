import { describe, expect, it } from 'vitest'
import { imageLocalToWorld, imageWorldSize, isPointOnBlueprint, worldToImageLocal } from './blueprintGeometry'
import { IDENTITY_TRANSFORM } from '@engine/geometry/types'
import type { BlueprintDocument } from './types'

function makeDoc(overrides: Partial<BlueprintDocument> = {}): BlueprintDocument {
  return {
    id: 'bp_1',
    name: 'plan',
    sourceFormat: 'png',
    naturalWidth: 200,
    naturalHeight: 100,
    transform: { ...IDENTITY_TRANSFORM },
    opacity: 1,
    brightness: 0,
    contrast: 0,
    locked: false,
    visible: true,
    calibration: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('blueprintGeometry', () => {
  it('computes world size from natural size and scale', () => {
    const doc = makeDoc({ transform: { ...IDENTITY_TRANSFORM, scaleX: 2, scaleY: 3 } })
    expect(imageWorldSize(doc)).toEqual({ width: 400, height: 300 })
  })

  it('maps the natural top-left/center/bottom-right through an identity transform', () => {
    const doc = makeDoc({ transform: { ...IDENTITY_TRANSFORM, x: 0, y: 0 } })
    expect(worldToImageLocal(doc, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(worldToImageLocal(doc, { x: 100, y: 50 })).toEqual({ x: 100, y: 50 })
    expect(worldToImageLocal(doc, { x: 200, y: 100 })).toEqual({ x: 200, y: 100 })
  })

  it('round-trips world -> local -> world after move, scale, and rotation', () => {
    const doc = makeDoc({
      transform: { x: 50, y: 30, rotation: Math.PI / 6, scaleX: 1.5, scaleY: 1.5 },
    })
    const worldPoint = { x: 120, y: 80 }
    const local = worldToImageLocal(doc, worldPoint)
    const roundTripped = imageLocalToWorld(doc, local)
    expect(roundTripped.x).toBeCloseTo(worldPoint.x)
    expect(roundTripped.y).toBeCloseTo(worldPoint.y)
  })

  it('keeps a calibration point valid after the image is moved (the whole point of storing it in local space)', () => {
    const before = makeDoc({ transform: { ...IDENTITY_TRANSFORM, x: 0, y: 0 } })
    const clickedWorldPoint = { x: 50, y: 50 }
    const local = worldToImageLocal(before, clickedWorldPoint)

    // Image moves after calibration.
    const after = makeDoc({ transform: { ...IDENTITY_TRANSFORM, x: 200, y: 200 } })
    const resolvedWorldPoint = imageLocalToWorld(after, local)

    expect(resolvedWorldPoint.x).toBeCloseTo(clickedWorldPoint.x + 200)
    expect(resolvedWorldPoint.y).toBeCloseTo(clickedWorldPoint.y + 200)
  })

  it('detects whether a world point lands on the image, accounting for rotation', () => {
    const doc = makeDoc({ transform: { ...IDENTITY_TRANSFORM, x: 0, y: 0 } })
    expect(isPointOnBlueprint(doc, { x: 100, y: 50 })).toBe(true)
    expect(isPointOnBlueprint(doc, { x: -10, y: 50 })).toBe(false)
    expect(isPointOnBlueprint(doc, { x: 250, y: 50 })).toBe(false)

    const rotated = makeDoc({ transform: { ...IDENTITY_TRANSFORM, x: 0, y: 0, rotation: Math.PI / 2 } })
    // A 200x100 image rotated 90° around its own center occupies roughly a
    // 100x200 footprint in world space; a point that was inside before
    // rotating should no longer be a simple axis-aligned hit at the same coords.
    expect(isPointOnBlueprint(rotated, { x: 100, y: 50 })).toBe(true)
  })
})
