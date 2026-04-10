import { useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useReactFlow,
  MarkerType,
  ConnectionMode,
  reconnectEdge,
  type Edge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { nodeTypes } from '../NodeTypes'
import { edgeTypes } from '../EdgeTypes'
import { componentTypeLabels, type ComponentType, type ArchitectureEdge } from '../../types/graph'
import { useGraphState } from '../../hooks/useGraphState'

const isValidConnection = (connection: Edge | Connection) =>
  connection.source !== connection.target

interface CanvasProps {
  graphState: ReturnType<typeof useGraphState>
  onEdgeClick?: (event: React.MouseEvent, edge: { id: string; data?: Record<string, unknown> }) => void
  onPaneClick?: () => void
}

export function Canvas({ graphState, onEdgeClick, onPaneClick }: CanvasProps) {
  const { screenToFlowPosition } = useReactFlow()
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setEdges,
    addNode,
  } = graphState

  // Edge reconnection: track the old edge being reconnected
  const edgeReconnectSuccessful = useRef(true)

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false
  }, [])

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els) as ArchitectureEdge[])
    },
    [setEdges],
  )

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        // If reconnection was dropped in empty space, delete the edge
        setEdges((eds) => eds.filter((e) => e.id !== edge.id))
      }
      edgeReconnectSuccessful.current = true
    },
    [setEdges],
  )

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
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'labeled', markerEnd: { type: MarkerType.ArrowClosed } }}
        connectionMode={ConnectionMode.Loose}
        isValidConnection={isValidConnection}
        deleteKeyCode={['Backspace', 'Delete']}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
