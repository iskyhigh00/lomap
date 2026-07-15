import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '@store/projectStore'
import {
  createDeleteWallVertexCommand,
  createInsertWallVertexCommand,
  createMoveWallVertexCommand,
  createSetWallSegmentLengthCommand,
} from './wallCommands'
import { createWall } from '@engine/entities/factory'
import type { WallEntity } from '@engine/entities/types'

describe('wall vertex commands', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject()
  })

  it('moves a single vertex and undoes cleanly', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }])
    useProjectStore.getState()._addEntity(wall)

    const command = createMoveWallVertexCommand(wall.id, 1, 20, -5)
    command.do()
    let updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points).toEqual([{ x: 0, y: 0 }, { x: 120, y: -5 }])

    command.undo()
    updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }])
  })

  it('inserts a vertex at the given index and undoes cleanly', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }])
    useProjectStore.getState()._addEntity(wall)

    const command = createInsertWallVertexCommand(wall.id, 1, { x: 50, y: 10 })
    command.do()
    let updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points).toEqual([{ x: 0, y: 0 }, { x: 50, y: 10 }, { x: 100, y: 0 }])

    command.undo()
    updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }])
  })

  it('deletes a vertex and undoes cleanly', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 50, y: 10 }, { x: 100, y: 0 }])
    useProjectStore.getState()._addEntity(wall)

    const command = createDeleteWallVertexCommand(wall.id, 1)
    command.do()
    let updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }])

    command.undo()
    updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points).toEqual([{ x: 0, y: 0 }, { x: 50, y: 10 }, { x: 100, y: 0 }])
  })

  it('refuses to delete a vertex that would drop the wall below 2 points', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }])
    useProjectStore.getState()._addEntity(wall)

    const command = createDeleteWallVertexCommand(wall.id, 0)
    command.do()
    const updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }])
  })

  it('sets an exact segment length by moving the later vertex along the segment direction', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }])
    useProjectStore.getState()._addEntity(wall)

    const command = createSetWallSegmentLengthCommand(wall.id, 0, 50)
    command.do()
    let updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points[1]).toEqual({ x: 50, y: 0 })
    expect(updated.points[2]).toEqual({ x: 100, y: 100 }) // untouched

    command.undo()
    updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points[1]).toEqual({ x: 100, y: 0 })
  })

  it('sets a diagonal segment length preserving direction', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 30, y: 40 }]) // length 50
    useProjectStore.getState()._addEntity(wall)

    const command = createSetWallSegmentLengthCommand(wall.id, 0, 100)
    command.do()
    const updated = useProjectStore.getState().entities[wall.id] as WallEntity
    expect(updated.points[1].x).toBeCloseTo(60)
    expect(updated.points[1].y).toBeCloseTo(80)
  })
})
