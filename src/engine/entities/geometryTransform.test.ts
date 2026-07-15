import { describe, expect, it } from 'vitest'
import { offsetEntityGeometry, rotateEntityGeometry } from './geometryTransform'
import { createPillar, createWall, createZone } from './factory'
import type { WallEntity, ZoneEntity } from './types'

describe('geometryTransform', () => {
  describe('offsetEntityGeometry', () => {
    it('translates transform-anchored entities via transform.x/y', () => {
      const pillar = createPillar({ x: 10, y: 20 })
      const moved = offsetEntityGeometry(pillar, 5, -5)
      expect(moved.transform.x).toBe(15)
      expect(moved.transform.y).toBe(15)
    })

    it('translates geometry-anchored entities via their own points, leaving transform untouched', () => {
      const zone = createZone([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])
      const moved = offsetEntityGeometry(zone, 5, 5) as ZoneEntity
      expect(moved.type).toBe('zone')
      expect(moved.points).toEqual([{ x: 5, y: 5 }, { x: 15, y: 5 }, { x: 15, y: 15 }])
      // The whole point of the fix: transform must stay inert for geometry-anchored types.
      expect(moved.transform).toEqual(zone.transform)
    })

    it('translates a wall by moving every vertex of its polyline, not its transform', () => {
      const wall = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }])
      const moved = offsetEntityGeometry(wall, 10, 20) as WallEntity
      expect(moved.type).toBe('wall')
      expect(moved.points).toEqual([{ x: 10, y: 20 }, { x: 110, y: 20 }])
      expect(moved.transform).toEqual(wall.transform)
    })
  })

  describe('rotateEntityGeometry', () => {
    it('rotates transform-anchored entities around a pivot and accumulates rotation', () => {
      const pillar = createPillar({ x: 10, y: 0 })
      const rotated = rotateEntityGeometry(pillar, Math.PI / 2, { x: 0, y: 0 })
      expect(rotated.transform.x).toBeCloseTo(0)
      expect(rotated.transform.y).toBeCloseTo(10)
      expect(rotated.transform.rotation).toBeCloseTo(Math.PI / 2)
    })

    it('rotates geometry-anchored entities by rotating every point, leaving transform untouched', () => {
      const zone = createZone([{ x: 10, y: 0 }, { x: 20, y: 0 }])
      const rotated = rotateEntityGeometry(zone, Math.PI / 2, { x: 0, y: 0 }) as ZoneEntity
      expect(rotated.points[0].x).toBeCloseTo(0)
      expect(rotated.points[0].y).toBeCloseTo(10)
      expect(rotated.transform).toEqual(zone.transform)
    })
  })
})
