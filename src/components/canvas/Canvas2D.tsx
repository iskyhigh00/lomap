import { useCallback, useEffect, useRef, useState } from 'react'
import { useProjectStore } from '@store/projectStore'
import { useCommand } from '@hooks/useCommand'
import { screenToWorld, worldToScreen, zoomAt } from '@editor/viewport'
import { drawBackground, drawGrid } from '@renderer/canvas2d/drawGrid'
import { drawEntities } from '@renderer/canvas2d/drawEntities'
import { hitTestEntities, entitiesInBox } from '@editor/hitTest'
import { angleBetween, distance, snapPointToGrid } from '@engine/geometry/vector'
import type { Point } from '@engine/geometry/types'
import { computeCentroid } from '@engine/entities/islandOps'
import {
  createAddEntityCommand,
  createDeleteEntitiesCommand,
  createDuplicateEntitiesCommand,
  createMoveEntitiesCommand,
  createPasteEntitiesCommand,
  createRotateGroupCommand,
} from '@commands/entityCommands'
import { createAddIslandCommand } from '@commands/islandCommands'
import { createMachine, createPerimeter, createPillar, createWall, createZone } from '@engine/entities/factory'
import { expandGroupIds, resolveClickTarget } from '@selection/groupSelection'
import { getClipboard, hasClipboard, nextPasteOffset, setClipboard } from '@editor/clipboard'
import { useBlueprintStore } from '@blueprint/blueprintStore'
import { drawBlueprints } from '@blueprint/renderBlueprint'
import { createCalibrateBlueprintCommand, createMoveBlueprintCommand, executeBlueprintCommand } from '@blueprint/blueprintCommands'
import { isPointOnBlueprint } from '@blueprint/blueprintGeometry'

const POLYLINE_TOOLS = new Set(['perimeter', 'zone'])

interface DragState {
  mode: 'pan' | 'move' | 'rotate'
  startScreen: Point
  startViewport: Point
  moveIds: string[]
  lastWorld: Point
  accumDx: number
  accumDy: number
  pivot: Point
  startAngle: number
  lastAngle: number
  accumAngle: number
}

