import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ArchitectureNode,
  ArchitectureEdge,
  ComponentType,
  EdgeProtocol,
  EdgeDirection,
  SyncAsync,
} from '../types/graph'
import { MarkerType } from '@xyflow/react'
import type {
  SuggestionSet,
  NodeModification,
  EdgeModification,
} from '../types/suggestions'
import { emptySuggestionSet, hasPendingSuggestions } from '../types/suggestions'

// --- Edge identity helper ---
function edgeIdentity(source: string, target: string, protocol?: string, direction?: string): string {
  return `${source}|${target}|${protocol ?? ''}|${direction ?? 'oneWay'}`
}

// --- Tool param types ---
interface AddNodeParams {
  type: ComponentType
  name: string
  position?: { x: number; y: number }
}

interface DeleteNodeParams {
  name: string
}

interface ModifyNodeParams {
  name: string
  new_name?: string
  replica_count?: number
}

interface AddEdgeParams {
  source: string
  target: string
  protocol?: EdgeProtocol
  direction?: EdgeDirection
  sync_async?: SyncAsync
}

interface DeleteEdgeParams {
  source: string
  target: string
  protocol?: string
  direction?: string
}

interface ModifyEdgeParams {
  source: string
  target: string
  protocol?: string
  direction?: string
  new_protocol?: string
  new_direction?: EdgeDirection
  new_sync_async?: SyncAsync
}

interface SetNodesFunc {
  (updater: (nodes: ArchitectureNode[]) => ArchitectureNode[]): void
}
interface SetEdgesFunc {
  (updater: (edges: ArchitectureEdge[]) => ArchitectureEdge[]): void
}

/**
 * useSuggestions manages the pending suggestion overlay.
 *
 * Rather than maintaining a separate overlay and computing merged display lists,
 * this hook injects pending nodes/edges directly into the React Flow state
 * (with pendingStatus set). This avoids the controlled-state conflict where
 * React Flow's onNodesChange would overwrite merged nodes.
 *
 * The SuggestionSet is still tracked for approve/discard operations.
 */
