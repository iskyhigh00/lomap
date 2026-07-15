import type { Command } from './types'
import { useProjectStore } from '@store/projectStore'
import type { GenericEntity, WallEntity } from '@engine/entities/types'
import { entityBoundingBox } from '@editor/hitTest'
import { offsetEntityGeometry } from '@engine/entities/geometryTransform'
import { distributeAlongAxis, setUniformSpacing, type PositionDelta } from '@optimizer/distribute'
import { findNearestWallAngle, smartRotationDelta } from '@optimizer/smartRotate'
import { createRotateGroupCommand } from './entityCommands'
import { expandGroupIds } from '@selection/groupSelection'

function applyDeltas(deltas: PositionDelta[], label: string): Command {
  return {
    label,
    do() {
      const s = useProjectStore.getState()
      for (const { id, dx, dy } of deltas) {
        const entity = s.entities[id]
        if (entity) s._updateEntity(id, offsetEntityGeometry(entity, dx, dy))
      }
    },
    undo() {
      const s = useProjectStore.getState()
      for (const { id, dx, dy } of deltas) {
        const entity = s.entities[id]
        if (entity) s._updateEntity(id, offsetEntityGeometry(entity, -dx, -dy))
      }
    },
  }
}

/** "Distribución automática entre islas" (Fase 7). Null when fewer than 3
 * of the selected ids resolve to entities (nothing meaningful to distribute). */
export function createDistributeCommand(ids: string[], axis: 'x' | 'y', label = 'Distribuir'): Command | null {
  const state = useProjectStore.getState()
  const items = ids
    .map((id) => state.entities[id])
    .filter((e): e is GenericEntity => Boolean(e))
    .map((e) => ({ id: e.id, box: entityBoundingBox(e, state.entities) }))
  const deltas = distributeAlongAxis(items, axis)
  return deltas.length > 0 ? applyDeltas(deltas, label) : null
}

/** "Espaciado uniforme" (Fase 7). */
export function createUniformSpacingCommand(ids: string[], axis: 'x' | 'y', spacing: number, label = 'Espaciado uniforme'): Command | null {
  const state = useProjectStore.getState()
  const items = ids
    .map((id) => state.entities[id])
    .filter((e): e is GenericEntity => Boolean(e))
    .map((e) => ({ id: e.id, box: entityBoundingBox(e, state.entities) }))
  const deltas = setUniformSpacing(items, axis, spacing)
  return deltas.length > 0 ? applyDeltas(deltas, label) : null
}

/** "Rotación inteligente" (Fase 7): aligns an island to the wall it's
 * closest to. Reuses `createRotateGroupCommand` unchanged — this only picks
 * *how much* to rotate, never re-implements rotation itself. Null when
 * there's no island, no walls to align to, or it's already aligned. */
export function createSmartRotateCommand(islandId: string, label = 'Rotación inteligente'): Command | null {
  const state = useProjectStore.getState()
  const island = state.entities[islandId]
  if (island?.type !== 'island') return null
  const walls = Object.values(state.entities).filter((e): e is WallEntity => e.type === 'wall')
  const targetAngle = findNearestWallAngle({ x: island.transform.x, y: island.transform.y }, walls)
  if (targetAngle === null) return null
  const delta = smartRotationDelta(island.transform.rotation, targetAngle)
  if (Math.abs(delta) < 1e-6) return null
  const groupIds = expandGroupIds(state.entities, [islandId])
  return createRotateGroupCommand(groupIds, { x: island.transform.x, y: island.transform.y }, delta, label)
}
