import type { Point } from './types'
import { distanceToSegment } from './vector'

function project(polygon: Point[], axis: Point): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  for (const p of polygon) {
    const dot = p.x * axis.x + p.y * axis.y
    if (dot < min) min = dot
    if (dot > max) max = dot
  }
  return { min, max }
}

function edgeNormals(polygon: Point[]): Point[] {
  const axes: Point[] = []
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const edge = { x: b.x - a.x, y: b.y - a.y }
    const len = Math.hypot(edge.x, edge.y)
    if (len > 0) axes.push({ x: -edge.y / len, y: edge.x / len })
  }
  return axes
}

/** Separating Axis Theorem overlap test for two convex polygons — exact for
 * rectangles (rotated or not), which is what every collision footprint in
 * `constraints/` is built from. Two shapes that merely touch at an edge or
 * corner (no positive-area overlap) are *not* reported as intersecting. */
export function convexPolygonsIntersect(a: Point[], b: Point[]): boolean {
  if (a.length < 2 || b.length < 2) return false
  for (const axis of [...edgeNormals(a), ...edgeNormals(b)]) {
    const pa = project(a, axis)
    const pb = project(b, axis)
    if (pa.max <= pb.min || pb.max <= pa.min) return false
  }
  return true
}

/** Shortest distance between two convex polygons — 0 when they overlap or
 * touch. Used for clearance-style checks (corridor width, distance to a
 * wall/pillar), not just yes/no collision. */
export function convexPolygonDistance(a: Point[], b: Point[]): number {
  if (a.length === 0 || b.length === 0) return Infinity
  if (convexPolygonsIntersect(a, b)) return 0
  let min = Infinity
  for (const p of a) {
    for (let i = 0; i < b.length; i++) {
      min = Math.min(min, distanceToSegment(p, b[i], b[(i + 1) % b.length]))
    }
  }
  for (const p of b) {
    for (let i = 0; i < a.length; i++) {
      min = Math.min(min, distanceToSegment(p, a[i], a[(i + 1) % a.length]))
    }
  }
  return min
}
