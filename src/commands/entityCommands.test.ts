import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '@store/projectStore'
import {
  createAddEntityCommand,
  createDeleteEntitiesCommand,
  createMoveEntitiesCommand,
  createRotateGroupCommand,
  createUpdateEntityCommand,
} from './entityCommands'
import { createPillar, createZone } from '@engine/entities/factory'
import type { ZoneEntity } from '@engine/entities/types'

describe('entity commands', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject()
  })

  it('adds and undoes an entity', () => {
    const pillar = createPillar({ x: 10, y: 20 })
    const command = createAddEntityCommand(pillar)

    command.do()
    expect(useProjectStore.getState().entities[pillar.id]).toBeDefined()
    expect(useProjectStore.getState().selectedIds).toEqual([pillar.id])

    command.undo()
    expect(useProjectStore.getState().entities[pillar.id]).toBeUndefined()
  })

  it('deletes entities and restores them on undo, preserving order', () => {
    const pillarA = createPillar({ x: 0, y: 0 })
    const pillarB = createPillar({ x: 10, y: 10 })
    useProjectStore.getState()._addEntity(pillarA)
    useProjectStore.getState()._addEntity(pillarB)

    const command = createDeleteEntitiesCommand([pillarA.id])
    command.do()
    expect(useProjectStore.getState().entityOrder).toEqual([pillarB.id])

    command.undo()
    expect(useProjectStore.getState().entityOrder).toEqual([pillarA.id, pillarB.id])
  })

  it('moves entities by a delta and undoes cleanly', () => {
    const pillar = createPillar({ x: 0, y: 0 })
    useProjectStore.getState()._addEntity(pillar)

    const command = createMoveEntitiesCommand([{ id: pillar.id, dx: 15, dy: -5 }])
    command.do()
    expect(useProjectStore.getState().entities[pillar.id].transform.x).toBe(15)
    expect(useProjectStore.getState().entities[pillar.id].transform.y).toBe(-5)

    command.undo()
    expect(useProjectStore.getState().entities[pillar.id].transform.x).toBe(0)
    expect(useProjectStore.getState().entities[pillar.id].transform.y).toBe(0)
  })

  it('regression: moving a zone actually moves its points (previously a silent no-op)', () => {
    const zone = createZone([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])
    useProjectStore.getState()._addEntity(zone)

    const command = createMoveEntitiesCommand([{ id: zone.id, dx: 5, dy: 8 }])
    command.do()
    const moved = useProjectStore.getState().entities[zone.id] as ZoneEntity
    expect(moved.points).toEqual([{ x: 5, y: 8 }, { x: 15, y: 8 }, { x: 15, y: 18 }])

    command.undo()
    const restored = useProjectStore.getState().entities[zone.id] as ZoneEntity
    expect(restored.points).toEqual(zone.points)
  })

  it('regression: rotating a zone actually rotates its points (previously a silent no-op)', () => {
    const zone = createZone([{ x: 10, y: 0 }, { x: 20, y: 0 }])
    useProjectStore.getState()._addEntity(zone)

    const command = createRotateGroupCommand([zone.id], { x: 0, y: 0 }, Math.PI / 2)
    command.do()
    const rotated = useProjectStore.getState().entities[zone.id] as ZoneEntity
    expect(rotated.points[0].x).toBeCloseTo(0)
    expect(rotated.points[0].y).toBeCloseTo(10)

    command.undo()
    const restored = useProjectStore.getState().entities[zone.id] as ZoneEntity
    expect(restored.points[0].x).toBeCloseTo(10)
    expect(restored.points[0].y).toBeCloseTo(0)
  })

  it('updates an entity field and reverts it on undo', () => {
    const pillar = createPillar({ x: 0, y: 0 })
    useProjectStore.getState()._addEntity(pillar)

    const command = createUpdateEntityCommand(pillar.id, { name: 'Pilar A' })
    command.do()
    expect(useProjectStore.getState().entities[pillar.id].name).toBe('Pilar A')

    command.undo()
    expect(useProjectStore.getState().entities[pillar.id].name).toBe(pillar.name)
  })
})
