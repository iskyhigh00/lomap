import type { Command } from '@commands/types'
import { history, useProjectStore } from '@store/projectStore'
import { useBlueprintStore } from './blueprintStore'
import type { BlueprintCalibration, BlueprintDocument } from './types'
import { generateId } from '@engine/entities/factory'
import { IDENTITY_TRANSFORM } from '@engine/geometry/types'
import type { Point } from '@engine/geometry/types'
import { importBlueprintFile } from './importers'
import { setBlueprintBitmap } from './blueprintImageCache'
import { computeCalibrationFactor } from './calibration'
import { worldToImageLocal } from './blueprintGeometry'
import { deleteBlueprintRecord, loadBlueprintAsset, saveBlueprintAsset, saveBlueprintMetadata } from './blueprintPersistence'

function currentProjectId(): string {
  return useProjectStore.getState().projectId ?? 'unsaved'
}

/** Imports a file, decodes it, and adds a new BlueprintDocument. Runs the async
 * decode up front so do()/undo() stay synchronous like every other command.
 * Persists metadata + the raw bytes immediately (not on the debounced
 * autosave) so a reload right after import never loses the source image. */
export async function createImportBlueprintCommand(file: File): Promise<Command> {
  const asset = await importBlueprintFile(file)
  const id = generateId('blueprint')
  const now = Date.now()
  const doc: BlueprintDocument = {
    id,
    name: file.name.replace(/\.[^.]+$/, ''),
    sourceFormat: asset.sourceFormat,
    naturalWidth: asset.naturalWidth,
    naturalHeight: asset.naturalHeight,
    transform: { ...IDENTITY_TRANSFORM },
    opacity: 1,
    brightness: 0,
    contrast: 0,
    locked: false,
    visible: true,
    calibration: null,
    createdAt: now,
    updatedAt: now,
  }
  const projectId = currentProjectId()

  return {
    label: `Importar plano ${doc.name}`,
    do() {
      setBlueprintBitmap(id, asset.bitmap)
      useBlueprintStore.getState()._addDocument(doc)
      void saveBlueprintMetadata(projectId, doc)
      void saveBlueprintAsset(id, asset.blob)
    },
    undo() {
      useBlueprintStore.getState()._removeDocument(id)
      void deleteBlueprintRecord(id)
    },
  }
}

export function createUpdateBlueprintCommand(id: string, patch: Partial<BlueprintDocument>, label = 'Editar plano'): Command {
  const before = useBlueprintStore.getState().documents[id]
  const previousPatch: Partial<BlueprintDocument> = {}
  for (const key of Object.keys(patch) as (keyof BlueprintDocument)[]) {
    ;(previousPatch as Record<string, unknown>)[key] = (before as unknown as Record<string, unknown>)[key]
  }
  return {
    label,
    do() {
      useBlueprintStore.getState()._updateDocument(id, patch)
    },
    undo() {
      useBlueprintStore.getState()._updateDocument(id, previousPatch)
    },
  }
}

export function createMoveBlueprintCommand(id: string, dx: number, dy: number, label = 'Mover plano'): Command {
  return {
    label,
    do() {
      const state = useBlueprintStore.getState()
      const doc = state.documents[id]
      if (!doc) return
      state._updateDocument(id, { transform: { ...doc.transform, x: doc.transform.x + dx, y: doc.transform.y + dy } })
    },
    undo() {
      const state = useBlueprintStore.getState()
      const doc = state.documents[id]
      if (!doc) return
      state._updateDocument(id, { transform: { ...doc.transform, x: doc.transform.x - dx, y: doc.transform.y - dy } })
    },
  }
}

/**
 * Deleting is async because undo needs the original bytes back. The in-memory
 * bitmap is deliberately left in the cache (not evicted) here: Command.undo()
 * must stay synchronous everywhere in the app, and re-decoding a bitmap from
 * its Blob is inherently async, so there's no synchronous way to restore it
 * on undo. The asset Blob itself is still fetched up front so undo can also
 * repersist the Dexie record if it was already deleted from disk.
 */
export async function createDeleteBlueprintCommand(id: string): Promise<Command> {
  const state = useBlueprintStore.getState()
  const doc = state.documents[id]
  const index = state.order.indexOf(id)
  const blob = await loadBlueprintAsset(id)
  const projectId = currentProjectId()

  return {
    label: `Eliminar plano ${doc?.name ?? ''}`,
    do() {
      useBlueprintStore.getState()._removeDocument(id)
      void deleteBlueprintRecord(id)
    },
    undo() {
      if (!doc) return
      useBlueprintStore.getState()._restoreDocument(doc, index)
      void saveBlueprintMetadata(projectId, doc)
      if (blob) void saveBlueprintAsset(id, blob)
    },
  }
}

/** Scales the blueprint uniformly so the distance between two clicked world
 * points matches `knownDistance`. The calibration record itself is converted
 * to the image's natural pixel space before storing (see blueprintGeometry.ts)
 * so it stays meaningful even after later moves/rotations/rescales. */
export function createCalibrateBlueprintCommand(id: string, pointA: Point, pointB: Point, knownDistance: number): Command {
  const state = useBlueprintStore.getState()
  const doc = state.documents[id]
  if (!doc) return { label: 'Calibrar escala', do() {}, undo() {} }

  const factor = computeCalibrationFactor(pointA, pointB, knownDistance)
  const calibration: BlueprintCalibration = {
    pointA: worldToImageLocal(doc, pointA),
    pointB: worldToImageLocal(doc, pointB),
    knownDistance,
  }
  const previousTransform = doc.transform
  const previousCalibration = doc.calibration
  const nextTransform = {
    ...doc.transform,
    scaleX: doc.transform.scaleX * factor,
    scaleY: doc.transform.scaleY * factor,
  }

  return {
    label: 'Calibrar escala del plano',
    do() {
      useBlueprintStore.getState()._updateDocument(id, { transform: nextTransform, calibration })
    },
    undo() {
      useBlueprintStore.getState()._updateDocument(id, { transform: previousTransform, calibration: previousCalibration })
    },
  }
}

/** Blueprint commands share the app's single global undo/redo timeline. */
export function executeBlueprintCommand(command: Command): void {
  history.execute(command)
}
