import type { GenericEntity } from '@engine/entities/types'

let clipboard: GenericEntity[] = []
let pasteCount = 0

export function setClipboard(entities: GenericEntity[]): void {
  clipboard = entities.map((e) => structuredClone(e))
  pasteCount = 0
}

export function getClipboard(): GenericEntity[] {
  return clipboard
}

export function hasClipboard(): boolean {
  return clipboard.length > 0
}

/** Each successive paste offsets a bit further so pasted copies don't stack exactly. */
export function nextPasteOffset(step = 30): { dx: number; dy: number } {
  pasteCount += 1
  return { dx: step * pasteCount, dy: step * pasteCount }
}
