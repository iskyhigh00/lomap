import type { Viewport } from '@store/projectStore'
import type { BlueprintDocument } from './types'
import { getBlueprintBitmap } from './blueprintImageCache'

/** Draws every visible blueprint document behind the layout. Owns its own
 * render pass so the layout renderer never needs to know blueprints exist. */
export function drawBlueprints(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  documents: BlueprintDocument[],
  activeId: string | null,
  dpr = 1,
): void {
  if (documents.length === 0) return
  ctx.save()
  // See drawEntities.ts — setTransform is absolute, so dpr must be reapplied here.
  ctx.setTransform(viewport.zoom * dpr, 0, 0, viewport.zoom * dpr, viewport.x * dpr, viewport.y * dpr)

  for (const doc of documents) {
    if (!doc.visible) continue
    const bitmap = getBlueprintBitmap(doc.id)
    if (!bitmap) continue

    const width = doc.naturalWidth * doc.transform.scaleX
    const height = doc.naturalHeight * doc.transform.scaleY

    ctx.save()
    ctx.translate(doc.transform.x + width / 2, doc.transform.y + height / 2)
    ctx.rotate(doc.transform.rotation)
    ctx.globalAlpha = doc.opacity
    ctx.filter = `brightness(${100 + doc.brightness}%) contrast(${100 + doc.contrast}%)`
    ctx.drawImage(bitmap, -width / 2, -height / 2, width, height)
    ctx.filter = 'none'

    if (doc.id === activeId) {
      ctx.globalAlpha = 1
      ctx.strokeStyle = doc.locked ? '#f2a93b' : '#3d8bfd'
      ctx.setLineDash([8 / viewport.zoom, 5 / viewport.zoom])
      ctx.lineWidth = 1.5 / viewport.zoom
      ctx.strokeRect(-width / 2, -height / 2, width, height)
    }
    ctx.restore()
  }

  ctx.restore()
}
