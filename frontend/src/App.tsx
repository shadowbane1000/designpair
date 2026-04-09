import { ReactFlowProvider } from '@xyflow/react'
import { Canvas } from './components/Canvas/Canvas'
import { Palette } from './components/Palette/Palette'
import { DebugPanel } from './components/DebugPanel/DebugPanel'
import { useGraphState } from './hooks/useGraphState'

function AppContent() {
  const graphState = useGraphState()

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Palette />
      <Canvas graphState={graphState} />
      <DebugPanel graphState={graphState.graphState} />
    </div>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <AppContent />
    </ReactFlowProvider>
  )
}

export default App
