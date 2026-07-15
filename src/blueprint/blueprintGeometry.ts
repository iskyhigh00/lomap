import type { Point } from '@engine/geometry/types'
import { rotate } from '@engine/geometry/vector'
import type { BlueprintDocument } from './types'

/** World-space width/height of the rendered image (natural size × scale). */
export function imageWorldSize(doc: BlueprintDocument): { width: number; height: number } {
  return { width: doc.naturalWidth * doc.transform.scaleX, height: doc.naturalHeight * doc.transform.scaleY }
}

/**
 * Converts a world-space point into the image's own natural pixel space
 * (0..naturalWidth, 0..naturalHeight), inverting the same
 * translate→rotate→scale pipeline `renderBlueprint.ts` uses to draw it.
 * This is what lets calibration points and hit-testing stay valid no matter
 * how the image is later moved, rotated, or rescaled.
 */
export function worldToImageLocal(doc: BlueprintDocument, worldPoint: Point): Point {
  const { width, height } = imageWorldSize(doc)
  const center = { x: doc.transform.x + width / 2, y: doc.transform.y + height / 2 }
  const unrotated = rotate(worldPoint, -doc.transform.rotation, center)
  const localDraw = { x: unrotated.x - center.x, y: unrotated.y - center.y }
  return {
    x: (localDraw.x + width / 2) / doc.transform.scaleX,
    y: (localDraw.y + height / 2) / doc.transform.scaleY,
  }
}

/** Inverse of `worldToImageLocal` — natural pixel space back to world space,
 * using the image's *current* transform (so a calibration recorded before a
 * later move/rotate still resolves to the right place today). */
export function imageLocalToWorld(doc: BlueprintDocument, localPoint: Point): Point {
  const { width, height } = imageWorldSize(doc)
  const center = { x: doc.transform.x + width / 2, y: doc.transform.y + height / 2 }
  const localDraw = { x: localPoint.x * doc.transform.scaleX - width / 2, y: localPoint.y * doc.transform.scaleY - height / 2 }
  const rotated = rotate({ x: center.x + localDraw.x, y: center.y + localDraw.y }, doc.transform.rotation, center)
  return rotated
}

export function isPointOnBlueprint(doc: BlueprintDocument, worldPoint: Point): boolean {
  const local = worldToImageLocal(doc, worldPoint)
  return local.x >= 0 && local.x <= doc.naturalWidth && local.y >= 0 && local.y <= doc.naturalHeight
}
