import type { Conflict, ConstraintContext, ConstraintRule, ConstraintSettings } from './types'
import type { GenericEntity } from '@engine/entities/types'
import { collisionRule } from './rules/collisionRule'
import { corridorRule } from './rules/corridorRule'
import { clearanceRule } from './rules/clearanceRule'

/** The rules run by default. Adding a new restriction later is just adding
 * another `ConstraintRule` object here (or, for the optimizer, passing a
 * different/extended list into `runConstraints` directly) — nothing else in
 * the app needs to change. */
export const DEFAULT_RULES: ConstraintRule[] = [collisionRule, corridorRule, clearanceRule]

/**
 * Runs every rule against the current project model and returns every
 * `Conflict` found. Pure function of its inputs — no store, no rendering, no
 * side effects — so the optimizer/AI can call it against a *candidate*
 * layout (before any Command commits it) exactly the same way the live UI
 * does.
 */
export function runConstraints(
  entities: GenericEntity[],
  entityMap: Record<string, GenericEntity>,
  settings: ConstraintSettings,
  rules: ConstraintRule[] = DEFAULT_RULES,
): Conflict[] {
  const context: ConstraintContext = { entities, entityMap, settings }
  return rules.flatMap((rule) => rule.evaluate(context))
}

export * from './types'
