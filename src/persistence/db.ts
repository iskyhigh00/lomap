import Dexie, { type Table } from 'dexie'
import type { GenericEntity, Layer } from '@engine/entities/types'

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

export class CasinoLayoutDB extends Dexie {
  projects!: Table<StoredProject, string>

  constructor() {
    super('CasinoLayoutStudio')
    this.version(1).stores({
      projects: 'id, name, updatedAt',
    })
  }
}

export const db = new CasinoLayoutDB()
