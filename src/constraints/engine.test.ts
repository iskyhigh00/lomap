import { describe, expect, it } from 'vitest'
import { runConstraints } from './engine'
import { DEFAULT_CONSTRAINT_SETTINGS } from './types'
import { createDoor, createIsland, createMachine, createPillar, createWall, createZone } from '@engine/entities/factory'
import type { GenericEntity } from '@engine/entities/types'

function toMap(entities: GenericEntity[]): Record<string, GenericEntity> {
  return Object.fromEntries(entities.map((e) => [e.id, e]))
}

describe('runConstraints — collision rule', () => {
  it('flags two overlapping machines as an error', () => {
    const a = createMachine({ x: 0, y: 0 }, { width: 60, depth: 60 })
    const b = createMachine({ x: 20, y: 0 }, { width: 60, depth: 60 })
    const entities = [a, b]
    const conflicts = runConstraints(entities, toMap(entities), DEFAULT_CONSTRAINT_SETTINGS)
    const collision = conflicts.find((c) => c.ruleId === 'collision')
    expect(collision).toBeDefined()
    expect(collision!.severity).toBe('error')
    expect(collision!.entityIds.sort()).toEqual([a.id, b.id].sort())
  })

  it('does not flag two machines that are far apart', () => {
    const a = createMachine({ x: 0, y: 0 }, { width: 60, depth: 60 })
    const b = createMachine({ x: 1000, y: 0 }, { width: 60, depth: 60 })
    const entities = [a, b]
    const conflicts = runConstraints(entities, toMap(entities), DEFAULT_CONSTRAINT_SETTINGS)
    expect(conflicts.some((c) => c.ruleId === 'collision')).toBe(false)
  })

  it('does not flag a machine overlapping its own island, or two machines in the same island', () => {
    const island = createIsland({ x: 0, y: 0 }, [])
    const machineA = createMachine({ x: 0, y: 0 }, { width: 60, depth: 60, islandId: island.id })
    const machineB = createMachine({ x: 10, y: 0 }, { width: 60, depth: 60, islandId: island.id })
    island.machineIds = [machineA.id, machineB.id]
    const entities = [machineA, machineB, island]
    const conflicts = runConstraints(entities, toMap(entities), DEFAULT_CONSTRAINT_SETTINGS)
    expect(conflicts.filter((c) => c.ruleId === 'collision')).toEqual([])
  })

  it('does not flag a wall colliding with its own door opening', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 200, y: 0 }], { thickness: 20 })
    const door = createDoor(wall.id, 100, { width: 90, doorType: 'opening' })
    const entities = [wall, door]
    const conflicts = runConstraints(entities, toMap(entities), DEFAULT_CONSTRAINT_SETTINGS)
    expect(conflicts.filter((c) => c.ruleId === 'collision')).toEqual([])
  })

  it('flags a machine blocking a swinging door\'s clearance zone', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 200, y: 0 }], { thickness: 20 })
    const door = createDoor(wall.id, 100, { width: 90, doorType: 'single', flip: false })
    // The door swings to +y (flip=false); put a machine right there.
    const machine = createMachine({ x: 100, y: 40 }, { width: 60, depth: 40 })
    const entities = [wall, door, machine]
    const conflicts = runConstraints(entities, toMap(entities), DEFAULT_CONSTRAINT_SETTINGS)
    expect(conflicts.some((c) => c.ruleId === 'collision' && c.entityIds.includes(door.id))).toBe(true)
  })

  it('ignores locked and invisible entities', () => {
    const a = createMachine({ x: 0, y: 0 }, { width: 60, depth: 60 })
    const b = { ...createMachine({ x: 20, y: 0 }, { width: 60, depth: 60 }), locked: true }
    const entities = [a, b]
    const conflicts = runConstraints(entities, toMap(entities), DEFAULT_CONSTRAINT_SETTINGS)
    expect(conflicts.filter((c) => c.ruleId === 'collision')).toEqual([])
  })

  it('does not evaluate entity types outside its scope (e.g. zones)', () => {
    const zoneA = createZone([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }])
    const zoneB = createZone([{ x: 50, y: 50 }, { x: 150, y: 50 }, { x: 150, y: 150 }, { x: 50, y: 150 }])
    const entities = [zoneA, zoneB]
    const conflicts = runConstraints(entities, toMap(entities), DEFAULT_CONSTRAINT_SETTINGS)
    expect(conflicts).toEqual([])
  })
})

describe('runConstraints — corridor rule', () => {
  it('flags two standalone machines closer than the minimum corridor width', () => {
    const a = createMachine({ x: 0, y: 0 }, { width: 60, depth: 60 })
    const b = createMachine({ x: 80, y: 0 }, { width: 60, depth: 60 }) // gap = 80-30-30 = 20cm
    const entities = [a, b]
    const conflicts = runConstraints(entities, toMap(entities), { ...DEFAULT_CONSTRAINT_SETTINGS, minCorridorWidth: 90 })
    expect(conflicts.some((c) => c.ruleId === 'corridor')).toBe(true)
  })

  it('is disabled when minCorridorWidth is 0', () => {
    const a = createMachine({ x: 0, y: 0 }, { width: 60, depth: 60 })
    const b = createMachine({ x: 80, y: 0 }, { width: 60, depth: 60 })
    const entities = [a, b]
    const conflicts = runConstraints(entities, toMap(entities), { ...DEFAULT_CONSTRAINT_SETTINGS, minCorridorWidth: 0 })
    expect(conflicts.filter((c) => c.ruleId === 'corridor')).toEqual([])
  })
})

describe('runConstraints — clearance rule', () => {
  it('flags a machine too close to a wall', () => {
    // Wall face is at x=10 (thickness 20, centered on x=0); machine's left
    // edge is at x=30, a 20cm gap — under the 25cm minimum, but not overlapping.
    const wall = createWall([{ x: 0, y: -100 }, { x: 0, y: 100 }], { thickness: 20 })
    const machine = createMachine({ x: 40, y: 0 }, { width: 20, depth: 20 })
    const entities = [wall, machine]
    const conflicts = runConstraints(entities, toMap(entities), { ...DEFAULT_CONSTRAINT_SETTINGS, minWallDistance: 25 })
    expect(conflicts.some((c) => c.ruleId === 'clearance' && c.entityIds.includes(wall.id))).toBe(true)
  })

  it('flags a machine too close to a pillar', () => {
    const pillar = createPillar({ x: 0, y: 0 }, { width: 40, depth: 40 })
    const machine = createMachine({ x: 40, y: 0 }, { width: 20, depth: 20 })
    const entities = [pillar, machine]
    const conflicts = runConstraints(entities, toMap(entities), { ...DEFAULT_CONSTRAINT_SETTINGS, minPillarDistance: 20 })
    expect(conflicts.some((c) => c.ruleId === 'clearance' && c.entityIds.includes(pillar.id))).toBe(true)
  })

  it('does not double-report an overlap as a clearance warning (collisionRule already covers it)', () => {
    const wall = createWall([{ x: 0, y: -100 }, { x: 0, y: 100 }], { thickness: 20 })
    const machine = createMachine({ x: 5, y: 0 }, { width: 20, depth: 20 }) // overlaps the wall
    const entities = [wall, machine]
    const conflicts = runConstraints(entities, toMap(entities), { ...DEFAULT_CONSTRAINT_SETTINGS, minWallDistance: 50 })
    expect(conflicts.filter((c) => c.ruleId === 'clearance').length).toBe(0)
    expect(conflicts.some((c) => c.ruleId === 'collision')).toBe(true)
  })
})