export function useSuggestions(
  setNodes: SetNodesFunc,
  setEdges: SetEdgesFunc,
  nodesRef: React.RefObject<ArchitectureNode[]>,
  edgesRef: React.RefObject<ArchitectureEdge[]>,
) {
  const [suggestions, setSuggestions] = useState<SuggestionSet>(emptySuggestionSet)
  const suggestionsRef = useRef(suggestions)
  useEffect(() => { suggestionsRef.current = suggestions }, [suggestions])

  // Snapshot of committed state (before any suggestions were applied).
  // Updated only on approve/discard, NOT when suggestions are applied to React Flow.
  const committedNodesRef = useRef<ArchitectureNode[]>([])
  const committedEdgesRef = useRef<ArchitectureEdge[]>([])
  const hasSnapshotRef = useRef(false)

  const hasPending = useMemo(() => hasPendingSuggestions(suggestions), [suggestions])

  // --- Add suggestion dispatcher ---
  const addSuggestion = useCallback(
    (tool: string, params: Record<string, unknown>) => {
      // On first suggestion, snapshot the current committed state
      if (!hasSnapshotRef.current) {
        committedNodesRef.current = nodesRef.current
        committedEdgesRef.current = edgesRef.current
        hasSnapshotRef.current = true
      }
      const committedNodes = committedNodesRef.current
      const committedEdges = committedEdgesRef.current
      const currentNodes = nodesRef.current

      setSuggestions((prev) => {
        const next = structuredClone(prev)

        let result: SuggestionSet
        switch (tool) {
          case 'add_node':
            result = handleAddNode(next, params as unknown as AddNodeParams, committedNodes)
            break
          case 'delete_node':
            result = handleDeleteNode(next, params as unknown as DeleteNodeParams, committedNodes, committedEdges)
            break
          case 'modify_node':
            result = handleModifyNode(next, params as unknown as ModifyNodeParams, committedNodes)
            break
          case 'add_edge':
            result = handleAddEdge(next, params as unknown as AddEdgeParams, committedNodes, committedEdges, currentNodes)
            break
          case 'delete_edge':
            result = handleDeleteEdge(next, params as unknown as DeleteEdgeParams, committedNodes, committedEdges, currentNodes)
            break
          case 'modify_edge':
            result = handleModifyEdge(next, params as unknown as ModifyEdgeParams, committedNodes, committedEdges, currentNodes)
            break
          default:
            return prev
        }

        // Apply the updated suggestion set to React Flow state
        applyToReactFlow(result, committedNodes, committedEdges, setNodes, setEdges)
        return result
      })
    },
    [nodesRef, edgesRef, setNodes, setEdges],
  )

  const discardAll = useCallback(() => {
    // Apply empty suggestion set to clear all pending visual states
    applyToReactFlow(
      emptySuggestionSet(),
      committedNodesRef.current,
      committedEdgesRef.current,
      setNodes,
      setEdges,
    )
    setSuggestions(emptySuggestionSet())
    hasSnapshotRef.current = false
  }, [setNodes, setEdges])

  const approveAll = useCallback(() => {
    // Strip pending status from all nodes/edges, making them committed
    // Also remove nodes/edges that were pending-delete
    setNodes((ns) => {
      const approved = ns
        .filter((n) => n.data.pendingStatus !== 'pendingDelete')
        .map((n) => ({
          ...n,
          data: { ...n.data, pendingStatus: undefined, pendingOldValues: undefined },
        }))
      committedNodesRef.current = approved
      return approved
    })
    setEdges((es) => {
      const approved = es
        .filter((e) => e.data?.pendingStatus !== 'pendingDelete')
        .map((e) => {
          if (!e.data) return e
          return {
            ...e,
            data: { ...e.data, pendingStatus: undefined, pendingOldValues: undefined },
          } as ArchitectureEdge
        })
      committedEdgesRef.current = approved
      return approved
    })
    setSuggestions(emptySuggestionSet())
    hasSnapshotRef.current = false
  }, [setNodes, setEdges])

  return {
    suggestions,
    hasPending,
    addSuggestion,
    approveAll,
    discardAll,
  }
}

/**
 * Apply the suggestion set to React Flow nodes/edges.
 *
 * Works incrementally from the CURRENT React Flow state (via setNodes/setEdges updater),
 * not from a static snapshot. This preserves nodes/edges the user added after
 * suggestions started (e.g., dragging a new node onto the canvas).
 *
 * For each current node/edge:
 * - If it's a committed node in the snapshot → apply pending status from suggestions
 * - If it was a previous pending-add → remove it (will be re-added from the set)
 * - If it's a user-added node not in the snapshot → keep as-is
 */
