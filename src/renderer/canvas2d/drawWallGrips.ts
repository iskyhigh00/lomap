import type { Viewport } from '@store/projectStore'
import type { WallEntity } from '@engine/entities/types'
import { midpoint } from '@engine/geometry/vector'
import { applyWorldTransform } from './canvasTransform'

/** Draws vertex grips (draggable squares) and mid-segment grips (smaller
 * circles that insert a vertex when dragged) for the currently selected
 * wall. Only ever called for a single selected wall — see Canvas2D.tsx. */
export function drawWallGrips(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  wall: WallEntity,
  selectedVertexIndex: number | null,
  dpr: number,
): void {
  ctx.save()
  applyWorldTransform(ctx, viewport, dpr)

  const vertexSize = 7 / viewport.zoom
  const midSize = 4 / viewport.zoom

  for (let i = 0; i < wall.points.length - 1; i++) {
    const mid = midpoint(wall.points[i], wall.points[i + 1])
    ctx.fillStyle = '#0b0e14'
    ctx.strokeStyle = '#3d8bfd88'
    ctx.lineWidth = 1 / viewport.zoom
    ctx.beginPath()
    ctx.arc(mid.x, mid.y, midSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  for (let i = 0; i < wall.points.length; i++) {
    const point = wall.points[i]
    const isSelected = i === selectedVertexIndex
    ctx.fillStyle = isSelected ? '#3ecf8e' : '#0b0e14'
    ctx.strokeStyle = '#3d8bfd'
    ctx.lineWidth = 1.5 / viewport.zoom
    ctx.fillRect(point.x - vertexSize / 2, point.y - vertexSize / 2, vertexSize, vertexSize)
    ctx.strokeRect(point.x - vertexSize / 2, point.y - vertexSize / 2, vertexSize, vertexSize)
  }

  ctx.restore()
}
