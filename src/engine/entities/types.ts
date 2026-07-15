import type { Point, Transform } from '@engine/geometry/types'

export type EntityType =
  | 'perimeter'
  | 'wall'
  | 'pillar'
  | 'zone'
  | 'machine'
  | 'island'
  | 'stage'
  | 'bar'
  | 'cashier'
  | 'reception'
  | 'restroom'
  | 'exit'
  | 'stairs'
  | 'decoration'
  | 'table'
  | 'chair'
  | 'door'
  | 'box'

export interface BaseEntity {
  id: string
  type: EntityType
  name: string
  layerId: string
  locked: boolean
  visible: boolean
  transform: Transform
  notes?: string
  createdAt: number
  updatedAt: number
}

export type WallType = 'partition' | 'load-bearing' | 'exterior' | 'glass' | 'temporary'

/**
 * A wall is a parametric architectural object, not a line: `points` is its
 * base polyline (a continuous chain of vertices), and every visible pixel —
 * the stroked outline, hit-test region, bounding box — is derived from
 * `points` + `thickness` at render/hit-test time. Nothing redundant is ever
 * cached (no stored outline polygon), so a future intersection/auto-join
 * solver can freely recompute geometry across walls without invalidating
 * anything. `transform` stays at `IDENTITY_TRANSFORM` and is never written
 * to — see `engine/entities/geometryTransform.ts`.
 */
export interface WallEntity extends BaseEntity {
  type: 'wall'
  points: Point[]
  thickness: number
  height: number
  wallType: WallType
  material: string
}

export type PillarShape = 'rectangular' | 'circular'

export interface PillarEntity extends BaseEntity {
  type: 'pillar'
  shape: PillarShape
  width: number
  depth: number
  material: string
}

export type ZoneCategory = 'gaming' | 'vip' | 'circulation' | 'food-beverage' | 'service' | 'restricted' | 'other'

export interface ZoneEntity extends BaseEntity {
  type: 'zone'
  points: Point[]
  restricted: boolean
  color: string
  category: ZoneCategory
}

export interface PerimeterEntity extends BaseEntity {
  type: 'perimeter'
  points: Point[]
}

export type MachineStatus = 'active' | 'inactive' | 'maintenance' | 'reserved'
export type MachineCategory = 'slot' | 'table-game' | 'poker' | 'vip' | 'other'

export interface MachineEntity extends BaseEntity {
  type: 'machine'
  machineId: string
  manufacturer: string
  model: string
  width: number
  depth: number
  height: number
  powerConsumption: number
  color: string
  category: MachineCategory
  status: MachineStatus
  islandId: string | null
}

export interface IslandEntity extends BaseEntity {
  type: 'island'
  machineIds: string[]
  spacing: number
  shape: 'linear' | 'back-to-back' | 'cluster' | 'custom'
  groupLocked: boolean
}

export type DoorType = 'single' | 'double' | 'sliding' | 'opening'
export type DoorSwing = 'left' | 'right'

/**
 * A door is wall-anchored, not free-standing: its position is a parametric
 * `offset` (world units from the host wall's first vertex, measured along
 * the wall's polyline) rather than its own `transform`. Its screen position,
 * rotation, and the gap it cuts in the wall are all derived at render/hit-test
 * time from `wallId` + `offset` (see `engine/entities/doorGeometry.ts`) —
 * moving or reshaping the host wall moves every door on it for free, and
 * nothing about the door's placement is ever cached.
 */
export interface DoorEntity extends BaseEntity {
  type: 'door'
  wallId: string
  offset: number
  width: number
  doorType: DoorType
  swing: DoorSwing
  flip: boolean
}

export type GenericEntity =
  | WallEntity
  | PillarEntity
  | ZoneEntity
  | PerimeterEntity
  | MachineEntity
  | IslandEntity
  | DoorEntity
  | BaseEntity

export interface Layer {
  id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
  order: number
}
