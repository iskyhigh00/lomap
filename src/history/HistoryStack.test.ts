import { describe, expect, it } from 'vitest'
import { HistoryStack } from './HistoryStack'
import type { Command } from '@commands/types'

function counterCommand(ref: { value: number }, amount: number): Command {
  return {
    label: `add ${amount}`,
    do: () => {
      ref.value += amount
    },
    undo: () => {
      ref.value -= amount
    },
  }
}

describe('HistoryStack', () => {
  it('executes commands and tracks undo/redo availability', () => {
    const history = new HistoryStack()
    const ref = { value: 0 }
    expect(history.canUndo()).toBe(false)

    history.execute(counterCommand(ref, 5))
    expect(ref.value).toBe(5)
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)
  })

  it('undoes and redoes in the correct order', () => {
    const history = new HistoryStack()
    const ref = { value: 0 }
    history.execute(counterCommand(ref, 5))
    history.execute(counterCommand(ref, 3))
    expect(ref.value).toBe(8)

    history.undo()
    expect(ref.value).toBe(5)
    history.undo()
    expect(ref.value).toBe(0)
    expect(history.canUndo()).toBe(false)

    history.redo()
    expect(ref.value).toBe(5)
    history.redo()
    expect(ref.value).toBe(8)
    expect(history.canRedo()).toBe(false)
  })

  it('clears the redo stack after a new command is executed', () => {
    const history = new HistoryStack()
    const ref = { value: 0 }
    history.execute(counterCommand(ref, 5))
    history.undo()
    expect(history.canRedo()).toBe(true)

    history.execute(counterCommand(ref, 2))
    expect(history.canRedo()).toBe(false)
    expect(ref.value).toBe(2)
  })

  it('notifies subscribers on state changes', () => {
    const history = new HistoryStack()
    let notifications = 0
    const unsubscribe = history.subscribe(() => {
      notifications++
    })
    history.execute(counterCommand({ value: 0 }, 1))
    history.undo()
    expect(notifications).toBe(2)
    unsubscribe()
    history.execute(counterCommand({ value: 0 }, 1))
    expect(notifications).toBe(2)
  })
})