export function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { execute, undo: requestUndo, redo: requestRedo } = useCommand()

  const entities = useProjectStore((s) => s.entities)
  const entityOrder = useProjectStore((s) => s.entityOrder)
  const layers = useProjectStore((s) => s.layers)
  const selectedIds = useProjectStore((s) => s.selectedIds)
  const viewport = useProjectStore((s) => s.viewport)
  const gridSize = useProjectStore((s) => s.gridSize)
  const snapEnabled = useProjectStore((s) => s.snapEnabled)
  const activeTool = useProjectStore((s) => s.activeTool)
  const setViewport = useProjectStore((s) => s.setViewport)
  const setSelection = useProjectStore((s) => s.setSelection)
  const toggleSelection = useProjectStore((s) => s.toggleSelection)
  const setActiveTool = useProjectStore((s) => s.setActiveTool)

  const blueprintDocs = useBlueprintStore((s) => s.documents)
  const blueprintOrder = useBlueprintStore((s) => s.order)
  const activeBlueprintId = useBlueprintStore((s) => s.activeId)
  const setActiveBlueprintId = useBlueprintStore((s) => s.setActiveId)
  const calibratingBlueprintId = useBlueprintStore((s) => s.calibratingId)
  const setCalibratingId = useBlueprintStore((s) => s.setCalibratingId)

  const [size, setSize] = useState({ width: 800, height: 600 })
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null)
  const [drawPoints, setDrawPoints] = useState<Point[]>([])
  const [boxSelect, setBoxSelect] = useState<{ start: Point; end: Point } | null>(null)
  const [measureStart, setMeasureStart] = useState<Point | null>(null)
  const [calibrationPointA, setCalibrationPointA] = useState<Point | null>(null)
  const [pendingCalibration, setPendingCalibration] = useState<{ id: string; a: Point; b: Point } | null>(null)

  const dragState = useRef<DragState | null>(null)
  const blueprintDragState = useRef<{ id: string; startWorld: Point; accumDx: number; accumDy: number } | null>(null)

  const blueprintList = blueprintOrder.map((id) => blueprintDocs[id]).filter(Boolean)

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

  // Entities on a hidden layer are dropped entirely; entities on a locked layer
  // stay visible but become unselectable (locked flag merged in for hit-testing).
  const entityList = entityOrder
    .map((id) => entities[id])
    .filter(Boolean)
    .filter((entity) => layers[entity.layerId]?.visible !== false)
    .map((entity) => (layers[entity.layerId]?.locked ? { ...entity, locked: true } : entity))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    drawBackground(ctx, size.width, size.height)
    drawBlueprints(ctx, viewport, blueprintList, activeBlueprintId, dpr)
    drawGrid(ctx, size.width, size.height, viewport, gridSize)
    drawEntities(ctx, viewport, entityList, new Set(selectedIds), dpr)

    if (calibrationPointA && cursorWorld && calibratingBlueprintId) {
      const a = worldToScreen(calibrationPointA, viewport)
      const b = worldToScreen(cursorWorld, viewport)
      ctx.save()
      ctx.strokeStyle = '#3ecf8e'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.restore()
    }

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

    if (measureStart && cursorWorld) {
      const a = worldToScreen(measureStart, viewport)
      const b = worldToScreen(cursorWorld, viewport)
      ctx.save()
      ctx.strokeStyle = '#f2a93b'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      const label = `${distance(measureStart, cursorWorld).toFixed(0)} u`
      const midX = (a.x + b.x) / 2
      const midY = (a.y + b.y) / 2
      ctx.font = '11px monospace'
      const textWidth = ctx.measureText(label).width
      ctx.fillStyle = '#0b0e14dd'
      ctx.fillRect(midX - textWidth / 2 - 4, midY - 18, textWidth + 8, 16)
      ctx.fillStyle = '#f2a93b'
      ctx.fillText(label, midX - textWidth / 2, midY - 6)
      ctx.restore()
    }

    if (dragState.current?.mode === 'move' && (dragState.current.accumDx !== 0 || dragState.current.accumDy !== 0) && cursorWorld) {
      const screenPos = worldToScreen(cursorWorld, viewport)
      const label = `dx ${dragState.current.accumDx.toFixed(0)}  dy ${dragState.current.accumDy.toFixed(0)}`
      ctx.save()
      ctx.font = '11px monospace'
      const textWidth = ctx.measureText(label).width
      ctx.fillStyle = '#0b0e14dd'
      ctx.fillRect(screenPos.x + 12, screenPos.y - 26, textWidth + 8, 16)
      ctx.fillStyle = '#3d8bfd'
      ctx.fillText(label, screenPos.x + 16, screenPos.y - 14)
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
  }, [
    size,
    viewport,
    entities,
    entityOrder,
    layers,
    selectedIds,
    gridSize,
    drawPoints,
    cursorWorld,
    boxSelect,
    measureStart,
    blueprintList,
    activeBlueprintId,
    calibrationPointA,
    calibratingBlueprintId,
  ])

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

      // Calibration clicks preempt every tool — they target the blueprint
      // subsystem directly and never touch entity selection or drawing state.
      if (calibratingBlueprintId) {
        if (!calibrationPointA) {
          setCalibrationPointA(world)
        } else {
          setPendingCalibration({ id: calibratingBlueprintId, a: calibrationPointA, b: world })
          setCalibrationPointA(null)
          setCalibratingId(null)
        }
        return
      }

      if (activeTool === 'blueprint') {
        // Hit-test every visible blueprint, topmost first — clicking any of
        // them (not just the currently active one) selects and starts
        // dragging it, mirroring how entity selection works.
        for (let i = blueprintList.length - 1; i >= 0; i--) {
          const doc = blueprintList[i]
          if (!doc.visible || doc.locked) continue
          if (isPointOnBlueprint(doc, world)) {
            setActiveBlueprintId(doc.id)
            blueprintDragState.current = { id: doc.id, startWorld: world, accumDx: 0, accumDy: 0 }
            break
          }
        }
        return
      }

      if (activeTool === 'pan' || e.button === 1) {
        dragState.current = {
          mode: 'pan',
          startScreen: screen,
          startViewport: { x: viewport.x, y: viewport.y },
          moveIds: [],
          lastWorld: world,
          accumDx: 0,
          accumDy: 0,
          pivot: world,
          startAngle: 0,
          lastAngle: 0,
          accumAngle: 0,
        }
        return
      }

      if (activeTool === 'measure') {
        if (measureStart) {
          setMeasureStart(null)
        } else {
          setMeasureStart(world)
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
        execute(createAddIslandCommand(world))
        setActiveTool('select')
        return
      }

      if (activeTool === 'rotate') {
        const hitId = hitTestEntities(entityList, entities, world, 8 / viewport.zoom)
        if (!hitId) return
        const target = resolveClickTarget(entities, hitId)
        const baseIds = selectedIds.includes(target) ? selectedIds : [target]
        if (!selectedIds.includes(target)) setSelection([target])
        const groupIds = expandGroupIds(entities, baseIds)
        const pivot = computeCentroid(groupIds.map((id) => ({ x: entities[id].transform.x, y: entities[id].transform.y })))
        const startAngle = angleBetween(pivot, world)
        dragState.current = {
          mode: 'rotate',
          startScreen: screen,
          startViewport: { x: viewport.x, y: viewport.y },
          moveIds: groupIds,
          lastWorld: world,
          accumDx: 0,
          accumDy: 0,
          pivot,
          startAngle,
          lastAngle: startAngle,
          accumAngle: 0,
        }
        return
      }

      // Select / move tool
      const hitId = hitTestEntities(entityList, entities, world, 8 / viewport.zoom)
      if (hitId) {
        const target = resolveClickTarget(entities, hitId)
        const alreadySelected = selectedIds.includes(target)
        let baseSelection = selectedIds
        if (e.shiftKey) {
          toggleSelection(target)
          baseSelection = alreadySelected ? selectedIds.filter((id) => id !== target) : [...selectedIds, target]
        } else if (!alreadySelected) {
          setSelection([target])
          baseSelection = [target]
        }

        let moveIds = expandGroupIds(entities, baseSelection)

        if (e.altKey) {
          execute(createDuplicateEntitiesCommand(baseSelection))
          moveIds = useProjectStore.getState().selectedIds
        }

        dragState.current = {
          mode: 'move',
          startScreen: screen,
          startViewport: { x: viewport.x, y: viewport.y },
          moveIds,
          lastWorld: world,
          accumDx: 0,
          accumDy: 0,
          pivot: world,
          startAngle: 0,
          lastAngle: 0,
          accumAngle: 0,
        }
      } else {
        if (!e.shiftKey) setSelection([])
        setBoxSelect({ start: world, end: world })
      }
    },
    [
      activeTool,
      viewport,
      entityList,
      entities,
      selectedIds,
      execute,
      setActiveTool,
      setSelection,
      toggleSelection,
      getWorldPoint,
      drawPoints,
      measureStart,
      calibratingBlueprintId,
      calibrationPointA,
      blueprintList,
      setActiveBlueprintId,
      setCalibratingId,
    ],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const world = getWorldPoint(e)
      setCursorWorld(world)

      if (blueprintDragState.current) {
        const drag = blueprintDragState.current
        const dx = world.x - drag.startWorld.x - drag.accumDx
        const dy = world.y - drag.startWorld.y - drag.accumDy
        if (dx === 0 && dy === 0) return
        const doc = useBlueprintStore.getState().documents[drag.id]
        if (doc) {
          useBlueprintStore.getState()._updateDocument(drag.id, { transform: { ...doc.transform, x: doc.transform.x + dx, y: doc.transform.y + dy } })
        }
        drag.accumDx += dx
        drag.accumDy += dy
        return
      }

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

      if (dragState.current?.mode === 'rotate') {
        const currentAngle = angleBetween(dragState.current.pivot, world)
        const delta = currentAngle - dragState.current.lastAngle
        if (delta === 0) return
        const state = useProjectStore.getState()
        for (const id of dragState.current.moveIds) {
          const entity = state.entities[id]
          if (!entity) continue
          const cos = Math.cos(delta)
          const sin = Math.sin(delta)
          const dx = entity.transform.x - dragState.current.pivot.x
          const dy = entity.transform.y - dragState.current.pivot.y
          state._updateEntity(id, {
            transform: {
              ...entity.transform,
              x: dragState.current.pivot.x + dx * cos - dy * sin,
              y: dragState.current.pivot.y + dx * sin + dy * cos,
              rotation: entity.transform.rotation + delta,
            },
          })
        }
        dragState.current.lastAngle = currentAngle
        dragState.current.accumAngle += delta
        return
      }

      if (boxSelect) {
        setBoxSelect((prev) => (prev ? { ...prev, end: world } : prev))
      }
    },
    [getWorldPoint, setViewport, boxSelect],
  )

  const handlePointerUp = useCallback(() => {
    if (blueprintDragState.current) {
      const { id, accumDx, accumDy } = blueprintDragState.current
      if (accumDx !== 0 || accumDy !== 0) {
        const doc = useBlueprintStore.getState().documents[id]
        if (doc) {
          useBlueprintStore.getState()._updateDocument(id, { transform: { ...doc.transform, x: doc.transform.x - accumDx, y: doc.transform.y - accumDy } })
          executeBlueprintCommand(createMoveBlueprintCommand(id, accumDx, accumDy))
        }
      }
      blueprintDragState.current = null
      return
    }

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

    if (dragState.current?.mode === 'rotate' && dragState.current.accumAngle !== 0) {
      const { moveIds, pivot, accumAngle } = dragState.current
      const state = useProjectStore.getState()
      for (const id of moveIds) {
        const entity = state.entities[id]
        if (!entity) continue
        const cos = Math.cos(-accumAngle)
        const sin = Math.sin(-accumAngle)
        const dx = entity.transform.x - pivot.x
        const dy = entity.transform.y - pivot.y
        state._updateEntity(id, {
          transform: {
            ...entity.transform,
            x: pivot.x + dx * cos - dy * sin,
            y: pivot.y + dx * sin + dy * cos,
            rotation: entity.transform.rotation - accumAngle,
          },
        })
      }
      execute(createRotateGroupCommand(moveIds, pivot, accumAngle, moveIds.length > 1 ? `Rotar ${moveIds.length} objetos` : 'Rotar objeto'))
    }

    dragState.current = null

    if (boxSelect) {
      const minX = Math.min(boxSelect.start.x, boxSelect.end.x)
      const maxX = Math.max(boxSelect.start.x, boxSelect.end.x)
      const minY = Math.min(boxSelect.start.y, boxSelect.end.y)
      const maxY = Math.max(boxSelect.start.y, boxSelect.end.y)
      if (distance(boxSelect.start, boxSelect.end) > 2) {
        const ids = entitiesInBox(entityList, entities, { minX, minY, maxX, maxY })
        setSelection(ids)
      }
      setBoxSelect(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxSelect, entityList, entities, layers, execute, setSelection])

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
      const mod = e.ctrlKey || e.metaKey

      if (e.key === 'Escape') {
        setDrawPoints([])
        setMeasureStart(null)
        setCalibrationPointA(null)
        setCalibratingId(null)
        setPendingCalibration(null)
        blueprintDragState.current = null
        setActiveTool('select')
        setSelection([])
      } else if (e.key === 'Enter' && POLYLINE_TOOLS.has(activeTool)) {
        finishPolyline(drawPoints)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        execute(createDeleteEntitiesCommand(expandGroupIds(entities, selectedIds)))
        setSelection([])
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) requestRedo()
        else requestUndo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        requestRedo()
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        if (selectedIds.length > 0) execute(createDuplicateEntitiesCommand(selectedIds))
      } else if (mod && e.key.toLowerCase() === 'c') {
        if (selectedIds.length > 0) {
          const ids = expandGroupIds(entities, selectedIds)
          setClipboard(ids.map((id) => entities[id]).filter(Boolean))
        }
      } else if (mod && e.key.toLowerCase() === 'x') {
        if (selectedIds.length > 0) {
          const ids = expandGroupIds(entities, selectedIds)
          setClipboard(ids.map((id) => entities[id]).filter(Boolean))
          execute(createDeleteEntitiesCommand(ids))
          setSelection([])
        }
      } else if (mod && e.key.toLowerCase() === 'v') {
        if (hasClipboard()) {
          const { dx, dy } = nextPasteOffset()
          execute(createPasteEntitiesCommand(getClipboard(), dx, dy))
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTool, drawPoints, selectedIds, entities, execute, setActiveTool, setSelection, finishPolyline, requestUndo, requestRedo, setCalibratingId])

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
      {calibratingBlueprintId && !pendingCalibration && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded bg-surface-900/90 px-3 py-1.5 text-xs text-ok">
          {calibrationPointA ? 'Hacé clic en el segundo punto' : 'Hacé clic en el primer punto conocido'} · Esc para cancelar
        </div>
      )}
      {pendingCalibration && (
        <CalibrationPrompt
          onCancel={() => setPendingCalibration(null)}
          onApply={(knownDistance) => {
            executeBlueprintCommand(createCalibrateBlueprintCommand(pendingCalibration.id, pendingCalibration.a, pendingCalibration.b, knownDistance))
            setPendingCalibration(null)
          }}
        />
      )}
    </div>
  )
}

function CalibrationPrompt({ onApply, onCancel }: { onApply: (distance: number) => void; onCancel: () => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded border border-border bg-surface-900 px-3 py-2 shadow-xl">
      <span className="text-xs text-text-secondary">Distancia real (unidades):</span>
      <input
        autoFocus
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && Number(value) > 0) onApply(Number(value))
          if (e.key === 'Escape') onCancel()
        }}
        className="w-24 rounded border border-border bg-surface-800 px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
      />
      <button
        onClick={() => Number(value) > 0 && onApply(Number(value))}
        className="rounded bg-accent px-2 py-1 text-xs text-white hover:bg-accent-dim"
      >
        Aplicar
      </button>
      <button onClick={onCancel} className="rounded px-2 py-1 text-xs text-text-secondary hover:text-text-primary">
        Cancelar
      </button>
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
