import type { Viewport } from '@store/projectStore'

/**
 * The one place that composes "world → device pixel" for Canvas2D drawing.
 *
 * `Viewport` (zoom/x/y) already maps world units to CSS-pixel screen space
 * (see `editor/viewport.ts`, the world↔screen leg of the Project Coordinate
 * System — `src/engine/coords/projectCoordinateSystem.ts`). `dpr` is a
 * second, unrelated scale factor: it maps CSS pixels to the canvas's actual
 * backing-store resolution so drawing stays crisp on HiDPI displays. Every
 * draw routine needs the *product* of both, and previously each one
 * (drawEntities, drawBlueprints, and the Canvas2D overlay code) recomposed
 * that product by hand — three copies of the same formula that could drift
 * out of sync. This is the single implementation; nothing else should call
 * `ctx.setTransform` with a viewport/dpr composition directly.
 */
export interface CanvasMatrix {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export function computeWorldToCanvasMatrix(viewport: Viewport, dpr: number): CanvasMatrix {
  return {
    a: viewport.zoom * dpr,
    b: 0,
    c: 0,
    d: viewport.zoom * dpr,
    e: viewport.x * dpr,
    f: viewport.y * dpr,
  }
}

/** Sets `ctx`'s current transform to world space at the given viewport/dpr.
 * `setTransform` is absolute (it does not compose with whatever was active
 * before), so this must be called fresh by anything that wants to draw in
 * world coordinates rather than assuming the ambient transform is already
 * correct. */
export function applyWorldTransform(ctx: CanvasRenderingContext2D, viewport: Viewport, dpr: number): void {
  const m = computeWorldToCanvasMatrix(viewport, dpr)
  ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f)
}
