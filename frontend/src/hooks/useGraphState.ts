import { useCallback, useMemo } from 'react'
import {
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Connection,
  type OnConnect,
  type OnNodesDelete,
  type OnEdgesDelete,
} from '@xyflow/react'
import type {
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureNodeData,
  ArchitectureEdgeData,
  ComponentType,
  EdgeProtocol,
  EdgeDirection,
  SyncAsync,
} from '../types/graph'
import { getProtocolDefault } from '../types/graph'
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
        data: { label: '', direction: 'oneWay', syncAsync: 'sync' },
        markerEnd: { type: MarkerType.ArrowClosed },
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

  const updateEdgeData = useCallback(
    (edgeId: string, update: Partial<ArchitectureEdgeData>) => {
      setEdges((es) =>
        es.map((e) => {
          if (e.id !== edgeId) return e
          const data: ArchitectureEdgeData = { ...e.data, label: e.data?.label ?? '', ...update }
          return { ...e, data } as ArchitectureEdge
        }),
      )
    },
    [setEdges],
  )

  const updateEdgeProtocol = useCallback(
    (edgeId: string, protocol: EdgeProtocol, label: string, syncAsync?: SyncAsync) => {
      const sa = syncAsync ?? getProtocolDefault(protocol)
      setEdges((es) =>
        es.map((e) => {
          if (e.id !== edgeId) return e
          const data: ArchitectureEdgeData = { ...e.data, label, protocol, syncAsync: sa }
          return { ...e, data } as ArchitectureEdge
        }),
      )
    },
    [setEdges],
  )

  const toggleEdgeDirection = useCallback(
    (edgeId: string) => {
      setEdges((es) =>
        es.map((e) => {
          if (e.id !== edgeId) return e
          const current = e.data?.direction ?? 'oneWay'
          const next: EdgeDirection = current === 'oneWay' ? 'bidirectional' : 'oneWay'
          const data: ArchitectureEdgeData = { ...e.data, label: e.data?.label ?? '', direction: next }
          return {
            ...e,
            data,
            markerEnd: { type: MarkerType.ArrowClosed },
            markerStart: next === 'bidirectional' ? { type: MarkerType.ArrowClosed } : undefined,
          } as ArchitectureEdge
        }),
      )
    },
    [setEdges],
  )

  const reverseEdge = useCallback(
    (edgeId: string) => {
      setEdges((es) =>
        es.map((e) => {
          if (e.id !== edgeId) return e
          return {
            ...e,
            source: e.target,
            target: e.source,
            sourceHandle: e.targetHandle,
            targetHandle: e.sourceHandle,
          }
        }),
      )
    },
    [setEdges],
  )

  const toggleSyncAsync = useCallback(
    (edgeId: string) => {
      setEdges((es) =>
        es.map((e) => {
          if (e.id !== edgeId) return e
          const current = e.data?.syncAsync ?? 'sync'
          const next: SyncAsync = current === 'sync' ? 'async' : 'sync'
          const data: ArchitectureEdgeData = { ...e.data, label: e.data?.label ?? '', syncAsync: next }
          return { ...e, data } as ArchitectureEdge
        }),
      )
    },
    [setEdges],
  )

  const onNodesDelete: OnNodesDelete = useCallback(() => {}, [])
  const onEdgesDelete: OnEdgesDelete = useCallback(() => {}, [])

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
    updateEdgeData,
    updateEdgeProtocol,
    toggleEdgeDirection,
    reverseEdge,
    toggleSyncAsync,
    graphState,
  }
}
