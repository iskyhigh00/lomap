import { describe, expect, it } from 'vitest'
import { severityByEntity } from './severity'
import type { Conflict } from './types'

describe('severityByEntity', () => {
  it('maps each entity to the severity of the conflicts it appears in', () => {
    const conflicts: Conflict[] = [
      { id: '1', ruleId: 'corridor', severity: 'warning', message: '', entityIds: ['a', 'b'] },
    ]
    const map = severityByEntity(conflicts)
    expect(map.get('a')).toBe('warning')
    expect(map.get('b')).toBe('warning')
    expect(map.get('c')).toBeUndefined()
  })

  it('escalates to error when an entity has both a warning and an error', () => {
    const conflicts: Conflict[] = [
      { id: '1', ruleId: 'corridor', severity: 'warning', message: '', entityIds: ['a'] },
      { id: '2', ruleId: 'collision', severity: 'error', message: '', entityIds: ['a'] },
    ]
    expect(severityByEntity(conflicts).get('a')).toBe('error')
  })

  it('never downgrades error back to warning regardless of conflict order', () => {
    const conflicts: Conflict[] = [
      { id: '1', ruleId: 'collision', severity: 'error', message: '', entityIds: ['a'] },
      { id: '2', ruleId: 'corridor', severity: 'warning', message: '', entityIds: ['a'] },
    ]
    expect(severityByEntity(conflicts).get('a')).toBe('error')
  })
})
