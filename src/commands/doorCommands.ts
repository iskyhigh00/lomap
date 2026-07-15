import type { Command } from './types'
import { useProjectStore } from '@store/projectStore'
import type { DoorEntity } from '@engine/entities/types'

/** Moves a door along its host wall to an absolute offset (world units from
 * the wall's first vertex). Used by the drag-along-wall interaction. */
export function createMoveDoorCommand(doorId: string, fromOffset: number, toOffset: number, label = 'Mover puerta'): Command {
  return {
    label,
    do() {
      useProjectStore.getState()._updateEntity(doorId, { offset: toOffset } as Partial<DoorEntity>)
    },
    undo() {
      useProjectStore.getState()._updateEntity(doorId, { offset: fromOffset } as Partial<DoorEntity>)
    },
  }
}
