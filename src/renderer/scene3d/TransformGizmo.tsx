import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { TransformControls } from '@react-three/drei'
import { useProjectStore } from '@store/projectStore'
import { useCommand } from '@hooks/useCommand'
import {
  createDuplicateEntitiesCommand,
  createMoveEntitiesCommand,
  createRotateGroupCommand,
  createUpdateEntityCommand,
} from '@commands/entityCommands'
import { offsetEntityGeometry, rotateEntityGeometry } from '@engine/entities/geometryTransform'
import { entityBoundingBox } from '@editor/hitTest'
import type { GenericEntity, MachineEntity, PillarEntity } from '@engine/entities/types'
import { worldRotationToScene, worldToScene } from './coords'

export type GizmoMode = 'translate' | 'rotate' | 'scale'

/** Entity types the viewport gizmo can act on. Doors are wall-anchored (their
 * `offset` is parametric, not a world position — see `geometryTransform.ts`)
 * and islands aren't individually clickable in the 3D view (only their
 * member machines are), so both are left out rather than half-supported. */
const GIZMO_TYPES = new Set(['wall', 'pillar', 'zone', 'machine'])
/** Only these carry simple width/depth fields a footprint-scale drag can
 * write straight back to — same fields the properties panel already edits
 * as plain numbers, so "Escalar" is a faster path to an existing control,
 * not a new resize model. */
const SCALABLE_TYPES = new Set(['machine', 'pillar'])

export function gizmoEligible(entity: GenericEntity | undefined, mode: GizmoMode): entity is GenericEntity {
  if (!entity || !GIZMO_TYPES.has(entity.type)) return false
  if (mode === 'scale') return SCALABLE_TYPES.has(entity.type)
  return true
}

function gizmoHeight(entity: GenericEntity): number {
  switch (entity.type) {
    case 'machine':
      return (entity as MachineEntity).height / 2
    case 'wall':
      return 60
    case 'pillar':
      return 150
    default:
      return 4
  }
}

interface DragState {
  activeId: string
  startEntity: GenericEntity
  startCenter: { x: number; y: number }
  startRotation: number
}

/**
 * The viewport's move/rotate/scale gizmo (drei `TransformControls`). Rather
 * than attaching directly to a wall segment / instanced machine / etc — each
 * rendered differently, some (machine `Instance`s) not even a real
 * `Object3D` — it drives one invisible proxy mesh and translates the proxy's
 * delta back into the same entity-geometry helpers Canvas2D's own drags use
 * (`offsetEntityGeometry`, `rotateEntityGeometry`), so the visible mesh
 * (rendered from live store state by `SceneEntities`) just follows along.
 * Same "live preview via `_updateEntity`, then revert + commit through a
 * `Command`" pattern as the 2D canvas, so one drag is one undo step.
 */
export function TransformGizmo({ mode }: { mode: GizmoMode }) {
  const selectedIds = useProjectStore((s) => s.selectedIds)
  const entities = useProjectStore((s) => s.entities)
  const { execute } = useCommand()
  const proxyRef = useRef<THREE.Mesh>(null!)
  const altRef = useRef(false)
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altRef.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const entity = selectedIds.length === 1 ? entities[selectedIds[0]] : undefined
  const eligible = gizmoEligible(entity, mode)

  // Re-sync the proxy from live store state whenever the selection/entity
  // changes and no drag owns it — keeps the gizmo glued to the object after
  // an undo, a properties-panel edit, or switching selection.
  useEffect(() => {
    if (!eligible || !entity || !proxyRef.current || dragRef.current) return
    const box = entityBoundingBox(entity, entities)
    const center = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 }
    const [x, y, z] = worldToScene(center, gizmoHeight(entity))
    proxyRef.current.position.set(x, y, z)
    proxyRef.current.rotation.set(0, worldRotationToScene(entity.transform.rotation), 0)
    proxyRef.current.scale.set(1, 1, 1)
  }, [eligible, entity, entities])

  if (!eligible || !entity) return null

  const handleMouseDown = () => {
    let activeEntity = entity
    if (altRef.current) {
      execute(createDuplicateEntitiesCommand([entity.id]))
      const newId = useProjectStore.getState().selectedIds[0]
      const cloned = newId ? useProjectStore.getState().entities[newId] : undefined
      if (cloned) activeEntity = cloned
    }
    const box = entityBoundingBox(activeEntity, useProjectStore.getState().entities)
    const startCenter = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 }
    dragRef.current = {
      activeId: activeEntity.id,
      startEntity: activeEntity,
      startCenter,
      startRotation: activeEntity.transform.rotation,
    }
  }

  const handleObjectChange = () => {
    const drag = dragRef.current
    if (!drag || !proxyRef.current) return
    const state = useProjectStore.getState()
    if (mode === 'translate') {
      const dx = proxyRef.current.position.x - drag.startCenter.x
      const dy = proxyRef.current.position.z - drag.startCenter.y
      state._updateEntity(drag.activeId, offsetEntityGeometry(drag.startEntity, dx, dy))
    } else if (mode === 'rotate') {
      const worldRotation = -proxyRef.current.rotation.y
      const deltaRadians = worldRotation - drag.startRotation
      state._updateEntity(drag.activeId, rotateEntityGeometry(drag.startEntity, deltaRadians, drag.startCenter))
    } else {
      const original = drag.startEntity as MachineEntity | PillarEntity
      state._updateEntity(drag.activeId, {
        width: Math.max(5, Math.round(original.width * proxyRef.current.scale.x)),
        depth: Math.max(5, Math.round(original.depth * proxyRef.current.scale.z)),
      })
    }
  }

  const handleMouseUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || !proxyRef.current) return
    const state = useProjectStore.getState()

    if (mode === 'translate') {
      const dx = proxyRef.current.position.x - drag.startCenter.x
      const dy = proxyRef.current.position.z - drag.startCenter.y
      state._updateEntity(drag.activeId, drag.startEntity)
      if (dx !== 0 || dy !== 0) execute(createMoveEntitiesCommand([{ id: drag.activeId, dx, dy }], 'Mover objeto'))
    } else if (mode === 'rotate') {
      const deltaRadians = -proxyRef.current.rotation.y - drag.startRotation
      state._updateEntity(drag.activeId, drag.startEntity)
      if (deltaRadians !== 0) execute(createRotateGroupCommand([drag.activeId], drag.startCenter, deltaRadians, 'Rotar objeto'))
    } else {
      const original = drag.startEntity as MachineEntity | PillarEntity
      const width = Math.max(5, Math.round(original.width * proxyRef.current.scale.x))
      const depth = Math.max(5, Math.round(original.depth * proxyRef.current.scale.z))
      state._updateEntity(drag.activeId, drag.startEntity)
      if (width !== original.width || depth !== original.depth) {
        execute(createUpdateEntityCommand(drag.activeId, { width, depth } as Partial<GenericEntity>, 'Escalar objeto'))
      }
    }
  }

  return (
    <>
      <mesh ref={proxyRef} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <TransformControls
        object={proxyRef}
        mode={mode}
        showX={mode !== 'rotate'}
        showY={mode === 'rotate'}
        showZ={mode !== 'rotate'}
        onMouseDown={handleMouseDown}
        onObjectChange={handleObjectChange}
        onMouseUp={handleMouseUp}
      />
    </>
  )
}