function applyToReactFlow(
  set: SuggestionSet,
  committedNodes: ArchitectureNode[],
  committedEdges: ArchitectureEdge[],
  setNodes: SetNodesFunc,
  setEdges: SetEdgesFunc,
) {
  setNodes((currentNodes) => {
    const result: ArchitectureNode[] = []

    for (const node of currentNodes) {
      // Remove previous pending-adds — they'll be re-added from the current set below
      if (node.data.pendingStatus === 'pendingAdd') continue

      const committedNode = committedNodes.find((n) => n.id === node.id)

      if (!committedNode) {
        // User-added node after snapshot — keep it, strip any stale pending status
        result.push({ ...node, data: { ...node.data, pendingStatus: undefined, pendingOldValues: undefined } })
        continue
      }

      // Apply pending operations from the suggestion set
      const isDeleted = set.deletions.nodeIds.includes(node.id)
      const modification = set.modifications.nodes.find((m) => m.nodeId === node.id)

      if (isDeleted) {
        result.push({
          ...node,
          data: { ...committedNode.data, pendingStatus: 'pendingDelete' },
        })
      } else if (modification) {
        result.push({
          ...node,
          data: {
            ...committedNode.data,
            label: modification.newValues.name ?? committedNode.data.label,
            replicaCount: modification.newValues.replicaCount ?? committedNode.data.replicaCount,
            pendingStatus: 'pendingModify',
            pendingOldValues: modification.oldValues,
          },
        })
      } else {
        // Restore to committed data (clear any previous pending status), keep position
        result.push({ ...node, data: { ...committedNode.data, pendingStatus: undefined, pendingOldValues: undefined } })
      }
    }

    // Add pending-add nodes that aren't already in the result
    for (const pn of set.additions.nodes) {
      result.push({
        id: pn.id,
        type: pn.type,
        position: pn.position,
        data: { label: pn.name, replicaCount: pn.replicaCount, pendingStatus: 'pendingAdd' },
      })
    }

    return result
  })

  setEdges((currentEdges) => {
    const result: ArchitectureEdge[] = []

    for (const edge of currentEdges) {
      if (edge.data?.pendingStatus === 'pendingAdd') continue

      const committedEdge = committedEdges.find((e) => e.id === edge.id)

      if (!committedEdge) {
        // User-added edge after snapshot — keep it
        if (edge.data) {
          result.push({ ...edge, data: { ...edge.data, pendingStatus: undefined, pendingOldValues: undefined } } as ArchitectureEdge)
        } else {
          result.push(edge)
        }
        continue
      }

      const isDeleted = set.deletions.edgeIds.includes(edge.id)
      const modification = set.modifications.edges.find((m) => m.edgeId === edge.id)

      if (isDeleted) {
        result.push({
          ...edge,
          data: { ...committedEdge.data, label: committedEdge.data?.label ?? '', pendingStatus: 'pendingDelete' },
        } as ArchitectureEdge)
      } else if (modification) {
        result.push({
          ...edge,
          data: {
            ...committedEdge.data,
            label: committedEdge.data?.label ?? '',
            protocol: (modification.newValues.protocol ?? committedEdge.data?.protocol) as EdgeProtocol | undefined,
            direction: (modification.newValues.direction ?? committedEdge.data?.direction) as EdgeDirection | undefined,
            syncAsync: (modification.newValues.syncAsync ?? committedEdge.data?.syncAsync) as SyncAsync | undefined,
            pendingStatus: 'pendingModify',
            pendingOldValues: modification.oldValues,
          },
        } as ArchitectureEdge)
      } else {
        // Restore to committed data
        result.push(edge.data ? { ...edge, data: { ...edge.data, pendingStatus: undefined, pendingOldValues: undefined } } as ArchitectureEdge : edge)
      }
    }

    for (const pe of set.additions.edges) {
      const direction = pe.direction ?? 'oneWay'
      result.push({
        id: pe.id,
        source: pe.source,
        target: pe.target,
        type: 'labeled',
        data: {
          label: pe.label || pe.protocol || '',
          protocol: pe.protocol,
          direction,
          syncAsync: pe.syncAsync,
          pendingStatus: 'pendingAdd',
        },
        markerEnd: { type: MarkerType.ArrowClosed },
        markerStart: direction === 'bidirectional' ? { type: MarkerType.ArrowClosed } : undefined,
      } as ArchitectureEdge)
    }

    return result
  })
}

// --- Flattening handlers ---

function handleAddNode(
  set: SuggestionSet,
  params: AddNodeParams,
  committedNodes: ArchitectureNode[],
): SuggestionSet {
  const committed = committedNodes.find((n) => n.data.label === params.name)

  if (committed && set.deletions.nodeIds.includes(committed.id)) {
    set.deletions.nodeIds = set.deletions.nodeIds.filter((id) => id !== committed.id)
    return set
  }

  const existingIdx = set.additions.nodes.findIndex((n) => n.name === params.name)
  const existing = set.additions.nodes[existingIdx]
  if (existingIdx >= 0 && existing) {
    set.additions.nodes[existingIdx] = {
      ...existing,
      type: params.type,
      position: params.position ?? existing.position,
    }
    return set
  }

  set.additions.nodes.push({
    id: crypto.randomUUID(),
    type: params.type,
    name: params.name,
    position: params.position ?? autoPosition(committedNodes, set),
    replicaCount: undefined,
  })

  return set
}

