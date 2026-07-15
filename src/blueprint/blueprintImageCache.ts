/**
 * Decoded bitmaps are kept out of Zustand/React state entirely — they're large
 * binary data that never needs to trigger a re-render on their own (only
 * transform/opacity/filter changes on the owning BlueprintDocument do, and
 * those already live in reactive state). This module is the single source of
 * truth for "what does blueprint X currently look like as pixels".
 */
const cache = new Map<string, ImageBitmap>()

export function getBlueprintBitmap(id: string): ImageBitmap | undefined {
  return cache.get(id)
}

export function setBlueprintBitmap(id: string, bitmap: ImageBitmap): void {
  cache.get(id)?.close()
  cache.set(id, bitmap)
}

export function deleteBlueprintBitmap(id: string): void {
  cache.get(id)?.close()
  cache.delete(id)
}

export async function loadBlueprintBitmapFromBlob(id: string, blob: Blob): Promise<ImageBitmap> {
  const bitmap = await createImageBitmap(blob)
  setBlueprintBitmap(id, bitmap)
  return bitmap
}
