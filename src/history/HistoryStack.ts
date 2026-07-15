import type { Command } from '@commands/types'

type Listener = () => void

export interface HistorySnapshot {
  canUndo: boolean
  canRedo: boolean
  undoLabel: string | null
  redoLabel: string | null
}

/**
 * Unlimited undo/redo stack built on the Command Pattern. Every entity mutation
 * in the app flows through `execute()` — nothing mutates the store directly.
 */
export class HistoryStack {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private listeners = new Set<Listener>()
  private snapshot: HistorySnapshot = { canUndo: false, canRedo: false, undoLabel: null, redoLabel: null }

  getSnapshot(): HistorySnapshot {
    return this.snapshot
  }

  execute(command: Command): void {
    const last = this.undoStack[this.undoStack.length - 1]
    const merged = last?.mergeWith?.(command)
    command.do()
    if (merged) {
      this.undoStack[this.undoStack.length - 1] = merged
    } else {
      this.undoStack.push(command)
    }
    this.redoStack = []
    this.notify()
  }

  undo(): void {
    const command = this.undoStack.pop()
    if (!command) return
    command.undo()
    this.redoStack.push(command)
    this.notify()
  }

  redo(): void {
    const command = this.redoStack.pop()
    if (!command) return
    command.do()
    this.undoStack.push(command)
    this.notify()
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  get undoLabel(): string | null {
    return this.undoStack[this.undoStack.length - 1]?.label ?? null
  }

  get redoLabel(): string | null {
    return this.redoStack[this.redoStack.length - 1]?.label ?? null
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.notify()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.snapshot = {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoLabel: this.undoLabel,
      redoLabel: this.redoLabel,
    }
    for (const listener of this.listeners) listener()
  }
}
