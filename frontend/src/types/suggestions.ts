import type { ComponentType, EdgeProtocol, EdgeDirection, SyncAsync } from './graph'

export type PendingStatus = 'committed' | 'pendingAdd' | 'pendingDelete' | 'pendingModify'

export interface PendingNode {
  id: string
  type: ComponentType
  name: string
  position: { x: number; y: number }
  replicaCount?: number
}

export interface PendingEdge {
  id: string
  source: string
  target: string
  protocol?: EdgeProtocol
  direction?: EdgeDirection
  syncAsync?: SyncAsync
  label: string
}

export interface NodeModification {
  nodeId: string
  nodeName: string
  oldValues: { name?: string; replicaCount?: number }
  newValues: { name?: string; replicaCount?: number }
}

export interface EdgeModification {
  edgeId: string
  oldValues: { protocol?: string; direction?: string; syncAsync?: string }
  newValues: { protocol?: string; direction?: string; syncAsync?: string }
}

export interface SuggestionSet {
  additions: {
    nodes: PendingNode[]
    edges: PendingEdge[]
  }
  deletions: {
    nodeIds: string[]
    edgeIds: string[]
  }
  modifications: {
    nodes: NodeModification[]
    edges: EdgeModification[]
  }
}

export function emptySuggestionSet(): SuggestionSet {
  return {
    additions: { nodes: [], edges: [] },
    deletions: { nodeIds: [], edgeIds: [] },
    modifications: { nodes: [], edges: [] },
  }
}

export function hasPendingSuggestions(set: SuggestionSet): boolean {
  return (
    set.additions.nodes.length > 0 ||
    set.additions.edges.length > 0 ||
    set.deletions.nodeIds.length > 0 ||
    set.deletions.edgeIds.length > 0 ||
    set.modifications.nodes.length > 0 ||
    set.modifications.edges.length > 0
  )
}

export interface ToolCallResult {
  tool: string
  params: Record<string, unknown>
  result: 'success' | 'error'
  error?: string
}
