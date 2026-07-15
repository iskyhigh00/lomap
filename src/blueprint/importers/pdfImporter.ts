import type { BlueprintImporter, ImportedBlueprintAsset } from './types'

/**
 * PDF rasterization needs a PDF renderer (e.g. pdf.js) that isn't part of the
 * current approved stack. Registered now so the UI can recognize a .pdf drop
 * and show a clear "not yet supported" message instead of silently failing
 * the raster importer, and so wiring in a real implementation later is a
 * one-file change.
 */
export const pdfImporter: BlueprintImporter = {
  formats: ['pdf'],

  accepts(file) {
    return file.type === 'application/pdf'
  },

  import(): Promise<ImportedBlueprintAsset> {
    return Promise.reject(
      new Error('La importación de PDF aún no está disponible. Usa PNG, JPG o WEBP por ahora.'),
    )
  },
}
