import { describe, expect, it } from 'vitest'
import { worldRotationToScene, worldToScene } from './coords'

describe('World ↔ 3D scene mapping', () => {
  it('maps world.x/y to scene.x/z, with height as scene.y', () => {
    expect(worldToScene({ x: 10, y: 20 })).toEqual([10, 0, 20])
    expect(worldToScene({ x: 10, y: 20 }, 270)).toEqual([10, 270, 20])
  })

  it('negates world rotation for the scene Y-axis rotation', () => {
    expect(worldRotationToScene(0)).toBe(-0)
    expect(worldRotationToScene(Math.PI / 2)).toBeCloseTo(-Math.PI / 2)
  })
})
