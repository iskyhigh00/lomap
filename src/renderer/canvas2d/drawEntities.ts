import type { GenericEntity, IslandEntity, MachineEntity, PerimeterEntity, PillarEntity, WallEntity, ZoneEntity } from '@engine/entities/types'
import type { Viewport } from '@store/projectStore'

interface DrawContext {
  ctx: CanvasRenderingContext2D
  viewport: Viewport
  selectedIds: Set<string>
}

export function drawEntities(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  entities: GenericEntity[],
  selectedIds: Set<string>,
  dpr = 1,
): void {
  ctx.save()
  // setTransform is absolute, not multiplicative — the outer dpr scale set by the
  // caller must be re-applied here explicitly or entities render at the wrong
  // size/position relative to the grid on any HiDPI display.
  ctx.setTransform(viewport.zoom * dpr, 0, 0, viewport.zoom * dpr, viewport.x * dpr, viewport.y * dpr)
  const dctx: DrawContext = { ctx, viewport, selectedIds }

  for (const entity of entities) {
    if (!entity.visible) continue
    switch (entity.type) {
      case 'wall':
        drawWall(dctx, entity as WallEntity)
        break
      case 'pillar':
        drawPillar(dctx, entity as PillarEntity)
        break
      case 'zone':
        drawZone(dctx, entity as ZoneEntity)
        break
      case 'perimeter':
        drawPerimeter(dctx, entity as PerimeterEntity)
        break
      case 'machine':
        drawMachine(dctx, entity as MachineEntity)
        break
      case 'island':
        drawIslandBounds(dctx, entity as IslandEntity, entities)
        break
      default:
        break
    }
  }
  ctx.restore()
}

function selectionColor(dctx: DrawContext, id: string, fallback: string): string {
  return dctx.selectedIds.has(id) ? '#3d8bfd' : fallback
}

function hairline(dctx: DrawContext, base: number): number {
  return base / dctx.viewport.zoom
}

function drawWall(dctx: DrawContext, wall: WallEntity): void {
  const { ctx } = dctx
  ctx.strokeStyle = selectionColor(dctx, wall.id, '#c7ccd4')
  ctx.lineWidth = Math.max(wall.thickness, hairline(dctx, 1))
  ctx.lineCap = 'square'
  ctx.beginPath()
  ctx.moveTo(wall.start.x, wall.start.y)
  ctx.lineTo(wall.end.x, wall.end.y)
  ctx.stroke()
}

function drawPillar(dctx: DrawContext, pillar: PillarEntity): void {
  const { ctx } = dctx
  const { x, y } = pillar.transform
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(pillar.transform.rotation)
  ctx.fillStyle = '#4a5568'
  ctx.strokeStyle = selectionColor(dctx, pillar.id, '#8b95a5')
  ctx.lineWidth = hairline(dctx, 1.5)
  ctx.fillRect(-pillar.width / 2, -pillar.depth / 2, pillar.width, pillar.depth)
  ctx.strokeRect(-pillar.width / 2, -pillar.depth / 2, pillar.width, pillar.depth)
  ctx.restore()
}

function drawZone(dctx: DrawContext, zone: ZoneEntity): void {
  const { ctx } = dctx
  if (zone.points.length < 2) return
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(zone.points[0].x, zone.points[0].y)
  for (const point of zone.points.slice(1)) ctx.lineTo(point.x, point.y)
  ctx.closePath()
  ctx.fillStyle = zone.color + '26'
  ctx.strokeStyle = selectionColor(dctx, zone.id, zone.color)
  ctx.lineWidth = hairline(dctx, 1.5)
  if (zone.restricted) ctx.setLineDash([8 / dctx.viewport.zoom, 6 / dctx.viewport.zoom])
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawPerimeter(dctx: DrawContext, perimeter: PerimeterEntity): void {
  const { ctx } = dctx
  if (perimeter.points.length < 2) return
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(perimeter.points[0].x, perimeter.points[0].y)
  for (const point of perimeter.points.slice(1)) ctx.lineTo(point.x, point.y)
  ctx.closePath()
  ctx.strokeStyle = selectionColor(dctx, perimeter.id, '#3ecf8e')
  ctx.lineWidth = hairline(dctx, 3)
  ctx.stroke()
  ctx.restore()
}

function drawMachine(dctx: DrawContext, machine: MachineEntity): void {
  const { ctx } = dctx
  const { x, y } = machine.transform
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(machine.transform.rotation)
  ctx.fillStyle = machine.color
  ctx.strokeStyle = selectionColor(dctx, machine.id, '#0b0e14')
  ctx.lineWidth = hairline(dctx, machine.islandId && dctx.selectedIds.has(machine.id) ? 2 : 1)
  ctx.fillRect(-machine.width / 2, -machine.depth / 2, machine.width, machine.depth)
  ctx.strokeRect(-machine.width / 2, -machine.depth / 2, machine.width, machine.depth)
  // Front indicator
  ctx.fillStyle = '#0b0e14aa'
  ctx.fillRect(-machine.width / 2, machine.depth / 2 - Math.min(6, machine.depth * 0.15), machine.width, Math.min(6, machine.depth * 0.15))
  ctx.restore()
}

function drawIslandBounds(dctx: DrawContext, island: IslandEntity, allEntities: GenericEntity[]): void {
  const { ctx } = dctx
  // Only draw the group outline for the active selection — at 1000+ islands, outlining
  // every island unconditionally would be pure visual noise and wasted draw calls.
  if (!dctx.selectedIds.has(island.id)) return
  const machines = allEntities.filter(
    (entity): entity is MachineEntity => entity.type === 'machine' && island.machineIds.includes(entity.id),
  )
  if (machines.length === 0) return
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const machine of machines) {
    const halfW = machine.width / 2
    const halfD = machine.depth / 2
    minX = Math.min(minX, machine.transform.x - halfW)
    minY = Math.min(minY, machine.transform.y - halfD)
    maxX = Math.max(maxX, machine.transform.x + halfW)
    maxY = Math.max(maxY, machine.transform.y + halfD)
  }
  const padding = 10
  ctx.save()
  ctx.strokeStyle = '#3d8bfd'
  ctx.setLineDash([6 / dctx.viewport.zoom, 4 / dctx.viewport.zoom])
  ctx.lineWidth = hairline(dctx, 1.5)
  ctx.strokeRect(minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2)
  ctx.restore()
}
