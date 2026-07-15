import { beforeEach, describe, expect, it } from 'vitest'
import { useProjectStore } from '@store/projectStore'
import { createDistributeCommand, createSmartRotateCommand, createUniformSpacingCommand } from './layoutCommands'
import { createIsland, createWall } from '@engine/entities/factory'

describe('layout commands', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject()
  })

  it('distributes 3 islands evenly and undoes cleanly', () => {
    const a = createIsland({ x: 0, y: 0 })
    const b = createIsland({ x: 60, y: 0 }) // too close to a
    const c = createIsland({ x: 500, y: 0 })
    for (const island of [a, b, c]) useProjectStore.getState()._addEntity(island)

    const command = createDistributeCommand([a.id, b.id, c.id], 'x')
    expect(command).not.toBeNull()
    const bxBefore = useProjectStore.getState().entities[b.id].transform.x
    command!.do()
    expect(useProjectStore.getState().entities[b.id].transform.x).not.toBe(bxBefore)
    expect(useProjectStore.getState().entities[a.id].transform.x).toBe(0)
    expect(useProjectStore.getState().entities[c.id].transform.x).toBe(500)

    command!.undo()
    expect(useProjectStore.getState().entities[b.id].transform.x).toBe(bxBefore)
  })

  it('returns null when fewer than 3 items are selected for distribute', () => {
    const a = createIsland({ x: 0, y: 0 })
    const b = createIsland({ x: 100, y: 0 })
    useProjectStore.getState()._addEntity(a)
    useProjectStore.getState()._addEntity(b)
    expect(createDistributeCommand([a.id, b.id], 'x')).toBeNull()
  })

  it('sets uniform spacing between islands and undoes cleanly', () => {
    const a = createIsland({ x: 0, y: 0 })
    const b = createIsland({ x: 500, y: 0 })
    useProjectStore.getState()._addEntity(a)
    useProjectStore.getState()._addEntity(b)

    const command = createUniformSpacingCommand([a.id, b.id], 'x', 20)
    expect(command).not.toBeNull()
    command!.do()
    // islands have no points → their bbox is a single point (their own transform.x/y),
    // so a 20-unit gap means b.x becomes a.x + 20.
    expect(useProjectStore.getState().entities[b.id].transform.x).toBeCloseTo(20)
    command!.undo()
    expect(useProjectStore.getState().entities[b.id].transform.x).toBeCloseTo(500)
  })

  it('smart-rotates an island to align with the nearest wall and undoes cleanly', () => {
    const wall = createWall([{ x: 0, y: 100 }, { x: 300, y: 130 }]) // slightly angled wall
    const island = createIsland({ x: 100, y: 90 })
    island.transform.rotation = 0
    useProjectStore.getState()._addEntity(wall)
    useProjectStore.getState()._addEntity(island)

    const command = createSmartRotateCommand(island.id)
    expect(command).not.toBeNull()
    command!.do()
    const rotated = useProjectStore.getState().entities[island.id].transform.rotation
    expect(rotated).not.toBe(0)

    command!.undo()
    expect(useProjectStore.getState().entities[island.id].transform.rotation).toBe(0)
  })

  it('returns null for smart-rotate when there are no walls', () => {
    const island = createIsland({ x: 0, y: 0 })
    useProjectStore.getState()._addEntity(island)
    expect(createSmartRotateCommand(island.id)).toBeNull()
  })

  it('returns null for smart-rotate when the island is already aligned', () => {
    const wall = createWall([{ x: 0, y: 100 }, { x: 300, y: 100 }]) // horizontal, angle 0
    const island = createIsland({ x: 100, y: 90 })
    island.transform.rotation = 0
    useProjectStore.getState()._addEntity(wall)
    useProjectStore.getState()._addEntity(island)
    expect(createSmartRotateCommand(island.id)).toBeNull()
  })
})
