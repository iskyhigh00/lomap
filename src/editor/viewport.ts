import type { Point } from '@engine/geometry/types'
import type { Viewport } from '@store/projectStore'

export function screenToWorld(screen: Point, viewport: Viewport): Point {
  return {
    x: (screen.x - viewport.x) / viewport.zoom,
    y: (screen.y - viewport.y) / viewport.zoom,
  }
}

export function worldToScreen(world: Point, viewport: Viewport): Point {
  return {
    x: world.x * viewport.zoom + viewport.x,
    y: world.y * viewport.zoom + viewport.y,
  }
}

export const MIN_ZOOM = 0.02
export const MAX_ZOOM = 40

export function zoomAt(viewport: Viewport, screenPoint: Point, factor: number): Viewport {
  const nextZoom = clamp(viewport.zoom * factor, MIN_ZOOM, MAX_ZOOM)
  const worldPoint = screenToWorld(screenPoint, viewport)
  return {
    zoom: nextZoom,
    x: screenPoint.x - worldPoint.x * nextZoom,
    y: screenPoint.y - worldPoint.y * nextZoom,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
