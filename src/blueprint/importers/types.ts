import type { BlueprintSourceFormat } from '../types'

export interface ImportedBlueprintAsset {
  sourceFormat: BlueprintSourceFormat
  bitmap: ImageBitmap
  naturalWidth: number
  naturalHeight: number
  /** Raw bytes persisted to IndexedDB so the blueprint survives a reload. */
  blob: Blob
}

/** One implementation per source format. Adding DXF/DWG later means adding a
 * new file that satisfies this interface — no changes anywhere else. */
export interface BlueprintImporter {
  formats: BlueprintSourceFormat[]
  accepts(file: File): boolean
  import(file: File): Promise<ImportedBlueprintAsset>
}
