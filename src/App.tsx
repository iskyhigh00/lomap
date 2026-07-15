import { TopBar } from '@components/shell/TopBar'
import { LeftToolbar } from '@components/shell/LeftToolbar'
import { LeftDock } from '@components/shell/LeftDock'
import { Canvas2D } from '@components/canvas/Canvas2D'
import { PropertiesPanel } from '@panels/PropertiesPanel'
import { useAutosave } from '@hooks/useAutosave'
import { useBlueprintSync } from '@blueprint/useBlueprintSync'
import { useProjectStore } from '@store/projectStore'

function App() {
  useAutosave()
  const projectId = useProjectStore((s) => s.projectId)
  useBlueprintSync(projectId)

  return (
    <div className="flex h-screen w-screen flex-col bg-surface-950 text-text-primary">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftToolbar />
        <LeftDock />
        <main className="min-w-0 flex-1">
          <Canvas2D />
        </main>
        <PropertiesPanel />
      </div>
    </div>
  )
}

export default App
