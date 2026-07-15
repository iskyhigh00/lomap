import Dexie, { type Table } from 'dexie'
import type { GenericEntity, IslandEntity, Layer, MachineEntity } from '@engine/entities/types'
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

/** A single machine's shape/identity, saved relative to its island — never
 * absolute position, so the same template drops in anywhere. Positions are
 * recomputed fresh at instantiation time by the same `layoutIslandMachines`
 * the "add island" command already uses (see `library/islandTemplates.ts`)
 * — never a second copy of that placement math. */
export interface IslandTemplateMachine {
  name: string
  manufacturer: string
  model: string
  width: number
  depth: number
  height: number
  powerConsumption: number
  color: string
  category: MachineEntity['category']
}

/** A reusable island layout, global across projects (Fase 7 — "biblioteca
 * reutilizable de islas"). Deliberately its own table, not part of
 * `StoredProject`: a template outlives any single project and is meant to be
 * dragged into many of them, same reasoning as Blueprint's own store. */
export interface StoredIslandTemplate {
  id: string
  name: string
  shape: IslandEntity['shape']
  spacing: number
  machines: IslandTemplateMachine[]
  createdAt: number
}

/** A named, portable snapshot of a set of entities — the payload for
 * "copiar layout entre proyectos" and for layout comparison (Fase 7). Plain
 * entity JSON, exactly what's already in `entities`; no separate format. */
export interface StoredLayoutSnapshot {
  id: string
  name: string
  entities: GenericEntity[]
  createdAt: number
}

export class CasinoLayoutDB extends Dexie {
  projects!: Table<StoredProject, string>
  blueprints!: Table<StoredBlueprint, string>
  blueprintAssets!: Table<StoredBlueprintAsset, string>
  islandTemplates!: Table<StoredIslandTemplate, string>
  layoutSnapshots!: Table<StoredLayoutSnapshot, string>

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
    this.version(4).stores({
      projects: 'id, name, updatedAt',
      blueprints: 'id, projectId',
      blueprintAssets: 'id',
      islandTemplates: 'id, name, createdAt',
      layoutSnapshots: 'id, name, createdAt',
    })
  }
}

export const db = new CasinoLayoutDB()
