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

export interface WallEntity extends BaseEntity {
  type: 'wall'
  start: Point
  end: Point
  thickness: number
}

export interface PillarEntity extends BaseEntity {
  type: 'pillar'
  width: number
  depth: number
}

export interface ZoneEntity extends BaseEntity {
  type: 'zone'
  points: Point[]
  restricted: boolean
  color: string
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

export type GenericEntity =
  | WallEntity
  | PillarEntity
  | ZoneEntity
  | PerimeterEntity
  | MachineEntity
  | IslandEntity
  | BaseEntity

export interface Layer {
  id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
  order: number
}
