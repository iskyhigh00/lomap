import type { Point } from './types'

/** Intersection of the two infinite lines through (p1,p2) and (p3,p4).
 * Returns null when the lines are parallel (or coincident). */
export function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d1x = p2.x - p1.x
  const d1y = p2.y - p1.y
  const d2x = p4.x - p3.x
  const d2y = p4.y - p3.y
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-9) return null
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom
  return { x: p1.x + t * d1x, y: p1.y + t * d1y }
}

/** Reflects `point` across the infinite line through `a`-`b`. */
export function mirrorPoint(point: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return point
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared
  const proj = { x: a.x + t * dx, y: a.y + t * dy }
  return { x: 2 * proj.x - point.x, y: 2 * proj.y - point.y }
}

/** Signed perpendicular distance from `cursor` to the polyline segment whose
 * *line* (unclamped) it's closest to, using the same per-segment normal
 * convention as `offsetPolyline` — feeding the result straight back into
 * `offsetPolyline` reproduces the offset the cursor is currently previewing. */
export function signedOffsetDistance(points: Point[], cursor: Point): number {
  let bestAbs = Infinity
  let bestSigned = 0
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len === 0) continue
    const nx = -dy / len
    const ny = dx / len
    const signed = (cursor.x - a.x) * nx + (cursor.y - a.y) * ny
    const abs = Math.abs(signed)
    if (abs < bestAbs) {
      bestAbs = abs
      bestSigned = signed
    }
  }
  return bestSigned
}

/**
 * Offsets an open polyline by `distance` along its perpendicular normal
 * (positive = to the right of travel direction from `points[0]`). Each
 * segment is shifted along its own normal, then consecutive shifted
 * segments are rejoined at their line-line intersection (a miter join) so
 * corners stay sharp instead of stepping. Falls back to the raw shifted
 * endpoint when two consecutive segments are parallel (no single miter
 * point exists).
 */
export function offsetPolyline(points: Point[], distance: number): Point[] {
  if (points.length < 2 || distance === 0) return points.slice()

  const shifted = points.slice(0, -1).map((p, i) => {
    const next = points[i + 1]
    const dx = next.x - p.x
    const dy = next.y - p.y
    const len = Math.hypot(dx, dy)
    if (len === 0) return { a: p, b: next }
    const nx = -dy / len
    const ny = dx / len
    return {
      a: { x: p.x + nx * distance, y: p.y + ny * distance },
      b: { x: next.x + nx * distance, y: next.y + ny * distance },
    }
  })

  const result: Point[] = [shifted[0].a]
  for (let i = 0; i < shifted.length - 1; i++) {
    const s1 = shifted[i]
    const s2 = shifted[i + 1]
    result.push(lineIntersection(s1.a, s1.b, s2.a, s2.b) ?? s1.b)
  }
  result.push(shifted[shifted.length - 1].b)
  return result
}
