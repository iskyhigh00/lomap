export interface Command {
  /** Short label used in history UI, e.g. "Move Island". */
  label: string
  do(): void
  undo(): void
  /** Optional: merge a subsequent command of the same kind (e.g. drag deltas) into this one. */
  mergeWith?(next: Command): Command | null
}
