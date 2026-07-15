import { describe, expect, it } from 'vitest'
import { clampDoorOffset, doorSpan, resolveDoorPlacement } from './doorGeometry'
import { createDoor, createWall } from './factory'

describe('door geometry (derived from the host wall every time, never cached)', () => {
  it('resolves a door\'s center + angle from its wall + offset', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 200, y: 0 }])
    const door = createDoor(wall.id, 100, { width: 90 })
    const placement = resolveDoorPlacement(wall, door)
    expect(placement.center).toEqual({ x: 100, y: 0 })
    expect(placement.angle).toBe(0)
  })

  it('follows the wall for free when the wall is edited — offset stays valid without touching the door', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 200, y: 0 }])
    const door = createDoor(wall.id, 100, { width: 90 })
    const movedWall = { ...wall, points: wall.points.map((p) => ({ x: p.x + 50, y: p.y + 50 })) }
    expect(resolveDoorPlacement(movedWall, door).center).toEqual({ x: 150, y: 50 })
  })

  it('clamps a door offset so its opening never spills past the wall ends', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 200, y: 0 }])
    expect(clampDoorOffset(wall, 90, -50)).toBe(45)
    expect(clampDoorOffset(wall, 90, 500)).toBe(155)
    expect(clampDoorOffset(wall, 90, 100)).toBe(100)
  })

  it('centers a door on a wall shorter than the door width', () => {
    const wall = createWall([{ x: 0, y: 0 }, { x: 40, y: 0 }])
    expect(clampDoorOffset(wall, 90, 10)).toBe(20)
  })

  it('computes the opening span from offset and width', () => {
    const door = createDoor('wall_1', 100, { width: 90 })
    expect(doorSpan(door)).toEqual({ start: 55, end: 145 })
  })
})
