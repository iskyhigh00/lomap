import type { GenericEntity } from '@engine/entities/types'

export type ConflictSeverity = 'error' | 'warning'

/** One concrete rule violation, produced by a `ConstraintRule`. `entityIds`
 * lists every entity involved (usually 2, for a pairwise rule) so the UI can
 * highlight all of them and the inspector can navigate to any of them. */
export interface Conflict {
  id: string
  ruleId: string
  severity: ConflictSeverity
  message: string
  entityIds: string[]
}

export interface ConstraintSettings {
  /** Minimum clear gap, in world units (cm), required between two machine
   * groups (islands or standalone machines) for circulation. */
  minCorridorWidth: number
  /** Minimum clear gap, in world units (cm), required between a machine
   * group and any wall. */
  minWallDistance: number
  /** Minimum clear gap, in world units (cm), required between a machine
   * group and any pillar. */
  minPillarDistance: number
}

export const DEFAULT_CONSTRAINT_SETTINGS: ConstraintSettings = {
  minCorridorWidth: 90,
  minWallDistance: 10,
  minPillarDistance: 10,
}

export interface ConstraintContext {
  entities: GenericEntity[]
  entityMap: Record<string, GenericEntity>
  settings: ConstraintSettings
}

/**
 * A single, self-contained validation rule. Rules never mutate anything —
 * they read the project model (`ConstraintContext`) and return the
 * `Conflict[]` they find. This is the seam the optimizer/AI (Fase 6+) reuse:
 * running the exact same rules against a candidate layout before committing
 * it is just calling `evaluate` again, no UI or renderer involved.
 */
export interface ConstraintRule {
  id: string
  evaluate(context: ConstraintContext): Conflict[]
}