function handleDeleteNode(
  set: SuggestionSet,
  params: DeleteNodeParams,
  committedNodes: ArchitectureNode[],
  committedEdges: ArchitectureEdge[],
): SuggestionSet {
  const pendingIdx = set.additions.nodes.findIndex((n) => n.name === params.name)
  const pendingNode = set.additions.nodes[pendingIdx]
  if (pendingIdx >= 0 && pendingNode) {
    set.additions.nodes.splice(pendingIdx, 1)
    set.additions.edges = set.additions.edges.filter(
      (e) => e.source !== pendingNode.id && e.target !== pendingNode.id,
    )
    set.modifications.nodes = set.modifications.nodes.filter((m) => m.nodeId !== pendingNode.id)
    return set
  }

  let committed = committedNodes.find((n) => n.data.label === params.name)
  if (!committed) {
    // Check if referenced by pending-renamed name
    const renamedMod = set.modifications.nodes.find((m) => m.newValues.name === params.name)
    if (renamedMod) committed = committedNodes.find((n) => n.id === renamedMod.nodeId)
  }
  if (!committed) return set
  if (set.deletions.nodeIds.includes(committed.id)) return set

  set.modifications.nodes = set.modifications.nodes.filter((m) => m.nodeId !== committed.id)
  set.deletions.nodeIds.push(committed.id)

  for (const edge of committedEdges) {
    if (
      (edge.source === committed.id || edge.target === committed.id) &&
      !set.deletions.edgeIds.includes(edge.id)
    ) {
      set.deletions.edgeIds.push(edge.id)
      set.modifications.edges = set.modifications.edges.filter((m) => m.edgeId !== edge.id)
    }
  }

  return set
}

function handleModifyNode(
  set: SuggestionSet,
  params: ModifyNodeParams,
  committedNodes: ArchitectureNode[],
): SuggestionSet {
  const pendingIdx = set.additions.nodes.findIndex((n) => n.name === params.name)
  const pn = set.additions.nodes[pendingIdx]
  if (pendingIdx >= 0 && pn) {
    if (params.new_name) pn.name = params.new_name
    if (params.replica_count !== undefined) pn.replicaCount = params.replica_count
    return set
  }

  // Look up by committed name first, then by pending-modified name
  let committed = committedNodes.find((n) => n.data.label === params.name)
  let existingModIdx = set.modifications.nodes.findIndex((m) => m.nodeId === committed?.id)

  if (!committed) {
    // The AI may be referencing a node by its pending (renamed) name
    existingModIdx = set.modifications.nodes.findIndex(
      (m) => m.newValues.name === params.name,
    )
    const existingMod = set.modifications.nodes[existingModIdx]
    if (existingModIdx >= 0 && existingMod) {
      committed = committedNodes.find((n) => n.id === existingMod.nodeId)
    }
  }

  if (!committed) return set

  const oldValues = { name: committed.data.label, replicaCount: committed.data.replicaCount }
  const newValues: { name?: string; replicaCount?: number } = {}
  if (params.new_name) newValues.name = params.new_name
  if (params.replica_count !== undefined) newValues.replicaCount = params.replica_count

  const modification: NodeModification = { nodeId: committed.id, nodeName: params.name, oldValues, newValues }

  const existingMod = set.modifications.nodes[existingModIdx]
  if (existingModIdx >= 0 && existingMod) {
    modification.oldValues = existingMod.oldValues
    // If new values revert to committed state, cancel the modification
    if (isNodeModificationNoop(modification)) {
      set.modifications.nodes.splice(existingModIdx, 1)
    } else {
      set.modifications.nodes[existingModIdx] = modification
    }
  } else {
    if (!isNodeModificationNoop(modification)) {
      set.modifications.nodes.push(modification)
    }
  }

  return set
}

/** Check if a node modification results in no actual change from committed state. */
function isNodeModificationNoop(mod: NodeModification): boolean {
  const nameUnchanged = mod.newValues.name === undefined || mod.newValues.name === mod.oldValues.name
  const replicaUnchanged = mod.newValues.replicaCount === undefined ||
    mod.newValues.replicaCount === (mod.oldValues.replicaCount ?? 1)
  return nameUnchanged && replicaUnchanged
}

