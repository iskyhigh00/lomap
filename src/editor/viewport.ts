import type { Point } from '@engine/geometry/types'
import type { Viewport } from '@store/projectStore'

/** The canonical world ↔ screen (CSS pixel) leg of the Project Coordinate
 * System — see `engine/coords/projectCoordinateSystem.ts`. */
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

/** Zoom-to-fit: frames a world-space bounding box inside the given canvas
 * size with a fixed screen-pixel padding, mirroring the 3D view's
 * "Encuadre" behavior for the 2D canvas. */
export function zoomToFit(
  box: { minX: number; minY: number; maxX: number; maxY: number },
  size: { width: number; height: number },
  padding = 48,
): Viewport {
  const boxWidth = Math.max(box.maxX - box.minX, 1)
  const boxHeight = Math.max(box.maxY - box.minY, 1)
  const availableWidth = Math.max(size.width - padding * 2, 1)
  const availableHeight = Math.max(size.height - padding * 2, 1)
  const zoom = clamp(Math.min(availableWidth / boxWidth, availableHeight / boxHeight), MIN_ZOOM, MAX_ZOOM)
  const center = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 }
  return {
    zoom,
    x: size.width / 2 - center.x * zoom,
    y: size.height / 2 - center.y * zoom,
  }
}
