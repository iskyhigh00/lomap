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

export function snapToStep(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

export function snapPointToGrid(point: Point, step: number): Point {
  return { x: snapToStep(point.x, step), y: snapToStep(point.y, step) }
}
