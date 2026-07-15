import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { WallEntity } from '@engine/entities/types'
import { WALL_TYPE_COLOR } from '@renderer/canvas2d/drawEntities'
import { worldRotationToScene, worldToScene } from './coords'

interface Segment {
  key: string
  wallId: string
  position: [number, number, number]
  rotationY: number
  length: number
  thickness: number
  height: number
  color: string
  opacity: number
}

/** One box per wall *segment*, matching the 2D renderer's per-segment stroke
 * (`drawEntities.ts`'s `drawWall`) — a wall's visible geometry is derived
 * from `points` + `thickness` + `height` here too, nothing cached. Door
 * openings aren't cut out of the 3D extrusion yet (a "puertas básicas"
 * placeholder sits in the opening instead, see `DoorMeshes.tsx`) — full
 * boolean cutting is future work once the placeholder-swap architecture
 * lands real wall meshes. */
function wallSegments(walls: WallEntity[], selectedIds: Set<string>): Segment[] {
  const segments: Segment[] = []
  for (const wall of walls) {
    for (let i = 0; i < wall.points.length - 1; i++) {
      const a = wall.points[i]
      const b = wall.points[i + 1]
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      if (length === 0) continue
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      segments.push({
        key: `${wall.id}:${i}`,
        wallId: wall.id,
        position: worldToScene(mid, wall.height / 2),
        rotationY: worldRotationToScene(angle),
        length,
        thickness: wall.thickness,
        height: wall.height,
        color: selectedIds.has(wall.id) ? '#3d8bfd' : WALL_TYPE_COLOR[wall.wallType],
        opacity: wall.wallType === 'glass' ? 0.4 : 1,
      })
    }
  }
  return segments
}

export function WallMeshes({
  walls,
  selectedIds,
  onSelect,
}: {
  walls: WallEntity[]
  selectedIds: Set<string>
  onSelect: (id: string) => void
}) {
  const segments = useMemo(() => wallSegments(walls, selectedIds), [walls, selectedIds])

  return (
    <>
      {segments.map((segment) => (
        <mesh
          key={segment.key}
          position={segment.position}
          rotation={[0, segment.rotationY, 0]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            onSelect(segment.wallId)
          }}
        >
          <boxGeometry args={[segment.length, segment.height, segment.thickness]} />
          <meshStandardMaterial color={segment.color} transparent={segment.opacity < 1} opacity={segment.opacity} />
        </mesh>
      ))}
    </>
  )
}
