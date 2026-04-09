import { useCallback } from 'react'
import { ReactFlow, Background, Controls, useReactFlow, MarkerType, ConnectionMode, type Edge, type Connection } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from '../NodeTypes'
import { edgeTypes } from '../EdgeTypes'
import { componentTypeLabels, type ComponentType } from '../../types/graph'
import { useGraphState } from '../../hooks/useGraphState'

const isValidConnection = (connection: Edge | Connection) =>
  connection.source !== connection.target

interface CanvasProps {
  graphState: ReturnType<typeof useGraphState>
  onEdgeClick?: (event: React.MouseEvent, edge: { id: string; data?: Record<string, unknown> }) => void
}

export function Canvas({ graphState, onEdgeClick }: CanvasProps) {
  const { screenToFlowPosition } = useReactFlow()
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
  } = graphState

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const rawType = event.dataTransfer.getData('application/reactflow')
      if (!(rawType in componentTypeLabels)) return

      const type = rawType as ComponentType
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode(type, position, componentTypeLabels[type])
    },
    [screenToFlowPosition, addNode],
  )

  return (
    <div style={{ flex: 1, height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'labeled', markerEnd: { type: MarkerType.ArrowClosed } }}
        connectionMode={ConnectionMode.Loose}
        isValidConnection={isValidConnection}
        deleteKeyCode={['Backspace', 'Delete']}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onEdgeClick={onEdgeClick}
        defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
