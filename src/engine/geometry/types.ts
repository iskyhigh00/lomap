/** A value in world space unless a function signature says otherwise — see
 * the Project Coordinate System contract: `engine/coords/projectCoordinateSystem.ts`. */
export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** A world-space placement — see `engine/coords/projectCoordinateSystem.ts`. */
export interface Transform {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
}

export const IDENTITY_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
}
