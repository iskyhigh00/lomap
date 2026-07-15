import type { Point } from '@engine/geometry/types'
import { angleBetween, distance, snapPointToGrid } from '@engine/geometry/vector'

export type SnapType = 'endpoint' | 'angle' | 'grid' | 'none'

export interface SnapResult {
  point: Point
  type: SnapType
}

export interface SnapContext {
  gridSize: number
  gridEnabled: boolean
  /** Existing vertices to snap onto — e.g. other walls' points, so new
   * geometry connects cleanly instead of leaving a visible gap. All values
   * are in world units. */
  candidatePoints: Point[]
  /** World-unit radius for endpoint snapping. Callers should scale this by
   * `1 / viewport.zoom` so the snap radius stays constant in screen pixels
   * regardless of zoom level. */
  endpointTolerance: number
  /** The previous point of the segment being drawn, if any — angle snap
   * measures direction from here. */
  angleOrigin?: Point
  /** Radians between snap angles. Defaults to 45°. */
  angleStepRad?: number
  /** How close (radians) the candidate angle must be to snap. Defaults to 4°. */
  angleToleranceRad?: number
}

const DEFAULT_ANGLE_STEP = Math.PI / 4
const DEFAULT_ANGLE_TOLERANCE = (Math.PI / 180) * 4

function normalizeAngleDelta(delta: number): number {
  let d = delta % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

/**
 * Resolves what `candidate` (a raw cursor position in world space) should
 * actually snap to, in priority order: an existing vertex (endpoint) beats a
 * common drawing angle (angle) beats the grid (grid) beats nothing (none).
 * Pure function — no store/canvas dependency, fully unit-testable, reusable
 * by any future drawing tool (pillars, zones, ...).
 */
export function resolveSnapPoint(candidate: Point, context: SnapContext): SnapResult {
  let nearestEndpoint: Point | null = null
  let nearestEndpointDist = Infinity
  for (const point of context.candidatePoints) {
    const d = distance(candidate, point)
    if (d < nearestEndpointDist) {
      nearestEndpointDist = d
      nearestEndpoint = point
    }
  }
  if (nearestEndpoint && nearestEndpointDist <= context.endpointTolerance) {
    return { point: nearestEndpoint, type: 'endpoint' }
  }

  if (context.angleOrigin) {
    const step = context.angleStepRad ?? DEFAULT_ANGLE_STEP
    const tolerance = context.angleToleranceRad ?? DEFAULT_ANGLE_TOLERANCE
    const angle = angleBetween(context.angleOrigin, candidate)
    const nearestStep = Math.round(angle / step) * step
    if (Math.abs(normalizeAngleDelta(angle - nearestStep)) <= tolerance) {
      const dist = distance(context.angleOrigin, candidate)
      const snapped: Point = {
        x: context.angleOrigin.x + Math.cos(nearestStep) * dist,
        y: context.angleOrigin.y + Math.sin(nearestStep) * dist,
      }
      return { point: context.gridEnabled ? snapPointToGrid(snapped, context.gridSize) : snapped, type: 'angle' }
    }
  }

  if (context.gridEnabled) {
    return { point: snapPointToGrid(candidate, context.gridSize), type: 'grid' }
  }

  return { point: candidate, type: 'none' }
}
