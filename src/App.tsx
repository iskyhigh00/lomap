import { TopBar } from '@components/shell/TopBar'
import { LeftToolbar } from '@components/shell/LeftToolbar'
import { Canvas2D } from '@components/canvas/Canvas2D'
import { PropertiesPanel } from '@panels/PropertiesPanel'
import { LayersPanel } from '@panels/LayersPanel'
import { useAutosave } from '@hooks/useAutosave'

function App() {
  useAutosave()

  return (
    <div className="flex h-screen w-screen flex-col bg-surface-950 text-text-primary">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftToolbar />
        <LayersPanel />
        <main className="min-w-0 flex-1">
          <Canvas2D />
        </main>
        <PropertiesPanel />
      </div>
    </div>
  )
}

export default App
