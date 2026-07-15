import { useCallback, useSyncExternalStore } from 'react'
import type { Command } from '@commands/types'
import { history } from '@store/projectStore'

export function useCommand() {
  const execute = useCallback((command: Command) => history.execute(command), [])
  return { execute, undo: () => history.undo(), redo: () => history.redo() }
}

export function useHistoryState() {
  return useSyncExternalStore(
    (listener) => history.subscribe(listener),
    () => history.getSnapshot(),
  )
}
