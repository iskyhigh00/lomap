import type { BlueprintImporter, ImportedBlueprintAsset } from './types'
import type { BlueprintSourceFormat } from '../types'

const MIME_TO_FORMAT: Record<string, BlueprintSourceFormat> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export const rasterImporter: BlueprintImporter = {
  formats: ['png', 'jpg', 'webp'],

  accepts(file) {
    return file.type in MIME_TO_FORMAT
  },

  async import(file): Promise<ImportedBlueprintAsset> {
    const bitmap = await createImageBitmap(file)
    return {
      sourceFormat: MIME_TO_FORMAT[file.type],
      bitmap,
      naturalWidth: bitmap.width,
      naturalHeight: bitmap.height,
      blob: file,
    }
  },
}
