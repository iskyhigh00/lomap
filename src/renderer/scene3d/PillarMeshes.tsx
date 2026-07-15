import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { PillarEntity } from '@engine/entities/types'
import { worldRotationToScene, worldToScene } from './coords'

/** Standard casino floor-to-ceiling pillar height — pillars don't carry
 * their own height field (they're structural, not walls), so a fixed value
 * is used for the 3D placeholder. */
const PILLAR_HEIGHT = 300

export function PillarMeshes({
  pillars,
  selectedIds,
  onSelect,
}: {
  pillars: PillarEntity[]
  selectedIds: Set<string>
  onSelect: (id: string) => void
}) {
  const items = useMemo(
    () =>
      pillars.map((pillar) => ({
        pillar,
        position: worldToScene(pillar.transform, PILLAR_HEIGHT / 2),
        rotationY: worldRotationToScene(pillar.transform.rotation),
        color: selectedIds.has(pillar.id) ? '#3d8bfd' : '#8b95a5',
      })),
    [pillars, selectedIds],
  )

  return (
    <>
      {items.map(({ pillar, position, rotationY, color }) => (
        <mesh
          key={pillar.id}
          position={position}
          rotation={[0, rotationY, 0]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            onSelect(pillar.id)
          }}
        >
          {pillar.shape === 'circular' ? (
            <cylinderGeometry args={[pillar.width / 2, pillar.width / 2, PILLAR_HEIGHT, 20]} />
          ) : (
            <boxGeometry args={[pillar.width, PILLAR_HEIGHT, pillar.depth]} />
          )}
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </>
  )
}