function handleAddEdge(
  set: SuggestionSet,
  params: AddEdgeParams,
  committedNodes: ArchitectureNode[],
  committedEdges: ArchitectureEdge[],
  currentNodes: ArchitectureNode[],
): SuggestionSet {
  const sourceId = resolveNodeIdStatic(params.source, committedNodes, set, currentNodes)
  const targetId = resolveNodeIdStatic(params.target, committedNodes, set, currentNodes)
  if (!sourceId || !targetId) return set

  const identity = edgeIdentity(sourceId, targetId, params.protocol, params.direction)

  const committedEdge = committedEdges.find(
    (e) =>
      e.source === sourceId &&
      e.target === targetId &&
      (e.data?.protocol ?? '') === (params.protocol ?? '') &&
      (e.data?.direction ?? 'oneWay') === (params.direction ?? 'oneWay'),
  )
  if (committedEdge && set.deletions.edgeIds.includes(committedEdge.id)) {
    set.deletions.edgeIds = set.deletions.edgeIds.filter((id) => id !== committedEdge.id)
    return set
  }

  const existingIdx = set.additions.edges.findIndex(
    (e) => edgeIdentity(e.source, e.target, e.protocol, e.direction) === identity,
  )
  const existingEdge = set.additions.edges[existingIdx]
  if (existingIdx >= 0 && existingEdge) {
    set.additions.edges[existingIdx] = {
      ...existingEdge,
      protocol: params.protocol,
      direction: params.direction,
      syncAsync: params.sync_async,
      label: params.protocol ?? '',
    }
    return set
  }

  set.additions.edges.push({
    id: crypto.randomUUID(),
    source: sourceId,
    target: targetId,
    protocol: params.protocol,
    direction: params.direction,
    syncAsync: params.sync_async,
    label: params.protocol ?? '',
  })

  return set
}

function handleDeleteEdge(
  set: SuggestionSet,
  params: DeleteEdgeParams,
  committedNodes: ArchitectureNode[],
  committedEdges: ArchitectureEdge[],
  currentNodes: ArchitectureNode[],
): SuggestionSet {
  const sourceId = resolveNodeIdStatic(params.source, committedNodes, set, currentNodes)
  const targetId = resolveNodeIdStatic(params.target, committedNodes, set, currentNodes)
  if (!sourceId || !targetId) return set

  const identity = edgeIdentity(sourceId, targetId, params.protocol, params.direction)

  const pendingIdx = set.additions.edges.findIndex(
    (e) => edgeIdentity(e.source, e.target, e.protocol, e.direction) === identity,
  )
  if (pendingIdx >= 0) {
    set.additions.edges.splice(pendingIdx, 1)
    return set
  }

  const committedEdge = committedEdges.find(
    (e) =>
      e.source === sourceId &&
      e.target === targetId &&
      (e.data?.protocol ?? '') === (params.protocol ?? '') &&
      (e.data?.direction ?? 'oneWay') === (params.direction ?? 'oneWay'),
  )
  if (!committedEdge) return set
  if (set.deletions.edgeIds.includes(committedEdge.id)) return set

  set.modifications.edges = set.modifications.edges.filter((m) => m.edgeId !== committedEdge.id)
  set.deletions.edgeIds.push(committedEdge.id)
  return set
}

