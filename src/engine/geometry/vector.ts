import type { Point } from './types'

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(a: Point, factor: number): Point {
  return { x: a.x * factor, y: a.y * factor }
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function length(a: Point): number {
  return Math.hypot(a.x, a.y)
}

export function normalize(a: Point): Point {
  const len = length(a)
  if (len === 0) return { x: 0, y: 0 }
  return { x: a.x / len, y: a.y / len }
}

export function rotate(point: Point, angleRadians: number, origin: Point = { x: 0, y: 0 }): Point {
  const cos = Math.cos(angleRadians)
  const sin = Math.sin(angleRadians)
  const dx = point.x - origin.x
  const dy = point.y - origin.y
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  }
}

export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const lengthSquared = abx * abx + aby * aby
  if (lengthSquared === 0) return distance(point, a)
  let t = ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSquared
  t = Math.max(0, Math.min(1, t))
  const projection = { x: a.x + t * abx, y: a.y + t * aby }
  return distance(point, projection)
}

/** Shortest distance from `point` to any segment of the polyline `points`.
 * Pass `closed: true` to also test the segment that wraps from the last
 * point back to the first (used for closed shapes like a Zone/Perimeter). */
export function distanceToPolyline(point: Point, points: Point[], closed = false): number {
  if (points.length === 0) return Infinity
  if (points.length === 1) return distance(point, points[0])
  let min = Infinity
  const segmentCount = closed ? points.length : points.length - 1
  for (let i = 0; i < segmentCount; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    min = Math.min(min, distanceToSegment(point, a, b))
  }
  return min
}

/** Total length of the polyline (sum of segment lengths). */
export function polylineLength(points: Point[], closed = false): number {
  if (points.length < 2) return 0
  let total = 0
  const segmentCount = closed ? points.length : points.length - 1
  for (let i = 0; i < segmentCount; i++) {
    total += distance(points[i], points[(i + 1) % points.length])
  }
  return total
}

export interface PolylinePosition {
  point: Point
  /** Direction of travel along the polyline at this position, in radians. */
  angle: number
}

/** Point + tangent angle at `dist` world units along an open polyline,
 * measured from `points[0]`. Clamped to the polyline's ends. Used to place
 * wall-anchored entities (doors) at a parametric offset along a wall. */
export function pointAtDistance(points: Point[], dist: number): PolylinePosition {
  if (points.length === 0) return { point: { x: 0, y: 0 }, angle: 0 }
  if (points.length === 1) return { point: points[0], angle: 0 }
  const clamped = Math.max(0, Math.min(dist, polylineLength(points)))
  let remaining = clamped
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const segLength = distance(a, b)
    if (remaining <= segLength || i === points.length - 2) {
      const t = segLength === 0 ? 0 : Math.max(0, Math.min(1, remaining / segLength))
      return {
        point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        angle: angleBetween(a, b),
      }
    }
    remaining -= segLength
  }
  const last = points[points.length - 1]
  return { point: last, angle: angleBetween(points[points.length - 2], last) }
}

/** Inverse of `pointAtDistance`: distance along the polyline (from `points[0]`)
 * of the closest point to `world`. Used to place/drag wall-anchored entities
 * by projecting a cursor position back onto the host wall. */
export function distanceAlongPolyline(points: Point[], world: Point): number {
  if (points.length < 2) return 0
  let best = Infinity
  let bestDist = 0
  let travelled = 0
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const segLength = distance(a, b)
    const d = distanceToSegment(world, a, b)
    if (d < best) {
      best = d
      const abx = b.x - a.x
      const aby = b.y - a.y
      const lengthSquared = abx * abx + aby * aby
      let t = lengthSquared === 0 ? 0 : ((world.x - a.x) * abx + (world.y - a.y) * aby) / lengthSquared
      t = Math.max(0, Math.min(1, t))
      bestDist = travelled + t * segLength
    }
    travelled += segLength
  }
  return bestDist
}

/** The portion of an open polyline between two distances-along (`start` <
 * `end`, both clamped to the polyline's length), as its own point list —
 * original interior vertices are kept, and the two cut ends are interpolated.
 * Used to split a wall's stroke around door openings without ever storing a
 * second copy of the wall's geometry. */
export function slicePolyline(points: Point[], start: number, end: number): Point[] {
  const total = polylineLength(points)
  const from = Math.max(0, Math.min(start, total))
  const to = Math.max(from, Math.min(end, total))
  if (to - from < 1e-6) return []

  const result: Point[] = [pointAtDistance(points, from).point]
  let travelled = 0
  for (let i = 0; i < points.length - 1; i++) {
    travelled += distance(points[i], points[i + 1])
    if (travelled > from && travelled < to) result.push(points[i + 1])
  }
  result.push(pointAtDistance(points, to).point)
  return result
}

export function snapToStep(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

export function snapPointToGrid(point: Point, step: number): Point {
  return { x: snapToStep(point.x, step), y: snapToStep(point.y, step) }
}
