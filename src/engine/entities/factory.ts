import { IDENTITY_TRANSFORM, type Point } from '@engine/geometry/types'
import type {
  IslandEntity,
  MachineEntity,
  PerimeterEntity,
  PillarEntity,
  WallEntity,
  ZoneEntity,
} from './types'

let counter = 0

export function generateId(prefix: string): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`
}

const DEFAULT_LAYER_ID = 'layer_default'

function stamp() {
  return { createdAt: Date.now(), updatedAt: Date.now() }
}

export function createWall(points: Point[], overrides: Partial<WallEntity> = {}, layerId = DEFAULT_LAYER_ID): WallEntity {
  return {
    id: generateId('wall'),
    type: 'wall',
    name: overrides.name ?? 'Muro',
    layerId,
    locked: false,
    visible: true,
    transform: { ...IDENTITY_TRANSFORM },
    points,
    thickness: overrides.thickness ?? 20,
    height: overrides.height ?? 270,
    wallType: overrides.wallType ?? 'partition',
    material: overrides.material ?? 'Panel de yeso',
    ...stamp(),
  }
}

export function createPillar(position: Point, width = 40, depth = 40, layerId = DEFAULT_LAYER_ID): PillarEntity {
  return {
    id: generateId('pillar'),
    type: 'pillar',
    name: 'Pilar',
    layerId,
    locked: false,
    visible: true,
    transform: { ...IDENTITY_TRANSFORM, x: position.x, y: position.y },
    width,
    depth,
    ...stamp(),
  }
}

export function createZone(points: Point[], restricted = false, layerId = DEFAULT_LAYER_ID): ZoneEntity {
  return {
    id: generateId('zone'),
    type: 'zone',
    name: restricted ? 'Zona restringida' : 'Zona',
    layerId,
    locked: false,
    visible: true,
    transform: { ...IDENTITY_TRANSFORM },
    points,
    restricted,
    color: restricted ? '#e5484d' : '#3d8bfd',
    ...stamp(),
  }
}

export function createPerimeter(points: Point[], layerId = DEFAULT_LAYER_ID): PerimeterEntity {
  return {
    id: generateId('perimeter'),
    type: 'perimeter',
    name: 'Perímetro',
    layerId,
    locked: false,
    visible: true,
    transform: { ...IDENTITY_TRANSFORM },
    points,
    ...stamp(),
  }
}

export function createMachine(
  position: Point,
  overrides: Partial<MachineEntity> = {},
  layerId = DEFAULT_LAYER_ID,
): MachineEntity {
  return {
    id: generateId('machine'),
    type: 'machine',
    name: overrides.name ?? 'Máquina',
    layerId,
    locked: false,
    visible: true,
    transform: { ...IDENTITY_TRANSFORM, x: position.x, y: position.y },
    machineId: overrides.machineId ?? generateId('mid'),
    manufacturer: overrides.manufacturer ?? '',
    model: overrides.model ?? '',
    width: overrides.width ?? 60,
    depth: overrides.depth ?? 70,
    height: overrides.height ?? 150,
    powerConsumption: overrides.powerConsumption ?? 0,
    color: overrides.color ?? '#3a4553',
    category: overrides.category ?? 'slot',
    status: overrides.status ?? 'active',
    islandId: overrides.islandId ?? null,
    ...stamp(),
  }
}

export function createIsland(
  position: Point,
  machineIds: string[] = [],
  layerId = DEFAULT_LAYER_ID,
): IslandEntity {
  return {
    id: generateId('island'),
    type: 'island',
    name: 'Isla',
    layerId,
    locked: false,
    visible: true,
    transform: { ...IDENTITY_TRANSFORM, x: position.x, y: position.y },
    machineIds,
    spacing: 10,
    shape: 'linear',
    groupLocked: false,
    ...stamp(),
  }
}
