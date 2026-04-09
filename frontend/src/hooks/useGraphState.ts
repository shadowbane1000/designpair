import { useCallback, useMemo } from 'react'
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type OnConnect,
  type OnNodesDelete,
  type OnEdgesDelete,
} from '@xyflow/react'
import type {
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureNodeData,
  ComponentType,
} from '../types/graph'
import { serializeGraph } from '../services/graphSerializer'

export function useGraphState() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<ArchitectureEdge>([])

  const addNode = useCallback(
    (type: ComponentType, position: { x: number; y: number }, label: string) => {
      const newNode: ArchitectureNode = {
        id: crypto.randomUUID(),
        type,
        position,
        data: { label },
      }
      setNodes((ns) => [...ns, newNode])
    },
    [setNodes],
  )

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: ArchitectureEdge = {
        ...connection,
        id: crypto.randomUUID(),
        type: 'labeled',
        data: { label: '' },
      } as ArchitectureEdge
      setEdges((es) => addEdge(newEdge, es))
    },
    [setEdges],
  )

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<ArchitectureNodeData>) => {
      setNodes((ns) =>
        ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      )
    },
    [setNodes],
  )

  const updateEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      setEdges((es) =>
        es.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, label } } : e)),
      )
    },
    [setEdges],
  )

  const onNodesDelete: OnNodesDelete = useCallback(() => {
    // React Flow handles edge cascade automatically
  }, [])

  const onEdgesDelete: OnEdgesDelete = useCallback(() => {
    // Default behavior is sufficient
  }, [])

  const graphState = useMemo(() => serializeGraph(nodes, edges), [nodes, edges])

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodesDelete,
    onEdgesDelete,
    addNode,
    updateNodeData,
    updateEdgeLabel,
    graphState,
  }
}
