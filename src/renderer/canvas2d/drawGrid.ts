import type { Viewport } from '@store/projectStore'

/** Fills the canvas with the base background color. Kept separate from
 * `drawGrid` so a blueprint reference image can be painted between the
 * background and the grid lines (grid renders on top of the blueprint so
 * measurements stay readable; the blueprint renders on top of the plain
 * background so it's visible at all). */
export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#0b0e14'
  ctx.fillRect(0, 0, width, height)
}

/** Draws an infinite adaptive grid: a fine line every `gridSize` world units and a
 * bolder line every 5th step, faded out at low zoom to avoid moiré noise. */
export function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, viewport: Viewport, gridSize: number): void {
  ctx.save()

  const step = gridSize * viewport.zoom
  if (step < 4) {
    ctx.restore()
    return
  }

  const offsetX = viewport.x % step
  const offsetY = viewport.y % step
  const majorEvery = 5

  const startCol = Math.floor(-offsetX / step)
  const startRow = Math.floor(-offsetY / step)
  const colCount = Math.ceil(width / step) + 2
  const rowCount = Math.ceil(height / step) + 2

  for (let i = 0; i < colCount; i++) {
    const col = startCol + i
    const x = offsetX + col * step
    const isMajor = Math.round((x - viewport.x) / step) % majorEvery === 0
    ctx.strokeStyle = isMajor ? '#242c39' : '#171d27'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, height)
    ctx.stroke()
  }

  for (let i = 0; i < rowCount; i++) {
    const row = startRow + i
    const y = offsetY + row * step
    const isMajor = Math.round((y - viewport.y) / step) % majorEvery === 0
    ctx.strokeStyle = isMajor ? '#242c39' : '#171d27'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(width, y + 0.5)
    ctx.stroke()
  }

  // Origin axes
  const origin = { x: viewport.x, y: viewport.y }
  ctx.strokeStyle = '#3a4553'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, origin.y)
  ctx.lineTo(width, origin.y)
  ctx.moveTo(origin.x, 0)
  ctx.lineTo(origin.x, height)
  ctx.stroke()

  ctx.restore()
}
