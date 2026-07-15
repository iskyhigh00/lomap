import { useMemo } from 'react'
import type { GenericEntity } from '@engine/entities/types'
import { entityBoundingBox, type Box } from '@editor/hitTest'

/** World-space bounding box of every entity in the scene, reusing the exact
 * same `entityBoundingBox` the 2D editor's box-select uses — no separate 3D
 * notion of "where things are". Used to auto-frame the 3D camera. */
export function useSceneBounds(entityList: GenericEntity[], entityMap: Record<string, GenericEntity>): Box | null {
  return useMemo(() => {
    if (entityList.length === 0) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const entity of entityList) {
      const box = entityBoundingBox(entity, entityMap)
      minX = Math.min(minX, box.minX)
      minY = Math.min(minY, box.minY)
      maxX = Math.max(maxX, box.maxX)
      maxY = Math.max(maxY, box.maxY)
    }
    return { minX, minY, maxX, maxY }
  }, [entityList, entityMap])
}
