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

/** Blueprint metadata + raw bytes, stored independently from `projects` — the
 * reference-document subsystem persists on its own timeline, never mixed
 * into the layout model's JSON blob. */
export interface StoredBlueprint extends BlueprintDocument {
  projectId: string
  blob: Blob
}

export class CasinoLayoutDB extends Dexie {
  projects!: Table<StoredProject, string>
  blueprints!: Table<StoredBlueprint, string>

  constructor() {
    super('CasinoLayoutStudio')
    this.version(1).stores({
      projects: 'id, name, updatedAt',
    })
    this.version(2).stores({
      projects: 'id, name, updatedAt',
      blueprints: 'id, projectId',
    })
  }
}

export const db = new CasinoLayoutDB()
