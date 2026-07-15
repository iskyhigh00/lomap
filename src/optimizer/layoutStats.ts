import type { GenericEntity, PerimeterEntity } from '@engine/entities/types'
import { entityFootprints } from '@constraints/footprint'
import { polygonArea } from '@engine/geometry/polygon'

export interface LayoutStats {
  machineCount: number
  islandCount: number
  /** Sum of every machine's footprint area — the actual floor space
   * equipment occupies, not islands' padded bounding boxes (which would
   * double-count the machines inside them). */
  occupiedAreaM2: number
  /** Sum of every drawn perimeter's polygon area. `null` when no perimeter
   * has been drawn yet, so the UI can show "—" instead of a misleading 0%. */
  totalAreaM2: number | null
  freeAreaM2: number | null
  /** Machines per m² of total (perimeter) area. */
  densityPerM2: number | null
  occupancyPercent: number | null
}

const CM2_PER_M2 = 10000

/**
 * Real-time layout statistics (Fase 7). Reuses the constraint engine's own
 * footprint math (`constraints/footprint.ts`'s `entityFootprints`) for
 * occupied area instead of recomputing machine geometry — the one and only
 * source of "what shape is this entity" stays `constraints/`, exactly as
 * the Fase 7 brief requires ("no dupliques cálculos").
 */
export function computeLayoutStats(entities: GenericEntity[], entityMap: Record<string, GenericEntity>): LayoutStats {
  let machineCount = 0
  let islandCount = 0
  let occupiedAreaCm2 = 0
  let totalAreaCm2 = 0
  let hasPerimeter = false

  for (const entity of entities) {
    if (!entity.visible) continue
    if (entity.type === 'machine') {
      machineCount += 1
      const [shape] = entityFootprints(entity, entityMap)
      if (shape) occupiedAreaCm2 += polygonArea(shape)
    } else if (entity.type === 'island') {
      islandCount += 1
    } else if (entity.type === 'perimeter') {
      const perimeter = entity as PerimeterEntity
      if (perimeter.points.length >= 3) {
        totalAreaCm2 += polygonArea(perimeter.points)
        hasPerimeter = true
      }
    }
  }

  const occupiedAreaM2 = occupiedAreaCm2 / CM2_PER_M2
  const totalAreaM2 = hasPerimeter ? totalAreaCm2 / CM2_PER_M2 : null
  const freeAreaM2 = totalAreaM2 !== null ? Math.max(0, totalAreaM2 - occupiedAreaM2) : null
  const densityPerM2 = totalAreaM2 && totalAreaM2 > 0 ? machineCount / totalAreaM2 : null
  const occupancyPercent = totalAreaM2 && totalAreaM2 > 0 ? (occupiedAreaM2 / totalAreaM2) * 100 : null

  return { machineCount, islandCount, occupiedAreaM2, totalAreaM2, freeAreaM2, densityPerM2, occupancyPercent }
}
