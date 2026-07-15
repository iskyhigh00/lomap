import type { Command } from './types'
import { useProjectStore } from '@store/projectStore'
import type { GenericEntity, WallEntity } from '@engine/entities/types'
import type { Point } from '@engine/geometry/types'
import { offsetPolyline } from '@engine/geometry/lineOps'
import { generateId } from '@engine/entities/factory'
import { isGeometryAnchored, mirrorEntityGeometry, offsetEntityGeometry } from '@engine/entities/geometryTransform'
import { computeWallCornerJoin, computeWallExtend, computeWallTrim } from '@engine/entities/wallEditOps'
import { entityBoundingBox } from '@editor/hitTest'
import { cloneEntityGroup } from './entityCommands'

/** Offset creates a new, independent copy of the source polyline shifted
 * along its normal — matching standard CAD OFFSET (the original is left
 * untouched). Returns null for entities without their own geometry (points). */
export function createOffsetEntityCommand(sourceId: string, distance: number, label = 'Offset'): Command | null {
  const source = useProjectStore.getState().entities[sourceId]
  if (!source || !isGeometryAnchored(source) || distance === 0) return null
  const newPoints = offsetPolyline(source.points, distance)
  const clone: GenericEntity = { ...source, points: newPoints, id: generateId(source.type), createdAt: Date.now(), updatedAt: Date.now() }
  return {
    label,
    do() {
      const s = useProjectStore.getState()
      s._addEntity(clone)
      s.setSelection([clone.id])
    },
    undo() {
      useProjectStore.getState()._removeEntity(clone.id)
    },
  }
}

export function createTrimWallCommand(targetId: string, boundaryId: string, clickPoint: Point, label = 'Recortar muro'): Command | null {
  const state = useProjectStore.getState()
  const target = state.entities[targetId]
  const boundary = state.entities[boundaryId]
  if (target?.type !== 'wall' || boundary?.type !== 'wall') return null
  const newPoints = computeWallTrim(target as WallEntity, boundary as WallEntity, clickPoint)
  if (!newPoints) return null
  const oldPoints = (target as WallEntity).points
  return {
    label,
    do() {
      useProjectStore.getState()._updateEntity(targetId, { points: newPoints } as Partial<WallEntity>)
    },
    undo() {
      useProjectStore.getState()._updateEntity(targetId, { points: oldPoints } as Partial<WallEntity>)
    },
  }
}

export function createExtendWallCommand(targetId: string, boundaryId: string, clickPoint: Point, label = 'Extender muro'): Command | null {
  const state = useProjectStore.getState()
  const target = state.entities[targetId]
  const boundary = state.entities[boundaryId]
  if (target?.type !== 'wall' || boundary?.type !== 'wall') return null
  const newPoints = computeWallExtend(target as WallEntity, boundary as WallEntity, clickPoint)
  if (!newPoints) return null
  const oldPoints = (target as WallEntity).points
  return {
    label,
    do() {
      useProjectStore.getState()._updateEntity(targetId, { points: newPoints } as Partial<WallEntity>)
    },
    undo() {
      useProjectStore.getState()._updateEntity(targetId, { points: oldPoints } as Partial<WallEntity>)
    },
  }
}

/** "Fillet" at a fixed radius of 0 — see engine/entities/wallEditOps.ts for
 * why a true rounded fillet isn't representable in the current wall model. */
export function createJoinWallCornersCommand(
  wallAId: string,
  wallBId: string,
  clickA: Point,
  clickB: Point,
  label = 'Unir esquina',
): Command | null {
  const state = useProjectStore.getState()
  const wallA = state.entities[wallAId]
  const wallB = state.entities[wallBId]
  if (wallA?.type !== 'wall' || wallB?.type !== 'wall') return null
  const result = computeWallCornerJoin(wallA as WallEntity, wallB as WallEntity, clickA, clickB)
  if (!result) return null
  const oldPointsA = (wallA as WallEntity).points
  const oldPointsB = (wallB as WallEntity).points
  return {
    label,
    do() {
      const s = useProjectStore.getState()
      s._updateEntity(wallAId, { points: result.pointsA } as Partial<WallEntity>)
      s._updateEntity(wallBId, { points: result.pointsB } as Partial<WallEntity>)
    },
    undo() {
      const s = useProjectStore.getState()
      s._updateEntity(wallAId, { points: oldPointsA } as Partial<WallEntity>)
      s._updateEntity(wallBId, { points: oldPointsB } as Partial<WallEntity>)
    },
  }
}

