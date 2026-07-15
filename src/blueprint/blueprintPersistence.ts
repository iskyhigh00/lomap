import { db, type StoredBlueprint } from '@persistence/db'
import type { BlueprintDocument } from './types'

export async function saveBlueprintMetadata(projectId: string, doc: BlueprintDocument, blob?: Blob): Promise<void> {
  const existing = await db.blueprints.get(doc.id)
  await db.blueprints.put({
    ...doc,
    projectId,
    blob: blob ?? existing?.blob ?? new Blob(),
  })
}

export async function deleteBlueprintRecord(id: string): Promise<void> {
  await db.blueprints.delete(id)
}

export async function loadBlueprintsForProject(projectId: string): Promise<StoredBlueprint[]> {
  return db.blueprints.where('projectId').equals(projectId).toArray()
}
