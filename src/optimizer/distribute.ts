import type { Box } from '@editor/hitTest'

export interface PositionDelta {
  id: string
  dx: number
  dy: number
}

type Axis = 'x' | 'y'

function size(box: Box, axis: Axis): number {
  return axis === 'x' ? box.maxX - box.minX : box.maxY - box.minY
}

function minOf(box: Box, axis: Axis): number {
  return axis === 'x' ? box.minX : box.minY
}

function toDelta(id: string, axis: Axis, delta: number): PositionDelta {
  return { id, dx: axis === 'x' ? delta : 0, dy: axis === 'y' ? delta : 0 }
}

/**
 * "Distribución automática entre islas" (Fase 7): equalizes the gaps
 * between 3+ items along an axis, keeping the first and last item's
 * position fixed — the standard "distribute spacing" tool. Fewer than 3
 * items has no meaningful distribution (a single gap is just "the gap"),
 * so it's a no-op.
 */
export function distributeAlongAxis(items: { id: string; box: Box }[], axis: Axis): PositionDelta[] {
  if (items.length < 3) return []
  const sorted = [...items].sort((a, b) => minOf(a.box, axis) - minOf(b.box, axis))
  const start = minOf(sorted[0].box, axis)
  const end = axis === 'x' ? sorted[sorted.length - 1].box.maxX : sorted[sorted.length - 1].box.maxY
  const totalSize = sorted.reduce((sum, item) => sum + size(item.box, axis), 0)
  const gap = (end - start - totalSize) / (sorted.length - 1)

  let cursor = start
  const deltas: PositionDelta[] = []
  for (const item of sorted) {
    deltas.push(toDelta(item.id, axis, cursor - minOf(item.box, axis)))
    cursor += size(item.box, axis) + gap
  }
  return deltas
}

/**
 * "Espaciado uniforme" (Fase 7): sets an exact gap between consecutive
 * items along an axis, anchored on the first (by position) item — unlike
 * `distributeAlongAxis`, the total span isn't fixed, only the gap value is.
 */
export function setUniformSpacing(items: { id: string; box: Box }[], axis: Axis, spacing: number): PositionDelta[] {
  if (items.length < 2) return []
  const sorted = [...items].sort((a, b) => minOf(a.box, axis) - minOf(b.box, axis))
  let cursor = minOf(sorted[0].box, axis)
  const deltas: PositionDelta[] = []
  for (const item of sorted) {
    deltas.push(toDelta(item.id, axis, cursor - minOf(item.box, axis)))
    cursor += size(item.box, axis) + spacing
  }
  return deltas
}
