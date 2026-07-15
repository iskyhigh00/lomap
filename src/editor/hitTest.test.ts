import { describe, expect, it } from 'vitest'
import { entityBoundingBox, entitiesInBox, hitTestEntities } from './hitTest'
import { createWall } from '@engine/entities/factory'
import type { GenericEntity } from '@engine/entities/types'

describe('wall hit-testing (polyline-derived, no cached geometry)', () => {
  it('hits a point near a multi-segment wall within half its thickness', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], { thickness: 20 })
    const entities: GenericEntity[] = [wall]
    const map = { [wall.id]: wall }

    // Near the first segment.
    expect(hitTestEntities(entities, map, { x: 50, y: 5 }, 4)).toBe(wall.id)
    // Near the second segment (the polyline's corner).
    expect(hitTestEntities(entities, map, { x: 105, y: 50 }, 4)).toBe(wall.id)
    // Far from both segments and from the "missing" closing edge — walls are open polylines.
    expect(hitTestEntities(entities, map, { x: 50, y: 90 }, 4)).toBeNull()
    // Just outside half the thickness.
    expect(hitTestEntities(entities, map, { x: 50, y: 15 }, 1)).toBeNull()
  })

  it('computes a bounding box from all vertices, not just the first/last', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 50, y: -20 }])
    const box = entityBoundingBox(wall, { [wall.id]: wall })
    expect(box).toEqual({ minX: 0, minY: -20, maxX: 100, maxY: 100 })
  })

  it('is found by box-select when any segment intersects the box', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 200, y: 0 }])
    const entities: GenericEntity[] = [wall]
    const map = { [wall.id]: wall }
    expect(entitiesInBox(entities, map, { minX: 90, minY: -10, maxX: 110, maxY: 10 })).toEqual([wall.id])
    expect(entitiesInBox(entities, map, { minX: 300, minY: 300, maxX: 400, maxY: 400 })).toEqual([])
  })

  it('respects locked/invisible walls (never hit, never box-selected)', () => {
    const wall = { ...createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }]), locked: true }
    const entities: GenericEntity[] = [wall]
    const map = { [wall.id]: wall }
    expect(hitTestEntities(entities, map, { x: 50, y: 0 }, 4)).toBeNull()
    expect(entitiesInBox(entities, map, { minX: -10, minY: -10, maxX: 200, maxY: 10 })).toEqual([])
  })
})
