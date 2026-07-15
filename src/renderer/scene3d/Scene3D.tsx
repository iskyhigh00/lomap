import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { useProjectStore } from '@store/projectStore'
import { useBlueprintStore } from '@blueprint/blueprintStore'
import { SceneEntities } from './SceneEntities'
import { BlueprintFloor } from './BlueprintFloor'
import { CameraRig, type CameraMode } from './CameraRig'
import { useSceneBounds } from './useSceneBounds'

/**
 * The synced 3D view. Reads `entities`/`selectedIds` from the exact same
 * `useProjectStore` the 2D `<Canvas2D>` reads — there is no second data
 * model, no separate "3D project state", and no conversion step beyond the
 * one-way `worldToScene` coordinate mapping (`coords.ts`). Selecting an
 * object here calls the same `setSelection` action a 2D click does, so the
 * properties panel (already mounted alongside whichever view is active,
 * see `App.tsx`) is a shared inspector for free.
 *
 * Performance posture per the Fase 6 brief: no shadows, no postprocessing,
 * `meshStandardMaterial`/`meshBasicMaterial` only, and machines (the
 * numerically dominant entity type) are instanced (`MachineInstances.tsx`)
 * rather than one mesh each.
 */
export function Scene3D() {
  const entityOrder = useProjectStore((s) => s.entityOrder)
  const entities = useProjectStore((s) => s.entities)
  const layers = useProjectStore((s) => s.layers)
  const selectedIds = useProjectStore((s) => s.selectedIds)
  const setSelection = useProjectStore((s) => s.setSelection)

  const blueprintDocs = useBlueprintStore((s) => s.documents)
  const blueprintOrder = useBlueprintStore((s) => s.order)

  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit')
  const [showBlueprint, setShowBlueprint] = useState(false)
  const [frameSignal, setFrameSignal] = useState(0)

  const entityList = entityOrder
    .map((id) => entities[id])
    .filter(Boolean)
    .filter((entity) => layers[entity.layerId]?.visible !== false)

  const selectedSet = new Set(selectedIds)
  const bounds = useSceneBounds(entityList, entities)
  const blueprintList = blueprintOrder.map((id) => blueprintDocs[id]).filter(Boolean)

  return (
    <div className="relative h-full w-full">
      <Canvas
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        shadows={false}
        dpr={[1, 1.5]}
        camera={{ fov: 55, near: 1, far: 100000 }}
        onPointerMissed={() => setSelection([])}
      >
        <color attach="background" args={['#0b0e14']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[400, 800, 200]} intensity={0.8} />

        <Grid
          args={[1, 1]}
          cellSize={50}
          cellThickness={0.5}
          cellColor="#2a3340"
          sectionSize={500}
          sectionThickness={1}
          sectionColor="#3a4553"
          infiniteGrid
          fadeDistance={8000}
          fadeStrength={1.5}
        />

        {showBlueprint && <BlueprintFloor documents={blueprintList} />}

        <Suspense fallback={null}>
          <SceneEntities entities={entityList} selectedIds={selectedSet} onSelect={(id) => setSelection([id])} />
        </Suspense>

        <CameraRig mode={cameraMode} bounds={bounds} frameSignal={frameSignal} />
      </Canvas>

      <div className="absolute left-3 top-3 flex gap-1.5 rounded border border-border bg-surface-900/90 p-1.5 text-xs backdrop-blur">
        <button
          onClick={() => setCameraMode('orbit')}
          className={`rounded px-2 py-1 ${cameraMode === 'orbit' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-700'}`}
        >
          Órbita
        </button>
        <button
          onClick={() => setCameraMode('walk')}
          className={`rounded px-2 py-1 ${cameraMode === 'walk' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-700'}`}
          title="Clic en la escena para activar el control de mouse (Esc para salir)"
        >
          Caminar
        </button>
        <div className="mx-1 w-px bg-border" />
        <button
          onClick={() => setFrameSignal((n) => n + 1)}
          className="rounded px-2 py-1 text-text-secondary hover:bg-surface-700"
          title="Encuadrar toda la escena"
        >
          Encuadre
        </button>
        <button
          onClick={() => setShowBlueprint((v) => !v)}
          disabled={blueprintList.length === 0}
          className={`rounded px-2 py-1 disabled:opacity-30 ${showBlueprint ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-700'}`}
        >
          Plano
        </button>
      </div>

      {cameraMode === 'walk' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded border border-border bg-surface-900/90 px-3 py-1.5 text-[11px] text-text-secondary backdrop-blur">
          Clic para activar el mouse · WASD para moverte · Esc para salir
        </div>
      )}
    </div>
  )
}
