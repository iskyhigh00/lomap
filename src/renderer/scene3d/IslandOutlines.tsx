import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { IslandEntity, MachineEntity } from '@engine/entities/types'

const PADDING = 10
const OUTLINE_HEIGHT = 2
const PLATFORM_HEIGHT = 4

function islandFootprint(island: IslandEntity, machinesById: Map<string, MachineEntity>) {
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
  return { minX: minX - PADDING, minY: minY - PADDING, maxX: maxX + PADDING, maxY: maxY + PADDING }
}

/** Islands as simple 3D blocks: every island gets a low, always-visible
 * platform under its machines (a "bloque" reading, not just a flat group of
 * boxes floating on the grid) plus a dashed outline that only lights up
 * when selected — mirroring the 2D renderer's selected-only outline
 * (`drawEntities.ts`'s `drawIslandBounds`), which stays outline-only since
 * thousands of dashed loops would be wasted draw calls for no information
 * gain. The platform itself is cheap: one unlit box per island. */
export function IslandOutlines({
  islands,
  machinesById,
  selectedIds,
}: {
  islands: IslandEntity[]
  machinesById: Map<string, MachineEntity>
  selectedIds: Set<string>
}) {
  const platforms = useMemo(() => {
    return islands
      .map((island) => {
        const box = islandFootprint(island, machinesById)
        if (!box) return null
        return {
          id: island.id,
          width: box.maxX - box.minX,
          depth: box.maxY - box.minY,
          center: { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 },
          selected: selectedIds.has(island.id),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [islands, machinesById, selectedIds])

  const outlines = useMemo(() => {
    return islands
      .filter((island) => selectedIds.has(island.id))
      .map((island) => {
        const box = islandFootprint(island, machinesById)
        if (!box) return null
        const points: [number, number, number][] = [
          [box.minX, OUTLINE_HEIGHT, box.minY],
          [box.maxX, OUTLINE_HEIGHT, box.minY],
          [box.maxX, OUTLINE_HEIGHT, box.maxY],
          [box.minX, OUTLINE_HEIGHT, box.maxY],
          [box.minX, OUTLINE_HEIGHT, box.minY],
        ]
        return { id: island.id, points }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [islands, machinesById, selectedIds])

  return (
    <>
      {platforms.map((platform) => (
        <mesh key={platform.id} position={[platform.center.x, PLATFORM_HEIGHT / 2, platform.center.y]}>
          <boxGeometry args={[platform.width, PLATFORM_HEIGHT, platform.depth]} />
          <meshStandardMaterial color={platform.selected ? '#274363' : '#20262f'} roughness={0.9} />
        </mesh>
      ))}
      {outlines.map((outline) => (
        <Line key={outline.id} points={outline.points} color="#3d8bfd" lineWidth={1.5} dashed dashSize={6} gapSize={4} />
      ))}
    </>
  )
}
