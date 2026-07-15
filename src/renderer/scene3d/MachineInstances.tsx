import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { MachineEntity } from '@engine/entities/types'
import { worldRotationToScene, worldToScene } from './coords'

/**
 * All machines share one unit-box geometry + one material, scaled per
 * instance — a single draw call for the entity type that dominates the
 * count ("miles de máquinas"), instead of one mesh (and one material/shader
 * bind) per machine. This is also exactly the seam a future GLTF swap uses:
 * replace the `<boxGeometry>` child with a loaded model's geometry and
 * everything else (the per-instance loop, selection, click handling) stays
 * unchanged.
 */
export function MachineInstances({
  machines,
  selectedIds,
  onSelect,
}: {
  machines: MachineEntity[]
  selectedIds: Set<string>
  onSelect: (id: string) => void
}) {
  const items = useMemo(
    () =>
      machines.map((machine) => ({
        machine,
        position: worldToScene(machine.transform, machine.height / 2),
        rotationY: worldRotationToScene(machine.transform.rotation),
        scale: [machine.width, machine.height, machine.depth] as [number, number, number],
        color: selectedIds.has(machine.id) ? '#3d8bfd' : machine.color,
      })),
    [machines, selectedIds],
  )

  if (items.length === 0) return null

  return (
    <Instances limit={Math.max(items.length, 1)} range={items.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
      {items.map(({ machine, position, rotationY, scale, color }) => (
        <Instance
          key={machine.id}
          position={position}
          rotation={[0, rotationY, 0]}
          scale={scale}
          color={color}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            onSelect(machine.id)
          }}
        />
      ))}
    </Instances>
  )
}
