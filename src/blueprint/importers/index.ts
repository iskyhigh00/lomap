import type { BlueprintImporter, ImportedBlueprintAsset } from './types'
import { rasterImporter } from './rasterImporter'
import { pdfImporter } from './pdfImporter'

const IMPORTERS: BlueprintImporter[] = [rasterImporter, pdfImporter]

export function findImporter(file: File): BlueprintImporter | null {
  return IMPORTERS.find((importer) => importer.accepts(file)) ?? null
}

export async function importBlueprintFile(file: File): Promise<ImportedBlueprintAsset> {
  const importer = findImporter(file)
  if (!importer) {
    throw new Error(`Formato no soportado: ${file.type || file.name}`)
  }
  return importer.import(file)
}

export type { ImportedBlueprintAsset, BlueprintImporter } from './types'
