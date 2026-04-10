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

/** Generate a unique name by appending "(2)", "(3)", etc. if needed. */
function uniqueName(desired: string, existingNames: Set<string>): string {
  if (!existingNames.has(desired)) return desired
  let i = 2
  while (existingNames.has(`${desired} (${String(i)})`)) i++
  return `${desired} (${String(i)})`
}

/** Check if an edge with the same (source, target, protocol, direction) already exists. */
function edgeExists(
  edges: ArchitectureEdge[],
  source: string,
  target: string,
  protocol: string | undefined,
  direction: string | undefined,
): boolean {
  return edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      (e.data?.protocol ?? undefined) === protocol &&
      (e.data?.direction ?? 'oneWay') === (direction ?? 'oneWay'),
  )
}

export function useGraphState() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ArchitectureNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<ArchitectureEdge>([])

  const addNode = useCallback(
    (type: ComponentType, position: { x: number; y: number }, label: string) => {
      setNodes((ns) => {
        const existingNames = new Set(ns.map((n) => n.data.label))
        const name = uniqueName(label, existingNames)
        const newNode: ArchitectureNode = {
          id: crypto.randomUUID(),
          type,
          position,
          data: { label: name },
        }
        return [...ns, newNode]
      })
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
      setEdges((es) => {
        // Block duplicate edges (same source, target, protocol, direction)
        if (edgeExists(es, newEdge.source, newEdge.target, undefined, 'oneWay')) {
          return es
        }
        return addEdge(newEdge, es)
      })
    },
    [setEdges],
  )

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<ArchitectureNodeData>) => {
      setNodes((ns) => {
        // If renaming, block if name already taken by another node
        if (data.label !== undefined) {
          const otherNames = new Set(ns.filter((n) => n.id !== nodeId).map((n) => n.data.label))
          if (otherNames.has(data.label)) return ns
        }
        return ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      })
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
      setEdges((es) => {
        const edge = es.find((e) => e.id === edgeId)
        if (!edge) return es
        // Block if changing protocol would create a duplicate
        const newDirection = edge.data?.direction ?? 'oneWay'
        if (edgeExists(
          es.filter((e) => e.id !== edgeId),
          edge.source, edge.target, protocol, newDirection,
        )) return es
        return es.map((e) => {
          if (e.id !== edgeId) return e
          const data: ArchitectureEdgeData = { ...e.data, label, protocol, syncAsync: sa }
          return { ...e, data } as ArchitectureEdge
        })
      })
    },
    [setEdges],
  )

  const toggleEdgeDirection = useCallback(
    (edgeId: string) => {
      setEdges((es) => {
        const edge = es.find((e) => e.id === edgeId)
        if (!edge) return es
        const current = edge.data?.direction ?? 'oneWay'
        const next: EdgeDirection = current === 'oneWay' ? 'bidirectional' : 'oneWay'
        // Block if toggling direction would create a duplicate
        if (edgeExists(
          es.filter((e) => e.id !== edgeId),
          edge.source, edge.target, edge.data?.protocol, next,
        )) return es
        return es.map((e) => {
          if (e.id !== edgeId) return e
          const data: ArchitectureEdgeData = { ...e.data, label: e.data?.label ?? '', direction: next }
          return {
            ...e,
            data,
            markerEnd: { type: MarkerType.ArrowClosed },
            markerStart: next === 'bidirectional' ? { type: MarkerType.ArrowClosed } : undefined,
          } as ArchitectureEdge
        })
      })
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

  const loadExample = useCallback(
    (newNodes: ArchitectureNode[], newEdges: ArchitectureEdge[]) => {
      setNodes(newNodes)
      setEdges(newEdges)
    },
    [setNodes, setEdges],
  )

  const onNodesDelete: OnNodesDelete = useCallback(() => {}, [])
  const onEdgesDelete: OnEdgesDelete = useCallback(() => {}, [])

  const graphState = useMemo(() => serializeGraph(nodes, edges), [nodes, edges])

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodesDelete,
    onEdgesDelete,
    addNode,
    updateNodeData,
    updateEdgeData,
    loadExample,
    updateEdgeProtocol,
    toggleEdgeDirection,
    reverseEdge,
    toggleSyncAsync,
    graphState,
  }
}
