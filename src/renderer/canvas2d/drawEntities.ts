import type { DoorEntity, GenericEntity, IslandEntity, MachineEntity, PerimeterEntity, PillarEntity, WallEntity, ZoneEntity } from '@engine/entities/types'
import type { Point } from '@engine/geometry/types'
import type { Viewport } from '@store/projectStore'
import type { ConflictSeverity } from '@constraints/types'
import { doorSpan, resolveDoorPlacement } from '@engine/entities/doorGeometry'
import { polylineLength, slicePolyline } from '@engine/geometry/vector'
import { polygonArea } from '@engine/geometry/polygon'
import { applyWorldTransform } from './canvasTransform'

interface DrawContext {
  ctx: CanvasRenderingContext2D
  viewport: Viewport
  selectedIds: Set<string>
  severityById?: Map<string, ConflictSeverity>
}

export function drawEntities(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  entities: GenericEntity[],
  selectedIds: Set<string>,
  dpr = 1,
  severityById?: Map<string, ConflictSeverity>,
): void {
  ctx.save()
  applyWorldTransform(ctx, viewport, dpr)
  const dctx: DrawContext = { ctx, viewport, selectedIds, severityById }

  const doorsByWall = new Map<string, DoorEntity[]>()
  for (const entity of entities) {
    if (entity.type === 'door' && entity.visible) {
      const door = entity as DoorEntity
      const list = doorsByWall.get(door.wallId)
      if (list) list.push(door)
      else doorsByWall.set(door.wallId, [door])
    }
  }

  for (const entity of entities) {
    if (!entity.visible) continue
    switch (entity.type) {
      case 'wall':
        drawWall(dctx, entity as WallEntity, doorsByWall.get(entity.id) ?? [])
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
      case 'door': {
        const door = entity as DoorEntity
        const wall = entities.find((e) => e.id === door.wallId) as WallEntity | undefined
        if (wall) drawDoor(dctx, door, wall)
        break
      }
      default:
        break
    }
  }
  ctx.restore()
}

const SEVERITY_COLOR: Record<ConflictSeverity, string> = {
  error: '#e5484d',
  warning: '#f2a93b',
}

/** Selection always wins visually (so clicking something stays unambiguous),
 * then a validation conflict's color, then the entity's own default color.
 * This is purely a color lookup — the severity itself was computed entirely
 * in `constraints/`, never here (see `hooks/useConstraints.ts`). */
function statusColor(dctx: DrawContext, id: string, fallback: string): string {
  if (dctx.selectedIds.has(id)) return '#3d8bfd'
  const severity = dctx.severityById?.get(id)
  return severity ? SEVERITY_COLOR[severity] : fallback
}

function hairline(dctx: DrawContext, base: number): number {
  return base / dctx.viewport.zoom
}

/** Shared with the 3D view (`renderer/scene3d/`) so wall-type colors never
 * drift between the two renderers. */
export const WALL_TYPE_COLOR: Record<WallEntity['wallType'], string> = {
  partition: '#c7ccd4',
  'load-bearing': '#8b95a5',
  exterior: '#5a6472',
  glass: '#7dd3fc',
  temporary: '#9aa4b2',
}

/** A wall's visible outline is entirely derived from `points` + `thickness` —
 * nothing is cached. A single continuous stroked path gives clean, mitered
 * corners at the wall's own internal vertices for free; joining across
 * *different* wall entities is future work (see engine/entities/types.ts).
 * Doors anchored to this wall (`doors`) cut a gap in the stroke at their
 * span — the wall never stores or caches that gap, it's recomputed here from
 * each door's live `offset` every render. */