function handleModifyEdge(
  set: SuggestionSet,
  params: ModifyEdgeParams,
  committedNodes: ArchitectureNode[],
  committedEdges: ArchitectureEdge[],
  currentNodes: ArchitectureNode[],
): SuggestionSet {
  const sourceId = resolveNodeIdStatic(params.source, committedNodes, set, currentNodes)
  const targetId = resolveNodeIdStatic(params.target, committedNodes, set, currentNodes)
  if (!sourceId || !targetId) return set

  const identity = edgeIdentity(sourceId, targetId, params.protocol, params.direction)

  const pendingIdx = set.additions.edges.findIndex(
    (e) => edgeIdentity(e.source, e.target, e.protocol, e.direction) === identity,
  )
  const pe = set.additions.edges[pendingIdx]
  if (pendingIdx >= 0 && pe) {
    if (params.new_protocol) {
      pe.protocol = params.new_protocol as EdgeProtocol
      pe.label = params.new_protocol
    }
    if (params.new_direction) pe.direction = params.new_direction
    if (params.new_sync_async) pe.syncAsync = params.new_sync_async
    return set
  }

  const committedEdge = committedEdges.find(
    (e) =>
      e.source === sourceId &&
      e.target === targetId &&
      (e.data?.protocol ?? '') === (params.protocol ?? '') &&
      (e.data?.direction ?? 'oneWay') === (params.direction ?? 'oneWay'),
  )
  if (!committedEdge) return set

  const oldValues = {
    protocol: committedEdge.data?.protocol,
    direction: committedEdge.data?.direction,
    syncAsync: committedEdge.data?.syncAsync,
  }
  const newValues: { protocol?: string; direction?: string; syncAsync?: string } = {}
  if (params.new_protocol) newValues.protocol = params.new_protocol
  if (params.new_direction) newValues.direction = params.new_direction
  if (params.new_sync_async) newValues.syncAsync = params.new_sync_async

  const modification: EdgeModification = { edgeId: committedEdge.id, oldValues, newValues }

  const existingModIdx = set.modifications.edges.findIndex((m) => m.edgeId === committedEdge.id)
  const existingEdgeMod = set.modifications.edges[existingModIdx]
  if (existingModIdx >= 0 && existingEdgeMod) {
    modification.oldValues = existingEdgeMod.oldValues
    if (isEdgeModificationNoop(modification)) {
      set.modifications.edges.splice(existingModIdx, 1)
    } else {
      set.modifications.edges[existingModIdx] = modification
    }
  } else {
    if (!isEdgeModificationNoop(modification)) {
      set.modifications.edges.push(modification)
    }
  }

  return set
}

/** Check if an edge modification results in no actual change from committed state. */
function isEdgeModificationNoop(mod: EdgeModification): boolean {
  const protoUnchanged = mod.newValues.protocol === undefined || mod.newValues.protocol === (mod.oldValues.protocol ?? '')
  const dirUnchanged = mod.newValues.direction === undefined || mod.newValues.direction === (mod.oldValues.direction ?? 'oneWay')
  const syncUnchanged = mod.newValues.syncAsync === undefined || mod.newValues.syncAsync === (mod.oldValues.syncAsync ?? 'sync')
  return protoUnchanged && dirUnchanged && syncUnchanged
}

function resolveNodeIdStatic(
  name: string,
  committedNodes: ArchitectureNode[],
  set: SuggestionSet,
  currentNodes?: ArchitectureNode[],
): string | undefined {
  // Check committed name
  const committed = committedNodes.find((n) => n.data.label === name)
  if (committed) return committed.id
  // Check pending-add name
  const pending = set.additions.nodes.find((n) => n.name === name)
  if (pending) return pending.id
  // Check pending-modified name (node was renamed but not yet approved)
  const renamedMod = set.modifications.nodes.find((m) => m.newValues.name === name)
  if (renamedMod) return renamedMod.nodeId
  // Check current React Flow nodes (user-added after snapshot)
  if (currentNodes) {
    const current = currentNodes.find((n) => n.data.label === name)
    if (current) return current.id
  }
  return undefined
}

function autoPosition(
  committedNodes: ArchitectureNode[],
  set: SuggestionSet,
): { x: number; y: number } {
  const allPositions = [
    ...committedNodes.map((n) => n.position),
    ...set.additions.nodes.map((n) => n.position),
  ]
  if (allPositions.length === 0) {
    return { x: 250, y: 150 }
  }
  const maxY = Math.max(...allPositions.map((p) => p.y))
  const avgX = allPositions.reduce((sum, p) => sum + p.x, 0) / allPositions.length
  const offset = set.additions.nodes.length * 50
  return { x: avgX + offset, y: maxY + 200 }
}
