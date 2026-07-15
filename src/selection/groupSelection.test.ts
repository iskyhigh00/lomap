import { describe, expect, it } from 'vitest'
import { expandGroupIds, resolveClickTarget } from './groupSelection'
import { createIsland, createMachine } from '@engine/entities/factory'
import type { GenericEntity } from '@engine/entities/types'

function buildIslandFixture(groupLocked: boolean) {
  const island = createIsland({ x: 0, y: 0 })
  const machineA = createMachine({ x: 0, y: 0 }, { islandId: island.id })
  const machineB = createMachine({ x: 10, y: 0 }, { islandId: island.id })
  island.machineIds = [machineA.id, machineB.id]
  island.groupLocked = groupLocked
  const entities: Record<string, GenericEntity> = {
    [island.id]: island,
    [machineA.id]: machineA,
    [machineB.id]: machineB,
  }
  return { island, machineA, machineB, entities }
}

describe('expandGroupIds', () => {
  it('expands an island id into itself and all its machines', () => {
    const { island, machineA, machineB, entities } = buildIslandFixture(false)
    const result = expandGroupIds(entities, [island.id])
    expect(new Set(result)).toEqual(new Set([island.id, machineA.id, machineB.id]))
  })

  it('does not pull in siblings for a single machine of an unlocked island', () => {
    const { machineA, entities } = buildIslandFixture(false)
    expect(expandGroupIds(entities, [machineA.id])).toEqual([machineA.id])
  })

  it('pulls in the whole island when the island is group-locked', () => {
    const { island, machineA, machineB, entities } = buildIslandFixture(true)
    const result = expandGroupIds(entities, [machineA.id])
    expect(new Set(result)).toEqual(new Set([island.id, machineA.id, machineB.id]))
  })

  it('deduplicates when multiple ids resolve to overlapping groups', () => {
    const { island, machineA, machineB, entities } = buildIslandFixture(true)
    const result = expandGroupIds(entities, [machineA.id, machineB.id])
    expect(new Set(result)).toEqual(new Set([island.id, machineA.id, machineB.id]))
  })
})

describe('resolveClickTarget', () => {
  it('redirects a click on a locked-island machine to the island', () => {
    const { island, machineA, entities } = buildIslandFixture(true)
    expect(resolveClickTarget(entities, machineA.id)).toBe(island.id)
  })

  it('keeps the machine as the target when its island is unlocked', () => {
    const { machineA, entities } = buildIslandFixture(false)
    expect(resolveClickTarget(entities, machineA.id)).toBe(machineA.id)
  })
})
