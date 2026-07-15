import { useCallback, useEffect, useRef, useState } from 'react'
import { useProjectStore } from '@store/projectStore'
import { useCommand } from '@hooks/useCommand'
import { screenToWorld, worldToScreen, zoomAt } from '@editor/viewport'
import { drawGrid } from '@renderer/canvas2d/drawGrid'
import { drawEntities } from '@renderer/canvas2d/drawEntities'
import { hitTestEntities, entitiesInBox } from '@editor/hitTest'
import { snapPointToGrid, distance } from '@engine/geometry/vector'
import type { Point } from '@engine/geometry/types'
import {
  createAddEntityCommand,
  createDeleteEntitiesCommand,
  createMoveEntitiesCommand,
} from '@commands/entityCommands'
import { createIsland, createMachine, createPerimeter, createPillar, createWall, createZone } from '@engine/entities/factory'

const POLYLINE_TOOLS = new Set(['perimeter', 'zone'])

export function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { execute, undo: requestUndo, redo: requestRedo } = useCommand()

  const entities = useProjectStore((s) => s.entities)
  const entityOrder = useProjectStore((s) => s.entityOrder)
  const selectedIds = useProjectStore((s) => s.selectedIds)
  const viewport = useProjectStore((s) => s.viewport)
  const gridSize = useProjectStore((s) => s.gridSize)
  const snapEnabled = useProjectStore((s) => s.snapEnabled)
  const activeTool = useProjectStore((s) => s.activeTool)
  const setViewport = useProjectStore((s) => s.setViewport)
  const setSelection = useProjectStore((s) => s.setSelection)
  const toggleSelection = useProjectStore((s) => s.toggleSelection)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)

  const [size, setSize] = useState({ width: 800, height: 600 })
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null)
  const [drawPoints, setDrawPoints] = useState<Point[]>([])
  const [boxSelect, setBoxSelect] = useState<{ start: Point; end: Point } | null>(null)

  const dragState = useRef<{
    mode: 'pan' | 'move' | null
    startScreen: Point
    startViewport: Point
    moveIds: string[]
    lastWorld: Point
    accumDx: number
    accumDy: number
  } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const entityList = entityOrder.map((id) => entities[id]).filter(Boolean)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    drawGrid(ctx, size.width, size.height, viewport, gridSize)
    drawEntities(ctx, viewport, entityList, new Set(selectedIds))

    if (drawPoints.length > 0 && cursorWorld) {
      ctx.save()
      ctx.setTransform(viewport.zoom * dpr, 0, 0, viewport.zoom * dpr, viewport.x * dpr, viewport.y * dpr)
      ctx.strokeStyle = '#3d8bfd'
      ctx.lineWidth = 1.5 / viewport.zoom
      ctx.setLineDash([6 / viewport.zoom, 4 / viewport.zoom])
      ctx.beginPath()
      ctx.moveTo(drawPoints[0].x, drawPoints[0].y)
      for (const p of drawPoints.slice(1)) ctx.lineTo(p.x, p.y)
      ctx.lineTo(cursorWorld.x, cursorWorld.y)
      ctx.stroke()
      ctx.restore()
    }

    if (boxSelect) {
      const a = worldToScreen(boxSelect.start, viewport)
      const b = worldToScreen(boxSelect.end, viewport)
      ctx.save()
      ctx.fillStyle = 'rgba(61, 139, 253, 0.12)'
      ctx.strokeStyle = '#3d8bfd'
      ctx.lineWidth = 1
      const x = Math.min(a.x, b.x)
      const y = Math.min(a.y, b.y)
      ctx.fillRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y))
      ctx.strokeRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y))
      ctx.restore()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, viewport, entities, entityOrder, selectedIds, gridSize, drawPoints, cursorWorld, boxSelect])

  const applySnap = useCallback(
    (point: Point) => (snapEnabled ? snapPointToGrid(point, gridSize) : point),
    [snapEnabled, gridSize],
  )

  const getWorldPoint = useCallback(
    (e: React.PointerEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect()
      const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      return applySnap(screenToWorld(screen, viewport))
    },
    [viewport, applySnap],
  )

  const finishPolyline = useCallback(
    (points: Point[]) => {
      if (points.length < 2) return
      if (activeTool === 'perimeter') {
        execute(createAddEntityCommand(createPerimeter(points)))
      } else if (activeTool === 'zone') {
        execute(createAddEntityCommand(createZone(points)))
      }
      setDrawPoints([])
      setActiveTool('select')
    },
    [activeTool, execute, setActiveTool],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect()
      const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const world = getWorldPoint(e)

      if (activeTool === 'pan' || e.button === 1) {
        dragState.current = {
          mode: 'pan',
          startScreen: screen,
          startViewport: { x: viewport.x, y: viewport.y },
          moveIds: [],
          lastWorld: world,
          accumDx: 0,
          accumDy: 0,
        }
        return
      }

      if (POLYLINE_TOOLS.has(activeTool)) {
        setDrawPoints((prev) => [...prev, world])
        return
      }

      if (activeTool === 'wall') {
        if (drawPoints.length === 1) {
          execute(createAddEntityCommand(createWall(drawPoints[0], world)))
          setDrawPoints([])
        } else {
          setDrawPoints([world])
        }
        return
      }

      if (activeTool === 'pillar') {
        execute(createAddEntityCommand(createPillar(world)))
        setActiveTool('select')
        return
      }

      if (activeTool === 'machine') {
        execute(createAddEntityCommand(createMachine(world)))
        setActiveTool('select')
        return
      }

      if (activeTool === 'island') {
        execute(createAddEntityCommand(createIsland(world)))
        setActiveTool('select')
        return
      }

      // Select tool
      const hitId = hitTestEntities(entityList, world, 8 / viewport.zoom)
      if (hitId) {
        const alreadySelected = selectedIds.includes(hitId)
        if (e.shiftKey) {
          toggleSelection(hitId)
        } else if (!alreadySelected) {
          setSelection([hitId])
        }
        dragState.current = {
          mode: 'move',
          startScreen: screen,
          startViewport: { x: viewport.x, y: viewport.y },
          moveIds: e.shiftKey || alreadySelected ? (alreadySelected ? selectedIds : [...selectedIds, hitId]) : [hitId],
          lastWorld: world,
          accumDx: 0,
          accumDy: 0,
        }
      } else {
        if (!e.shiftKey) setSelection([])
        setBoxSelect({ start: world, end: world })
      }
    },
    [activeTool, viewport, entityList, selectedIds, execute, setActiveTool, setSelection, toggleSelection, getWorldPoint, drawPoints],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const world = getWorldPoint(e)
      setCursorWorld(world)

      if (dragState.current?.mode === 'pan') {
        const rect = canvasRef.current!.getBoundingClientRect()
        const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        const dx = screen.x - dragState.current.startScreen.x
        const dy = screen.y - dragState.current.startScreen.y
        setViewport({ x: dragState.current.startViewport.x + dx, y: dragState.current.startViewport.y + dy })
        return
      }

      if (dragState.current?.mode === 'move') {
        const dx = world.x - dragState.current.lastWorld.x
        const dy = world.y - dragState.current.lastWorld.y
        if (dx === 0 && dy === 0) return
        const state = useProjectStore.getState()
        for (const id of dragState.current.moveIds) {
          const entity = state.entities[id]
          if (!entity) continue
          state._updateEntity(id, { transform: { ...entity.transform, x: entity.transform.x + dx, y: entity.transform.y + dy } })
        }
        dragState.current.lastWorld = world
        dragState.current.accumDx += dx
        dragState.current.accumDy += dy
        return
      }

      if (boxSelect) {
        setBoxSelect((prev) => (prev ? { ...prev, end: world } : prev))
      }
    },
    [getWorldPoint, setViewport, boxSelect],
  )

  const handlePointerUp = useCallback(() => {
    if (dragState.current?.mode === 'move' && (dragState.current.accumDx !== 0 || dragState.current.accumDy !== 0)) {
      // Commit the already-applied visual move as a single undoable command by
      // undoing the direct mutation and re-applying through the command system.
      const { moveIds, accumDx, accumDy } = dragState.current
      const state = useProjectStore.getState()
      for (const id of moveIds) {
        const entity = state.entities[id]
        if (!entity) continue
        state._updateEntity(id, { transform: { ...entity.transform, x: entity.transform.x - accumDx, y: entity.transform.y - accumDy } })
      }
      execute(createMoveEntitiesCommand(moveIds.map((id) => ({ id, dx: accumDx, dy: accumDy })), moveIds.length > 1 ? `Mover ${moveIds.length} objetos` : 'Mover objeto'))
      setSelection(moveIds)
    }
    dragState.current = null

    if (boxSelect) {
      const minX = Math.min(boxSelect.start.x, boxSelect.end.x)
      const maxX = Math.max(boxSelect.start.x, boxSelect.end.x)
      const minY = Math.min(boxSelect.start.y, boxSelect.end.y)
      const maxY = Math.max(boxSelect.start.y, boxSelect.end.y)
      if (distance(boxSelect.start, boxSelect.end) > 2) {
        const ids = entitiesInBox(entityList, { minX, minY, maxX, maxY })
        setSelection(ids)
      }
      setBoxSelect(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxSelect, entityList, execute, setSelection])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const rect = canvasRef.current!.getBoundingClientRect()
      const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        setViewport(zoomAt(viewport, screen, factor))
      }
    },
    [viewport, setViewport],
  )

  const handleDoubleClick = useCallback(() => {
    if (POLYLINE_TOOLS.has(activeTool) && drawPoints.length >= 2) {
      finishPolyline(drawPoints)
    }
  }, [activeTool, drawPoints, finishPolyline])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'Escape') {
        setDrawPoints([])
        setActiveTool('select')
        setSelection([])
      } else if (e.key === 'Enter' && POLYLINE_TOOLS.has(activeTool)) {
        finishPolyline(drawPoints)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        execute(createDeleteEntitiesCommand(selectedIds))
        setSelection([])
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) requestRedo()
        else requestUndo()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        requestRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, drawPoints, selectedIds, execute, setActiveTool, setSelection, finishPolyline, requestUndo, requestRedo])

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-surface-950">
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height, cursor: cursorForTool(activeTool) }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      {cursorWorld && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-surface-900/80 px-2 py-1 font-mono text-xs text-text-secondary">
          x: {cursorWorld.x.toFixed(0)} y: {cursorWorld.y.toFixed(0)} · zoom {(viewport.zoom * 100).toFixed(0)}%
        </div>
      )}
    </div>
  )
}

function cursorForTool(tool: string): string {
  switch (tool) {
    case 'pan':
      return 'grab'
    case 'select':
      return 'default'
    default:
      return 'crosshair'
  }
}
