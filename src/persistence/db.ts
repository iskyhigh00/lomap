import Dexie, { type Table } from 'dexie'
import type { GenericEntity, Layer } from '@engine/entities/types'
import type { BlueprintDocument } from '@blueprint/types'

export interface StoredProject {
  id: string
  name: string
  entities: Record<string, GenericEntity>
  entityOrder: string[]
  layers: Record<string, Layer>
  layerOrder: string[]
  updatedAt: number
  createdAt: number
}

/** Blueprint metadata only — small, JSON, changes on every drag/opacity tweak.
 * Deliberately excludes the image bytes: see `blueprintAssets`. */
export interface StoredBlueprint extends BlueprintDocument {
  projectId: string
}

/** The raw image bytes, in their own table. Written once at import time and
 * only ever read (never rewritten) after that — splitting it from
 * `StoredBlueprint` means a position/opacity/calibration autosave never reads
 * or rewrites a multi-MB blob, and can never race the initial import write. */
export interface StoredBlueprintAsset {
  id: string
  blob: Blob
}

export class CasinoLayoutDB extends Dexie {
  projects!: Table<StoredProject, string>
  blueprints!: Table<StoredBlueprint, string>
  blueprintAssets!: Table<StoredBlueprintAsset, string>

  constructor() {
    super('CasinoLayoutStudio')
    this.version(1).stores({
      projects: 'id, name, updatedAt',
    })
    this.version(2).stores({
      projects: 'id, name, updatedAt',
      blueprints: 'id, projectId',
    })
    this.version(3)
      .stores({
        projects: 'id, name, updatedAt',
        blueprints: 'id, projectId',
        blueprintAssets: 'id',
      })
      .upgrade(async (tx) => {
        // Move v2's embedded blob out into its own table so existing projects
        // keep their imported plans after the upgrade.
        const rows = await tx.table('blueprints').toArray()
        const assets = rows
          .filter((row) => row.blob instanceof Blob)
          .map((row) => ({ id: row.id, blob: row.blob as Blob }))
        if (assets.length > 0) {
          await tx.table('blueprintAssets').bulkAdd(assets)
        }
        await Promise.all(
          rows.map((row) => {
            const { blob: _blob, ...metadata } = row
            return tx.table('blueprints').put(metadata)
          }),
        )
      })
  }
}

export const db = new CasinoLayoutDB()
