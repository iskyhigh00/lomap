import { db } from '@persistence/db'
import type { BlueprintDocument } from './types'

/** Metadata-only write (position, opacity, calibration, ...). Never touches
 * the image bytes — see `saveBlueprintAsset` — so this stays cheap no matter
 * how large the source image is, and can't race the initial asset write. */
export async function saveBlueprintMetadata(projectId: string, doc: BlueprintDocument): Promise<void> {
  await db.blueprints.put({ ...doc, projectId })
}

/** Written once at import time; the blob is immutable after that. */
export async function saveBlueprintAsset(id: string, blob: Blob): Promise<void> {
  await db.blueprintAssets.put({ id, blob })
}

export async function loadBlueprintAsset(id: string): Promise<Blob | undefined> {
  return (await db.blueprintAssets.get(id))?.blob
}

export async function deleteBlueprintRecord(id: string): Promise<void> {
  await db.blueprints.delete(id)
  await db.blueprintAssets.delete(id)
}

export async function loadBlueprintsForProject(projectId: string): Promise<BlueprintDocument[]> {
  const rows = await db.blueprints.where('projectId').equals(projectId).toArray()
  return rows.map(({ projectId: _projectId, ...doc }) => doc)
}
