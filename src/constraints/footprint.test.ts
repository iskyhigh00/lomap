import { describe, expect, it } from 'vitest'
import { entityFootprints } from './footprint'
import { createDoor, createIsland, createMachine, createPillar, createWall } from '@engine/entities/factory'
import type { GenericEntity } from '@engine/entities/types'
import { convexPolygonsIntersect } from '@engine/geometry/sat'

describe('entityFootprints', () => {
  it('builds an axis-aligned rect for an unrotated machine', () => {
    const machine = createMachine({ x: 0, y: 0 }, { width: 60, depth: 40 })
    const [shape] = entityFootprints(machine, {})
    expect(shape).toEqual([
      { x: -30, y: -20 },
      { x: 30, y: -20 },
      { x: 30, y: 20 },
      { x: -30, y: 20 },
    ])
  })

  it('builds one rect per wall segment', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }])
    const shapes = entityFootprints(wall, {})
    expect(shapes).toHaveLength(2)
  })

  it("builds an island's footprint from its member machines' bounds, padded", () => {
    const machineA = createMachine({ x: 0, y: 0 }, { width: 20, depth: 20 })
    const machineB = createMachine({ x: 100, y: 0 }, { width: 20, depth: 20 })
    const island = createIsland({ x: 0, y: 0 }, [machineA.id, machineB.id])
    const entityMap: Record<string, GenericEntity> = { [machineA.id]: machineA, [machineB.id]: machineB }
    const [shape] = entityFootprints(island, entityMap)
    // machines span x: -10..110, padded by 10 → -20..120
    expect(shape[0].x).toBe(-20)
    expect(shape[2].x).toBe(120)
  })

  it('returns no footprint for an island with no (or missing) members', () => {
    const island = createIsland({ x: 0, y: 0 }, [])
    expect(entityFootprints(island, {})).toEqual([])
  })

  it("builds a door's frame footprint centered on the wall, at the wall's thickness", () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 200, y: 0 }], { thickness: 20 })
    const door = createDoor(wall.id, 100, { width: 90, doorType: 'opening' })
    const entityMap: Record<string, GenericEntity> = { [wall.id]: wall }
    const shapes = entityFootprints(door, entityMap)
    expect(shapes).toHaveLength(1) // "opening" (no leaf) has no swing clearance zone
  })

  it('adds a swing clearance zone for single/double doors but not sliding/opening', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 200, y: 0 }], { thickness: 20 })
    const entityMap: Record<string, GenericEntity> = { [wall.id]: wall }
    const single = createDoor(wall.id, 100, { width: 90, doorType: 'single' })
    const sliding = createDoor(wall.id, 100, { width: 90, doorType: 'sliding' })
    expect(entityFootprints(single, entityMap)).toHaveLength(2)
    expect(entityFootprints(sliding, entityMap)).toHaveLength(1)
  })

  it('approximates a circular pillar with its bounding square (same convention as hit-test bbox)', () => {
    const pillar = createPillar({ x: 0, y: 0 }, { shape: 'circular', width: 40, depth: 40 })
    const [shape] = entityFootprints(pillar, {})
    expect(shape).toHaveLength(4)
  })

  it('produces footprints usable directly with the SAT intersection test', () => {
    const a = createMachine({ x: 0, y: 0 }, { width: 60, depth: 40 })
    const b = createMachine({ x: 20, y: 0 }, { width: 60, depth: 40 })
    expect(convexPolygonsIntersect(entityFootprints(a, {})[0], entityFootprints(b, {})[0])).toBe(true)
  })
})
