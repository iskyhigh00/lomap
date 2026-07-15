import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '@store/projectStore'
import { createMoveDoorCommand } from './doorCommands'
import { createDoor, createWall } from '@engine/entities/factory'
import type { DoorEntity } from '@engine/entities/types'

describe('door commands', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject()
  })

  it('moves a door along its wall and undoes cleanly', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 200, y: 0 }])
    const door = createDoor(wall.id, 100, { width: 90 })
    useProjectStore.getState()._addEntity(wall)
    useProjectStore.getState()._addEntity(door)

    const command = createMoveDoorCommand(door.id, 100, 60)
    command.do()
    expect((useProjectStore.getState().entities[door.id] as DoorEntity).offset).toBe(60)

    command.undo()
    expect((useProjectStore.getState().entities[door.id] as DoorEntity).offset).toBe(100)
  })
})
