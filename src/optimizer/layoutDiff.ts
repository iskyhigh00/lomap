import type { GenericEntity } from '@engine/entities/types'

export type LayoutDiffKind = 'added' | 'removed' | 'moved' | 'modified'

export interface LayoutDiffEntry {
  entityId: string
  kind: LayoutDiffKind
  name: string
}

function geometrySignature(entity: GenericEntity): string {
  const points = (entity as { points?: unknown }).points
  return points !== undefined ? JSON.stringify(points) : JSON.stringify(entity.transform)
}

function fullSignature(entity: GenericEntity): string {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = entity
  return JSON.stringify(rest)
}

/**
 * Compares two entity sets by id and reports what changed — the "comparar
 * dos layouts" tool (Fase 7). Pure set-diff + JSON-signature comparison over
 * the exact same `GenericEntity` shape every other module already reads;
 * nothing here recomputes geometry (that's `constraints/footprint.ts`'s job,
 * reused unchanged wherever "what does this entity look like" matters).
 */
export function diffLayouts(before: GenericEntity[], after: GenericEntity[]): LayoutDiffEntry[] {
  const beforeById = new Map(before.map((e) => [e.id, e]))
  const afterById = new Map(after.map((e) => [e.id, e]))
  const entries: LayoutDiffEntry[] = []

  for (const [id, entity] of afterById) {
    const prev = beforeById.get(id)
    if (!prev) {
      entries.push({ entityId: id, kind: 'added', name: entity.name })
      continue
    }
    if (fullSignature(prev) === fullSignature(entity)) continue
    const kind: LayoutDiffKind = geometrySignature(prev) !== geometrySignature(entity) ? 'moved' : 'modified'
    entries.push({ entityId: id, kind, name: entity.name })
  }

  for (const [id, entity] of beforeById) {
    if (!afterById.has(id)) entries.push({ entityId: id, kind: 'removed', name: entity.name })
  }

  return entries
}