/** Mirroring is self-inverse — applying the same reflection twice restores
 * the original exactly, so `do` and `undo` are literally the same operation. */
export function createMirrorEntitiesCommand(ids: string[], axisA: Point, axisB: Point, label = 'Reflejar'): Command {
  const apply = () => {
    const state = useProjectStore.getState()
    for (const id of ids) {
      const entity = state.entities[id]
      if (!entity) continue
      state._updateEntity(id, mirrorEntityGeometry(entity, axisA, axisB))
    }
  }
  return { label, do: apply, undo: apply }
}

/** Rectangular array: `rows` × `cols` copies of the selection, spaced `dx`/`dy`
 * apart (the source occupies cell [0,0] and is left untouched). */
export function createArrayCommand(ids: string[], rows: number, cols: number, dx: number, dy: number, label = 'Matriz'): Command | null {
  if (rows < 1 || cols < 1 || (rows === 1 && cols === 1)) return null
  const state = useProjectStore.getState()
  const sourceEntities = ids.map((id) => state.entities[id]).filter((e): e is GenericEntity => Boolean(e))
  if (sourceEntities.length === 0) return null

  const allClones: GenericEntity[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === 0) continue
      const { clones } = cloneEntityGroup(sourceEntities, c * dx, r * dy)
      allClones.push(...clones)
    }
  }

  return {
    label,
    do() {
      const s = useProjectStore.getState()
      for (const clone of allClones) s._addEntity(clone)
      s.setSelection(allClones.map((c) => c.id))
    },
    undo() {
      const s = useProjectStore.getState()
      for (const clone of allClones) s._removeEntity(clone.id)
    },
  }
}

export type AlignMode = 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v'

/** Aligns every entity in the selection to a shared edge/center of the
 * selection's combined bounding box. Entities with no meaningful bbox delta
 * for the chosen axis (e.g. a door, which never moves independently of its
 * wall) are included in the box computation but simply see dx=dy=0. */
export function createAlignEntitiesCommand(ids: string[], mode: AlignMode, label = 'Alinear'): Command | null {
  const state = useProjectStore.getState()
  const entities = ids.map((id) => state.entities[id]).filter((e): e is GenericEntity => Boolean(e))
  if (entities.length < 2) return null
  const boxes = entities.map((e) => entityBoundingBox(e, state.entities))

  const target =
    mode === 'left'
      ? Math.min(...boxes.map((b) => b.minX))
      : mode === 'right'
        ? Math.max(...boxes.map((b) => b.maxX))
        : mode === 'top'
          ? Math.min(...boxes.map((b) => b.minY))
          : mode === 'bottom'
            ? Math.max(...boxes.map((b) => b.maxY))
            : mode === 'center-h'
              ? (Math.min(...boxes.map((b) => b.minX)) + Math.max(...boxes.map((b) => b.maxX))) / 2
              : (Math.min(...boxes.map((b) => b.minY)) + Math.max(...boxes.map((b) => b.maxY))) / 2

  const deltas = entities.map((entity, i) => {
    const box = boxes[i]
    let dx = 0
    let dy = 0
    if (mode === 'left') dx = target - box.minX
    else if (mode === 'right') dx = target - box.maxX
    else if (mode === 'top') dy = target - box.minY
    else if (mode === 'bottom') dy = target - box.maxY
    else if (mode === 'center-h') dx = target - (box.minX + box.maxX) / 2
    else dy = target - (box.minY + box.maxY) / 2
    return { id: entity.id, dx, dy }
  })

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
