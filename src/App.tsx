import { Suspense, lazy } from 'react'
import { TopBar } from '@components/shell/TopBar'
import { LeftToolbar } from '@components/shell/LeftToolbar'
import { LeftDock } from '@components/shell/LeftDock'
import { Canvas2D } from '@components/canvas/Canvas2D'
import { PropertiesPanel } from '@panels/PropertiesPanel'
import { useAutosave } from '@hooks/useAutosave'
import { useBlueprintSync } from '@blueprint/useBlueprintSync'
import { useProjectStore } from '@store/projectStore'

// Three.js/R3F/drei add ~950kB minified — code-split so a session that never
// opens the 3D view never pays for it (the 2D editor is the primary,
// always-used workflow; see ARCHITECTURE.md §1).
const Scene3D = lazy(() => import('@renderer/scene3d/Scene3D').then((m) => ({ default: m.Scene3D })))

function App() {
  useAutosave()
  const projectId = useProjectStore((s) => s.projectId)
  useBlueprintSync(projectId)
  const viewMode = useProjectStore((s) => s.viewMode)

  return (
    <div className="flex h-screen w-screen flex-col bg-surface-950 text-text-primary">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftToolbar />
        <LeftDock />
        <main className="relative min-w-0 flex-1">
          {/* Canvas2D stays mounted (not unmounted) across a 2D/3D toggle so
              its pan/zoom/tool-in-progress state survives switching back —
              only visibility changes. Scene3D is cheap to remount (it
              auto-frames on mount anyway), so it only exists while active. */}
          <div className={viewMode === '2d' ? 'h-full w-full' : 'hidden'}>
            <Canvas2D />
          </div>
          {viewMode === '3d' && (
            <div className="h-full w-full">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-text-muted">Cargando vista 3D…</div>}>
                <Scene3D />
              </Suspense>
            </div>
          )}
        </main>
        <PropertiesPanel />
      </div>
    </div>
  )
}

export default App
