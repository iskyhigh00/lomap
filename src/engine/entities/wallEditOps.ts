import type { Point } from '@engine/geometry/types'
import type { WallEntity } from './types'
import { lineIntersection } from '@engine/geometry/lineOps'
import { distance } from '@engine/geometry/vector'

interface TerminalSegment {
  /** The open end's own vertex index — always 0 or `points.length - 1`. */
  vertexIndex: number
  /** The neighboring vertex that defines the terminal segment's direction. */
  otherIndex: number
}

function terminalSegments(wall: WallEntity): TerminalSegment[] {
  const last = wall.points.length - 1
  if (last < 1) return []
  return [
    { vertexIndex: 0, otherIndex: 1 },
    { vertexIndex: last, otherIndex: last - 1 },
  ]
}

/** The terminal segment of `wall` whose open end is closest to `point`. Trim,
 * extend, and the corner-join ("fillet") all operate on wall *ends* — the
 * overwhelmingly common real case (a corner or a T where one wall over/under-
 * shoots another) — not arbitrary interior cuts through a polyline. */
function nearestTerminal(wall: WallEntity, point: Point): TerminalSegment | null {
  const terms = terminalSegments(wall)
  if (terms.length === 0) return null
  let best = terms[0]
  let bestDist = distance(wall.points[terms[0].vertexIndex], point)
  for (const term of terms.slice(1)) {
    const d = distance(wall.points[term.vertexIndex], point)
    if (d < bestDist) {
      best = term
      bestDist = d
    }
  }
  return best
}

/** Trims `target`'s end nearest `clickPoint` back to where it crosses
 * `boundary`. Returns the new `points`, or null if the walls are parallel,
 * or the crossing doesn't actually shorten the wall (that's not a trim). */
export function computeWallTrim(target: WallEntity, boundary: WallEntity, clickPoint: Point): Point[] | null {
  const term = nearestTerminal(target, clickPoint)
  const boundaryTerm = nearestTerminal(boundary, clickPoint)
  if (!term || !boundaryTerm) return null
  const a = target.points[term.vertexIndex]
  const b = target.points[term.otherIndex]
  const c = boundary.points[boundaryTerm.vertexIndex]
  const d = boundary.points[boundaryTerm.otherIndex]
  const intersection = lineIntersection(a, b, c, d)
  if (!intersection) return null
  const segLen = distance(a, b)
  const distFromOther = distance(b, intersection)
  if (distFromOther > segLen + 1e-6 || distFromOther < 1e-6) return null
  const points = target.points.slice()
  points[term.vertexIndex] = intersection
  return points
}

/** Extends `target`'s end nearest `clickPoint` outward along its existing
 * direction until it meets `boundary`. Returns null if the walls are
 * parallel, or the boundary lies within the current wall (that's a trim). */
export function computeWallExtend(target: WallEntity, boundary: WallEntity, clickPoint: Point): Point[] | null {
  const term = nearestTerminal(target, clickPoint)
  const boundaryTerm = nearestTerminal(boundary, clickPoint)
  if (!term || !boundaryTerm) return null
  const a = target.points[term.vertexIndex]
  const b = target.points[term.otherIndex]
  const c = boundary.points[boundaryTerm.vertexIndex]
  const d = boundary.points[boundaryTerm.otherIndex]
  const intersection = lineIntersection(a, b, c, d)
  if (!intersection) return null
  const segLen = distance(a, b)
  const distFromOther = distance(b, intersection)
  if (distFromOther <= segLen + 1e-6) return null
  const points = target.points.slice()
  points[term.vertexIndex] = intersection
  return points
}

/** Joins two walls' nearest ends at their mutual intersection — the "fillet"
 * tool at a fixed radius of 0. Walls are straight polylines with no arc/bulge
 * field in the data model (see engine/entities/types.ts), so a true rounded
 * fillet isn't representable yet; this delivers the same real-world outcome
 * (two walls meeting cleanly at a corner) without faking curved geometry.
 * Returns null if the walls' terminal segments are parallel. */
export function computeWallCornerJoin(
  wallA: WallEntity,
  wallB: WallEntity,
  clickA: Point,
  clickB: Point,
): { pointsA: Point[]; pointsB: Point[] } | null {
  const termA = nearestTerminal(wallA, clickA)
  const termB = nearestTerminal(wallB, clickB)
  if (!termA || !termB) return null
  const a1 = wallA.points[termA.vertexIndex]
  const a2 = wallA.points[termA.otherIndex]
  const b1 = wallB.points[termB.vertexIndex]
  const b2 = wallB.points[termB.otherIndex]
  const intersection = lineIntersection(a1, a2, b1, b2)
  if (!intersection) return null
  const pointsA = wallA.points.slice()
  pointsA[termA.vertexIndex] = intersection
  const pointsB = wallB.points.slice()
  pointsB[termB.vertexIndex] = intersection
  return { pointsA, pointsB }
}
