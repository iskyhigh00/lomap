import { describe, expect, it } from 'vitest'
import { diffLayouts } from './layoutDiff'
import { createMachine, createPillar } from '@engine/entities/factory'

describe('diffLayouts', () => {
  it('reports an entity present only in "after" as added', () => {
    const machine = createMachine({ x: 0, y: 0 })
    expect(diffLayouts([], [machine])).toEqual([{ entityId: machine.id, kind: 'added', name: machine.name }])
  })

  it('reports an entity present only in "before" as removed', () => {
    const machine = createMachine({ x: 0, y: 0 })
    expect(diffLayouts([machine], [])).toEqual([{ entityId: machine.id, kind: 'removed', name: machine.name }])
  })

  it('reports a position change as moved', () => {
    const before = createMachine({ x: 0, y: 0 })
    const after = { ...before, transform: { ...before.transform, x: 100 } }
    const diff = diffLayouts([before], [after])
    expect(diff).toEqual([{ entityId: before.id, kind: 'moved', name: before.name }])
  })

  it('reports a non-geometry field change as modified', () => {
    const before = createPillar({ x: 0, y: 0 })
    const after = { ...before, material: 'Acero' }
    const diff = diffLayouts([before], [after])
    expect(diff).toEqual([{ entityId: before.id, kind: 'modified', name: before.name }])
  })

  it('reports nothing for an unchanged entity', () => {
    const machine = createMachine({ x: 0, y: 0 })
    expect(diffLayouts([machine], [{ ...machine }])).toEqual([])
  })

  it('ignores createdAt/updatedAt-only differences', () => {
    const before = createMachine({ x: 0, y: 0 })
    const after = { ...before, updatedAt: before.updatedAt + 1000 }
    expect(diffLayouts([before], [after])).toEqual([])
  })
})
