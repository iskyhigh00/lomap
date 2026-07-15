import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { IslandEntity, MachineEntity } from '@engine/entities/types'

const PADDING = 10
const OUTLINE_HEIGHT = 2

/** Mirrors the 2D renderer's choice to only outline a *selected* island
 * (`drawEntities.ts`'s `drawIslandBounds`) — at thousands of islands,
 * outlining every one unconditionally would be wasted draw calls for no
 * information gain. */
export function IslandOutlines({
  islands,
  machinesById,
  selectedIds,
}: {
  islands: IslandEntity[]
  machinesById: Map<string, MachineEntity>
  selectedIds: Set<string>
}) {
  const outlines = useMemo(() => {
    return islands
      .filter((island) => selectedIds.has(island.id))
      .map((island) => {
        const machines = island.machineIds.map((id) => machinesById.get(id)).filter((m): m is MachineEntity => Boolean(m))
        if (machines.length === 0) return null
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const m of machines) {
          minX = Math.min(minX, m.transform.x - m.width / 2)
          minY = Math.min(minY, m.transform.y - m.depth / 2)
          maxX = Math.max(maxX, m.transform.x + m.width / 2)
          maxY = Math.max(maxY, m.transform.y + m.depth / 2)
        }
        const x0 = minX - PADDING
        const x1 = maxX + PADDING
        const z0 = minY - PADDING
        const z1 = maxY + PADDING
        const points: [number, number, number][] = [
          [x0, OUTLINE_HEIGHT, z0],
          [x1, OUTLINE_HEIGHT, z0],
          [x1, OUTLINE_HEIGHT, z1],
          [x0, OUTLINE_HEIGHT, z1],
          [x0, OUTLINE_HEIGHT, z0],
        ]
        return { id: island.id, points }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [islands, machinesById, selectedIds])

  return (
    <>
      {outlines.map((outline) => (
        <Line key={outline.id} points={outline.points} color="#3d8bfd" lineWidth={1.5} dashed dashSize={6} gapSize={4} />
      ))}
    </>
  )
}
