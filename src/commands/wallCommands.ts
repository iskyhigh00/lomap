import type { Command } from './types'
import { useProjectStore } from '@store/projectStore'
import type { WallEntity } from '@engine/entities/types'
import type { Point } from '@engine/geometry/types'

function getWall(id: string): WallEntity | undefined {
  const entity = useProjectStore.getState().entities[id]
  return entity?.type === 'wall' ? (entity as WallEntity) : undefined
}

/** Moves a single vertex of a wall's polyline by (dx, dy). */
export function createMoveWallVertexCommand(wallId: string, vertexIndex: number, dx: number, dy: number): Command {
  const applyDelta = (ddx: number, ddy: number) => {
    const wall = getWall(wallId)
    if (!wall || !wall.points[vertexIndex]) return
    const points = wall.points.slice()
    points[vertexIndex] = { x: points[vertexIndex].x + ddx, y: points[vertexIndex].y + ddy }
    useProjectStore.getState()._updateEntity(wallId, { points })
  }
  return {
    label: 'Mover vértice de muro',
    do() {
      applyDelta(dx, dy)
    },
    undo() {
      applyDelta(-dx, -dy)
    },
  }
}

/** Inserts a new vertex into a wall's polyline at `insertIndex`. */
export function createInsertWallVertexCommand(wallId: string, insertIndex: number, point: Point): Command {
  return {
    label: 'Insertar vértice',
    do() {
      const wall = getWall(wallId)
      if (!wall) return
      const points = wall.points.slice()
      points.splice(insertIndex, 0, point)
      useProjectStore.getState()._updateEntity(wallId, { points })
    },
    undo() {
      const wall = getWall(wallId)
      if (!wall) return
      const points = wall.points.slice()
      points.splice(insertIndex, 1)
      useProjectStore.getState()._updateEntity(wallId, { points })
    },
  }
}

/** Removes a vertex from a wall's polyline. Refuses to drop the wall below 2
 * points — a wall with fewer than 2 vertices isn't a valid polyline; delete
 * the whole wall entity instead if that's the intent. */
export function createDeleteWallVertexCommand(wallId: string, vertexIndex: number): Command {
  const wall = getWall(wallId)
  const removedPoint = wall?.points[vertexIndex]

  return {
    label: 'Eliminar vértice',
    do() {
      const current = getWall(wallId)
      if (!current || current.points.length <= 2) return
      const points = current.points.slice()
      points.splice(vertexIndex, 1)
      useProjectStore.getState()._updateEntity(wallId, { points })
    },
    undo() {
      const current = getWall(wallId)
      if (!current || !removedPoint) return
      const points = current.points.slice()
      points.splice(vertexIndex, 0, removedPoint)
      useProjectStore.getState()._updateEntity(wallId, { points })
    },
  }
}

/** Sets an exact segment length by moving its later vertex along the
 * segment's current direction, keeping the earlier vertex fixed. */
export function createSetWallSegmentLengthCommand(wallId: string, segmentIndex: number, newLength: number): Command {
  const wall = getWall(wallId)
  const a = wall?.points[segmentIndex]
  const b = wall?.points[segmentIndex + 1]
  if (!wall || !a || !b || newLength <= 0) return { label: 'Longitud de segmento', do() {}, undo() {} }

  const dx = b.x - a.x
  const dy = b.y - a.y
  const currentLength = Math.hypot(dx, dy)
  if (currentLength === 0) return { label: 'Longitud de segmento', do() {}, undo() {} }

  const scale = newLength / currentLength
  const newB: Point = { x: a.x + dx * scale, y: a.y + dy * scale }
  const previousB = b

  return {
    label: 'Longitud de segmento',
    do() {
      const current = getWall(wallId)
      if (!current) return
      const points = current.points.slice()
      points[segmentIndex + 1] = newB
      useProjectStore.getState()._updateEntity(wallId, { points })
    },
    undo() {
      const current = getWall(wallId)
      if (!current) return
      const points = current.points.slice()
      points[segmentIndex + 1] = previousB
      useProjectStore.getState()._updateEntity(wallId, { points })
    },
  }
}
