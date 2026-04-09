import { ReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export function Canvas() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={[]}
        edges={[]}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