function drawWall(dctx: DrawContext, wall: WallEntity, doors: DoorEntity[]): void {
  const { ctx } = dctx
  if (wall.points.length < 2) return
  ctx.save()
  ctx.strokeStyle = statusColor(dctx, wall.id, WALL_TYPE_COLOR[wall.wallType])
  ctx.lineWidth = Math.max(wall.thickness, hairline(dctx, 1))
  ctx.lineCap = 'square'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = wall.wallType === 'glass' ? 0.55 : 1
  if (wall.wallType === 'temporary') ctx.setLineDash([wall.thickness, wall.thickness / 2])

  for (const segmentPoints of wallStrokeSegments(wall, doors)) {
    if (segmentPoints.length < 2) continue
    ctx.beginPath()
    ctx.moveTo(segmentPoints[0].x, segmentPoints[0].y)
    for (const point of segmentPoints.slice(1)) ctx.lineTo(point.x, point.y)
    ctx.stroke()
  }
  ctx.restore()
}

/** Splits a wall's polyline into the pieces that should actually be stroked,
 * cutting out each door's opening span. Overlapping/adjacent door spans are
 * merged so two doors placed back-to-back don't leave a stray sliver. */
function wallStrokeSegments(wall: WallEntity, doors: DoorEntity[]): Point[][] {
  if (doors.length === 0) return [wall.points]
  const spans = doors
    .map((door) => doorSpan(door))
    .sort((a, b) => a.start - b.start)
    .reduce<{ start: number; end: number }[]>((merged, span) => {
      const last = merged[merged.length - 1]
      if (last && span.start <= last.end) {
        last.end = Math.max(last.end, span.end)
      } else {
        merged.push({ ...span })
      }
      return merged
    }, [])

  const segments: Point[][] = []
  let cursor = 0
  for (const span of spans) {
    segments.push(slicePolyline(wall.points, cursor, span.start))
    cursor = span.end
  }
  segments.push(slicePolyline(wall.points, cursor, polylineLength(wall.points)))
  return segments
}

