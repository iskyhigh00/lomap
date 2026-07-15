import type { Box } from '@editor/hitTest'

export interface AlignmentGuide {
  axis: 'x' | 'y'
  /** World-space position of the guide line along that axis. */
  position: number
}

export interface AlignmentSnapResult {
  dx: number
  dy: number
  guides: AlignmentGuide[]
}

/**
 * Smart-guide alignment (Fase 7 — "autoalineación al mover islas"), the same
 * left/center/right + top/center/bottom edge-matching Figma/Illustrator use.
 * Compares `moving`'s three x-candidates and three y-candidates against
 * every box in `others`; the closest match within `tolerance` per axis wins
 * and produces both a snap delta and a guide line to render. Independent
 * per axis, so a drag can snap on x and y to two different neighbors at
 * once. Returns a zero delta / no guide on an axis with no match within
 * tolerance — never forces a snap.
 */
export function findAlignmentSnap(moving: Box, others: Box[], tolerance: number): AlignmentSnapResult {
  const movingX = [moving.minX, (moving.minX + moving.maxX) / 2, moving.maxX]
  const movingY = [moving.minY, (moving.minY + moving.maxY) / 2, moving.maxY]

  let dx = 0
  let dy = 0
  let bestXDist = tolerance
  let bestYDist = tolerance
  let matchedX: number | null = null
  let matchedY: number | null = null

  for (const other of others) {
    const otherX = [other.minX, (other.minX + other.maxX) / 2, other.maxX]
    const otherY = [other.minY, (other.minY + other.maxY) / 2, other.maxY]

    for (const mx of movingX) {
      for (const ox of otherX) {
        const d = Math.abs(mx - ox)
        if (d < bestXDist) {
          bestXDist = d
          dx = ox - mx
          matchedX = ox
        }
      }
    }
    for (const my of movingY) {
      for (const oy of otherY) {
        const d = Math.abs(my - oy)
        if (d < bestYDist) {
          bestYDist = d
          dy = oy - my
          matchedY = oy
        }
      }
    }
  }

  const guides: AlignmentGuide[] = []
  if (matchedX !== null) guides.push({ axis: 'x', position: matchedX })
  if (matchedY !== null) guides.push({ axis: 'y', position: matchedY })
  return { dx: matchedX !== null ? dx : 0, dy: matchedY !== null ? dy : 0, guides }
}
