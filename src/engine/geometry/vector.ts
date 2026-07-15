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

export function snapToStep(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

export function snapPointToGrid(point: Point, step: number): Point {
  return { x: snapToStep(point.x, step), y: snapToStep(point.y, step) }
}
