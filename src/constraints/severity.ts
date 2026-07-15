import type { Conflict, ConflictSeverity } from './types'

/** Worst severity affecting each entity across every conflict it appears in
 * ('error' outranks 'warning'). Pure post-processing of `Conflict[]` — the
 * renderer calls this once per frame and only does color lookups, never
 * geometry/validation math itself. */
export function severityByEntity(conflicts: Conflict[]): Map<string, ConflictSeverity> {
  const map = new Map<string, ConflictSeverity>()
  for (const conflict of conflicts) {
    for (const id of conflict.entityIds) {
      const existing = map.get(id)
      if (!existing || (existing === 'warning' && conflict.severity === 'error')) {
        map.set(id, conflict.severity)
      }
    }
  }
  return map
}
