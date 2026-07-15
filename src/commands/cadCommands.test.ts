import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '@store/projectStore'
import {
  createAlignEntitiesCommand,
  createArrayCommand,
  createExtendWallCommand,
  createJoinWallCornersCommand,
  createMirrorEntitiesCommand,
  createOffsetEntityCommand,
  createTrimWallCommand,
} from './cadCommands'
import { createPillar, createWall, createZone } from '@engine/entities/factory'
import type { WallEntity, ZoneEntity } from '@engine/entities/types'

describe('CAD tools', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject()
  })

  it('offset creates a new parallel wall, leaving the source untouched, and undoes cleanly', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 10, y: 0 }])
    useProjectStore.getState()._addEntity(wall)

    const command = createOffsetEntityCommand(wall.id, 5)
    expect(command).not.toBeNull()
    command!.do()
    const state = useProjectStore.getState()
    expect((state.entities[wall.id] as WallEntity).points).toEqual(wall.points)
    const newWallId = state.entityOrder.find((id) => id !== wall.id)!
    expect((state.entities[newWallId] as WallEntity).points).toEqual([{ x: 0, y: 5 }, { x: 10, y: 5 }])

    command!.undo()
    expect(useProjectStore.getState().entityOrder).toEqual([wall.id])
  })

  it('trim shortens the wall end nearest the click to where it crosses the boundary wall', () => {
    // A wall running past a perpendicular boundary at x=100.
    const target = createWall([{ x: 0, y: 0 }, { x: 150, y: 0 }])
    const boundary = createWall([{ x: 100, y: -50 }, { x: 100, y: 50 }])
    useProjectStore.getState()._addEntity(target)
    useProjectStore.getState()._addEntity(boundary)

    const command = createTrimWallCommand(target.id, boundary.id, { x: 150, y: 0 })
    expect(command).not.toBeNull()
    command!.do()
    expect((useProjectStore.getState().entities[target.id] as WallEntity).points).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }])

    command!.undo()
    expect((useProjectStore.getState().entities[target.id] as WallEntity).points).toEqual(target.points)
  })

  it('extend lengthens the wall end nearest the click out to the boundary wall', () => {
    const target = createWall([{ x: 0, y: 0 }, { x: 80, y: 0 }])
    const boundary = createWall([{ x: 100, y: -50 }, { x: 100, y: 50 }])
    useProjectStore.getState()._addEntity(target)
    useProjectStore.getState()._addEntity(boundary)

    const command = createExtendWallCommand(target.id, boundary.id, { x: 80, y: 0 })
    expect(command).not.toBeNull()
    command!.do()
    expect((useProjectStore.getState().entities[target.id] as WallEntity).points).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }])
  })

  it('refuses to trim/extend across parallel walls', () => {
    const target = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }])
    const boundary = createWall([{ x: 0, y: 20 }, { x: 100, y: 20 }])
    useProjectStore.getState()._addEntity(target)
    useProjectStore.getState()._addEntity(boundary)
    expect(createTrimWallCommand(target.id, boundary.id, { x: 100, y: 0 })).toBeNull()
    expect(createExtendWallCommand(target.id, boundary.id, { x: 100, y: 0 })).toBeNull()
  })

  it('joins two wall corners (fillet at radius 0) at their mutual intersection', () => {
    const wallA = createWall([{ x: 0, y: 0 }, { x: 90, y: 0 }])
    const wallB = createWall([{ x: 100, y: 10 }, { x: 100, y: 100 }])
    useProjectStore.getState()._addEntity(wallA)
    useProjectStore.getState()._addEntity(wallB)

    const command = createJoinWallCornersCommand(wallA.id, wallB.id, { x: 90, y: 0 }, { x: 100, y: 10 })
    expect(command).not.toBeNull()
    command!.do()
    const state = useProjectStore.getState()
    expect((state.entities[wallA.id] as WallEntity).points[1]).toEqual({ x: 100, y: 0 })
    expect((state.entities[wallB.id] as WallEntity).points[0]).toEqual({ x: 100, y: 0 })

    command!.undo()
    expect((useProjectStore.getState().entities[wallA.id] as WallEntity).points).toEqual(wallA.points)
    expect((useProjectStore.getState().entities[wallB.id] as WallEntity).points).toEqual(wallB.points)
  })

  it('mirror reflects a zone across an axis and is its own undo', () => {
    const zone = createZone([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])
    useProjectStore.getState()._addEntity(zone)

    const command = createMirrorEntitiesCommand([zone.id], { x: 0, y: 0 }, { x: 0, y: 10 })
    command.do()
    expect((useProjectStore.getState().entities[zone.id] as ZoneEntity).points).toEqual([
      { x: 0, y: 0 },
      { x: -10, y: 0 },
      { x: -10, y: 10 },
    ])

    command.undo()
    expect((useProjectStore.getState().entities[zone.id] as ZoneEntity).points).toEqual(zone.points)
  })

  it('array creates a rows x cols grid of copies and undoes cleanly', () => {
    const pillar = createPillar({ x: 0, y: 0 })
    useProjectStore.getState()._addEntity(pillar)

    const command = createArrayCommand([pillar.id], 2, 3, 50, 50)
    expect(command).not.toBeNull()
    command!.do()
    expect(useProjectStore.getState().entityOrder).toHaveLength(6) // 2 rows x 3 cols

    command!.undo()
    expect(useProjectStore.getState().entityOrder).toEqual([pillar.id])
  })

  it('align lines up the left edges of a multi-selection and undoes cleanly', () => {
    const pillarA = createPillar({ x: 0, y: 0 }, { width: 20, depth: 20 })
    const pillarB = createPillar({ x: 100, y: 50 }, { width: 20, depth: 20 })
    useProjectStore.getState()._addEntity(pillarA)
    useProjectStore.getState()._addEntity(pillarB)

    const command = createAlignEntitiesCommand([pillarA.id, pillarB.id], 'left')
    expect(command).not.toBeNull()
    command!.do()
    const state = useProjectStore.getState()
    expect(state.entities[pillarA.id].transform.x).toBe(state.entities[pillarB.id].transform.x)

    command!.undo()
    expect(useProjectStore.getState().entities[pillarB.id].transform.x).toBe(100)
  })
})