function drawPillar(dctx: DrawContext, pillar: PillarEntity): void {
  const { ctx } = dctx
  const { x, y } = pillar.transform
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(pillar.transform.rotation)
  ctx.fillStyle = '#4a5568'
  ctx.strokeStyle = statusColor(dctx, pillar.id, '#8b95a5')
  ctx.lineWidth = hairline(dctx, 1.5)
  if (pillar.shape === 'circular') {
    ctx.beginPath()
    ctx.arc(0, 0, pillar.width / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.fillRect(-pillar.width / 2, -pillar.depth / 2, pillar.width, pillar.depth)
    ctx.strokeRect(-pillar.width / 2, -pillar.depth / 2, pillar.width, pillar.depth)
  }
  ctx.restore()
}

/** Standard CAD door symbol: jambs closing the gap cut into the wall, plus
 * (depending on `doorType`) a swing leaf + quarter-circle arc, a pair of
 * mirrored leaves for a double door, or an offset panel band for a sliding
 * door. Nothing here is stored on the entity — it's rebuilt every frame from
 * `wallId` + `offset` + `width` via `resolveDoorPlacement`. */
function drawDoor(dctx: DrawContext, door: DoorEntity, wall: WallEntity): void {
  const { ctx } = dctx
  const { center, angle } = resolveDoorPlacement(wall, door)
  const halfWidth = door.width / 2
  const halfThickness = wall.thickness / 2
  const sign = door.flip ? -1 : 1

  ctx.save()
  ctx.translate(center.x, center.y)
  ctx.rotate(angle)
  ctx.strokeStyle = statusColor(dctx, door.id, '#d8dee9')
  ctx.lineWidth = hairline(dctx, 1.25)

  // Jambs: the two cut edges of the opening, across the wall's thickness.
  ctx.beginPath()
  ctx.moveTo(-halfWidth, -halfThickness)
  ctx.lineTo(-halfWidth, halfThickness)
  ctx.moveTo(halfWidth, -halfThickness)
  ctx.lineTo(halfWidth, halfThickness)
  ctx.stroke()

  if (door.doorType === 'opening') {
    ctx.restore()
    return
  }

  if (door.doorType === 'sliding') {
    const bandNear = sign * halfThickness * 0.2
    const bandFar = sign * halfThickness * 0.9
    ctx.strokeRect(-halfWidth, Math.min(bandNear, bandFar), door.width, Math.abs(bandFar - bandNear))
    ctx.restore()
    return
  }

  if (door.doorType === 'double') {
    drawSwingLeaf(ctx, -halfWidth, 1, halfWidth, sign)
    drawSwingLeaf(ctx, halfWidth, -1, halfWidth, sign)
  } else {
    const closedDirX = door.swing === 'left' ? 1 : -1
    drawSwingLeaf(ctx, door.swing === 'left' ? -halfWidth : halfWidth, closedDirX, door.width, sign)
  }
  ctx.restore()
}

/** One swing-door leaf: a straight panel line from the hinge to its open
 * (90°) position, plus the quarter-circle arc it sweeps through. `hingeX` is
 * the leaf's hinge point along the wall (local x); `closedDirX` is +1/-1 for
 * whether the leaf's closed position sits in the +x or -x direction from the
 * hinge; `sign` is +1/-1 for which face of the wall it swings into. */
function drawSwingLeaf(ctx: CanvasRenderingContext2D, hingeX: number, closedDirX: 1 | -1, leafWidth: number, sign: 1 | -1): void {
  ctx.beginPath()
  ctx.moveTo(hingeX, 0)
  ctx.lineTo(hingeX, sign * leafWidth)
  ctx.stroke()

  const closedAngle = closedDirX > 0 ? 0 : Math.PI
  const openAngle = sign > 0 ? Math.PI / 2 : -Math.PI / 2
  const counterclockwise = closedDirX > 0 === sign < 0
  ctx.beginPath()
  ctx.arc(hingeX, 0, leafWidth, closedAngle, openAngle, counterclockwise)
  ctx.stroke()
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
  ctx.strokeStyle = statusColor(dctx, zone.id, zone.color)
  ctx.lineWidth = hairline(dctx, 1.5)
  if (zone.restricted) ctx.setLineDash([8 / dctx.viewport.zoom, 6 / dctx.viewport.zoom])
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  if (zone.points.length >= 3) {
    const area = polygonArea(zone.points) / 10000
    const centroid = zone.points.reduce((acc, p) => ({ x: acc.x + p.x / zone.points.length, y: acc.y + p.y / zone.points.length }), {
      x: 0,
      y: 0,
    })
    ctx.save()
    ctx.font = `${11 / dctx.viewport.zoom}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e8ebf0'
    ctx.fillText(zone.name, centroid.x, centroid.y - 6 / dctx.viewport.zoom)
    ctx.font = `${10 / dctx.viewport.zoom}px monospace`
    ctx.fillStyle = '#aab2c0'
    ctx.fillText(`${area.toFixed(1)} m²`, centroid.x, centroid.y + 8 / dctx.viewport.zoom)
    ctx.restore()
  }
}

function drawPerimeter(dctx: DrawContext, perimeter: PerimeterEntity): void {
  const { ctx } = dctx
  if (perimeter.points.length < 2) return
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(perimeter.points[0].x, perimeter.points[0].y)
  for (const point of perimeter.points.slice(1)) ctx.lineTo(point.x, point.y)
  ctx.closePath()
  ctx.strokeStyle = statusColor(dctx, perimeter.id, '#3ecf8e')
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
  ctx.strokeStyle = statusColor(dctx, machine.id, '#0b0e14')
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
  const severity = dctx.severityById?.get(island.id)
  // Only draw the group outline for the active selection or an active
  // validation conflict — at 1000+ islands, outlining every island
  // unconditionally would be pure visual noise and wasted draw calls.
  if (!dctx.selectedIds.has(island.id) && !severity) return
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
  ctx.strokeStyle = dctx.selectedIds.has(island.id) ? '#3d8bfd' : severity ? SEVERITY_COLOR[severity] : '#3d8bfd'
  ctx.setLineDash([6 / dctx.viewport.zoom, 4 / dctx.viewport.zoom])
  ctx.lineWidth = hairline(dctx, severity ? 2.5 : 1.5)
  ctx.strokeRect(minX - padding, minY - padding, maxX - minX + padding * 2, maxY - minY + padding * 2)
  ctx.restore()
}
