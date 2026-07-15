import type { Point, Transform } from '@engine/geometry/types'

/** Formats the blueprint subsystem can ingest. Raster formats are supported now;
 * DXF/DWG are reserved so the importer registry and document model don't need to
 * change shape when those adapters land. */
export type BlueprintSourceFormat = 'png' | 'jpg' | 'webp' | 'pdf' | 'dxf' | 'dwg'

export interface BlueprintCalibration {
  pointA: Point
  pointB: Point
  /** Real-world distance between pointA and pointB, in project units. */
  knownDistance: number
}

/**
 * A reference document (image/plan) used to trace over — never part of the
 * casino layout model. Lives entirely outside `engine/entities`: no entity id,
 * no layerId, not present in `entities`/`entityOrder`, never touched by
 * hit-testing, collisions, the optimizer, or model exports.
 */
export interface BlueprintDocument {
  id: string
  name: string
  sourceFormat: BlueprintSourceFormat
  naturalWidth: number
  naturalHeight: number
  /** x/y is the top-left corner in world units before rotation/scale; rotation
   * and scale are applied around the image center. */
  transform: Transform
  opacity: number
  /** -100..100, mapped to CSS filter brightness() at render time. */
  brightness: number
  /** -100..100, mapped to CSS filter contrast() at render time. */
  contrast: number
  locked: boolean
  visible: boolean
  calibration: BlueprintCalibration | null
  createdAt: number
  updatedAt: number
}
