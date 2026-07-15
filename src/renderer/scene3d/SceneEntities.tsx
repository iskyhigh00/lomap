import { useMemo } from 'react'
import type { DoorEntity, GenericEntity, IslandEntity, MachineEntity, PillarEntity, WallEntity, ZoneEntity } from '@engine/entities/types'
import { WallMeshes } from './WallMeshes'
import { PillarMeshes } from './PillarMeshes'
import { DoorMeshes } from './DoorMeshes'
import { ZoneMeshes } from './ZoneMeshes'
import { MachineInstances } from './MachineInstances'
import { IslandOutlines } from './IslandOutlines'

/**
 * The single dispatcher that reads the *same* `entities` list the 2D
 * renderer reads (see `Scene3D.tsx` — both are handed the identical array
 * from `useProjectStore`) and buckets it by type once per render, mirroring
 * `drawEntities.ts`'s switch. No entity is ever copied into a 3D-only shape;
 * each mesh component computes its geometry from the live entity fields
 * (`points`, `thickness`, `height`, `transform`, ...) every time, exactly
 * like the 2D renderer does.
 */
export function SceneEntities({
  entities,
  selectedIds,
  onSelect,
}: {
  entities: GenericEntity[]
  selectedIds: Set<string>
  onSelect: (id: string) => void
}) {
  const buckets = useMemo(() => {
    const walls: WallEntity[] = []
    const pillars: PillarEntity[] = []
    const doors: DoorEntity[] = []
    const zones: ZoneEntity[] = []
    const machines: MachineEntity[] = []
    const islands: IslandEntity[] = []
    const wallsById = new Map<string, WallEntity>()
    const machinesById = new Map<string, MachineEntity>()

    for (const entity of entities) {
      if (!entity.visible) continue
      switch (entity.type) {
        case 'wall':
          walls.push(entity as WallEntity)
          wallsById.set(entity.id, entity as WallEntity)
          break
        case 'pillar':
          pillars.push(entity as PillarEntity)
          break
        case 'door':
          doors.push(entity as DoorEntity)
          break
        case 'zone':
          zones.push(entity as ZoneEntity)
          break
        case 'machine':
          machines.push(entity as MachineEntity)
          machinesById.set(entity.id, entity as MachineEntity)
          break
        case 'island':
          islands.push(entity as IslandEntity)
          break
        default:
          break
      }
    }
    return { walls, pillars, doors, zones, machines, islands, wallsById, machinesById }
  }, [entities])

  return (
    <>
      <WallMeshes walls={buckets.walls} selectedIds={selectedIds} onSelect={onSelect} />
      <PillarMeshes pillars={buckets.pillars} selectedIds={selectedIds} onSelect={onSelect} />
      <DoorMeshes doors={buckets.doors} wallsById={buckets.wallsById} selectedIds={selectedIds} onSelect={onSelect} />
      <ZoneMeshes zones={buckets.zones} selectedIds={selectedIds} onSelect={onSelect} />
      <MachineInstances machines={buckets.machines} selectedIds={selectedIds} onSelect={onSelect} />
      <IslandOutlines islands={buckets.islands} machinesById={buckets.machinesById} selectedIds={selectedIds} />
    </>
  )
}
