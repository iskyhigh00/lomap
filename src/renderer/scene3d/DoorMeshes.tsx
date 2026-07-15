import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { DoorEntity, WallEntity } from '@engine/entities/types'
import { resolveDoorPlacement } from '@engine/entities/doorGeometry'
import { worldRotationToScene, worldToScene } from './coords'

/** Standard door leaf height — like pillars, doors don't carry their own
 * height field yet, so a fixed value stands in. */
const DOOR_HEIGHT = 210

/** A basic placeholder box filling the opening — no swing/leaf geometry
 * (that's 2D-plan detail, see `drawEntities.ts`'s `drawDoor`); "puertas
 * básicas" for the 3D view just needs the opening to read clearly as a
 * door, not a gap in the wall. */
export function DoorMeshes({
  doors,
  wallsById,
  selectedIds,
  onSelect,
}: {
  doors: DoorEntity[]
  wallsById: Map<string, WallEntity>
  selectedIds: Set<string>
  onSelect: (id: string) => void
}) {
  const items = useMemo(
    () =>
      doors
        .map((door) => {
          const wall = wallsById.get(door.wallId)
          if (!wall) return null
          const { center, angle } = resolveDoorPlacement(wall, door)
          return {
            door,
            wall,
            position: worldToScene(center, DOOR_HEIGHT / 2),
            rotationY: worldRotationToScene(angle),
            color: selectedIds.has(door.id) ? '#3d8bfd' : '#d8dee9',
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [doors, wallsById, selectedIds],
  )

  return (
    <>
      {items.map(({ door, wall, position, rotationY, color }) => (
        <mesh
          key={door.id}
          position={position}
          rotation={[0, rotationY, 0]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            onSelect(door.id)
          }}
        >
          <boxGeometry args={[door.width * 0.92, DOOR_HEIGHT, Math.max(wall.thickness * 0.6, 3)]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </>
  )
}
