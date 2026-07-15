import type { Point } from '@engine/geometry/types'

/**
 * The World ↔ 3D-scene leg of the Project Coordinate System — see
 * `engine/coords/projectCoordinateSystem.ts` §"World ↔ 3D scene" for the
 * contract this implements. Kept local to `renderer/scene3d/`, the same way
 * `blueprint/blueprintGeometry.ts` owns its own transform math: the 3D view
 * is the only thing that needs a Y-up/right-handed scene, so the mapping
 * lives with its one caller instead of leaking a 3D concept into `engine/`.
 *
 * No unit conversion: 1 world unit (1cm) stays 1 Three.js unit. The camera's
 * near/far planes and movement speeds are tuned for that scale instead —
 * see `CameraRig.tsx`.
 */

/** World-space point (+ optional height) → a Three.js `[x, y, z]` tuple. */
export function worldToScene(point: Point, height = 0): [number, number, number] {
  return [point.x, height, point.y]
}

/** World rotation (radians, clockwise-positive in Y-down world space) → the
 * Three.js rotation around the scene's Y (up) axis. */
export function worldRotationToScene(rotation: number): number {
  return -rotation
}
