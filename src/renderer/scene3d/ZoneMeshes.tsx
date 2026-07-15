import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import type { ZoneEntity } from '@engine/entities/types'

const ZONE_HEIGHT = 1 // sits just above the floor/grid to avoid z-fighting

/** A zone's `points` are built straight into a `THREE.Shape` in world x/y —
 * rotating the resulting flat geometry +90° about X lands it exactly on
 * `worldToScene`'s mapping (`(x, 0, y)`) without needing a per-vertex
 * conversion loop. Semi-transparent, unlit (`meshBasicMaterial`, no
 * `meshStandardMaterial`/lighting cost) since a zone is a flat marker, not
 * a lit surface. */
export function ZoneMeshes({
  zones,
  selectedIds,
  onSelect,
}: {
  zones: ZoneEntity[]
  selectedIds: Set<string>
  onSelect: (id: string) => void
}) {
  const items = useMemo(
    () =>
      zones
        .map((zone) => {
          if (zone.points.length < 3) return null
          const shape = new THREE.Shape()
          shape.moveTo(zone.points[0].x, zone.points[0].y)
          for (const p of zone.points.slice(1)) shape.lineTo(p.x, p.y)
          shape.closePath()
          return { zone, shape }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [zones],
  )

  return (
    <>
      {items.map(({ zone, shape }) => (
        <mesh
          key={zone.id}
          position={[0, ZONE_HEIGHT, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation()
            onSelect(zone.id)
          }}
        >
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial
            color={selectedIds.has(zone.id) ? '#3d8bfd' : zone.color}
            transparent
            opacity={0.28}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}
