import type { GraphState, GraphDelta, DeltaNode, DeltaEdge, DeltaModify } from '../types/graph'

/**
 * Compute the structural delta between two graph snapshots.
 * Position changes are ignored -- only structural/semantic changes are reported.
 * If `previous` is null, all current items are treated as additions.
 */
export function computeDelta(previous: GraphState | null, current: GraphState): GraphDelta {
  if (!previous) {
    return {
      addedNodes: current.nodes.map((n) => ({ type: n.type, name: n.name })),
      removedNodes: [],
      addedEdges: current.edges.map((e) => ({
        source: e.source,
        target: e.target,
        protocol: e.protocol,
      })),
      removedEdges: [],
      modifiedNodes: [],
      modifiedEdges: [],
    }
  }

  const prevNodeMap = new Map(previous.nodes.map((n) => [n.id, n]))
  const currNodeMap = new Map(current.nodes.map((n) => [n.id, n]))
  const prevEdgeMap = new Map(previous.edges.map((e) => [e.id, e]))
  const currEdgeMap = new Map(current.edges.map((e) => [e.id, e]))

  const addedNodes: DeltaNode[] = []
  const removedNodes: DeltaNode[] = []
  const modifiedNodes: DeltaModify[] = []

  // Check for added and modified nodes
  for (const [id, node] of currNodeMap) {
    const prev = prevNodeMap.get(id)
    if (!prev) {
      addedNodes.push({ type: node.type, name: node.name })
    } else {
      // Check structural changes (ignore position)
      if (prev.name !== node.name) {
        modifiedNodes.push({ name: node.name, field: 'name', oldValue: prev.name, newValue: node.name })
      }
      if (prev.type !== node.type) {
        modifiedNodes.push({ name: node.name, field: 'type', oldValue: prev.type, newValue: node.type })
      }
      const prevReplica = prev.replicaCount ?? 1
      const currReplica = node.replicaCount ?? 1
      if (prevReplica !== currReplica) {
        modifiedNodes.push({ name: node.name, field: 'replicaCount', oldValue: String(prevReplica), newValue: String(currReplica) })
      }
    }
  }

  // Check for removed nodes
  for (const [id, node] of prevNodeMap) {
    if (!currNodeMap.has(id)) {
      removedNodes.push({ type: node.type, name: node.name })
    }
  }

  const addedEdges: DeltaEdge[] = []
  const removedEdges: DeltaEdge[] = []
  const modifiedEdges: DeltaModify[] = []

  // Resolve node names for edge descriptions
  const nodeNameById = new Map(current.nodes.map((n) => [n.id, n.name]))
  const prevNodeNameById = new Map(previous.nodes.map((n) => [n.id, n.name]))

  // Check for added and modified edges
  for (const [id, edge] of currEdgeMap) {
    const prev = prevEdgeMap.get(id)
    if (!prev) {
      addedEdges.push({
        source: nodeNameById.get(edge.source) ?? edge.source,
        target: nodeNameById.get(edge.target) ?? edge.target,
        protocol: edge.protocol,
      })
    } else {
      const edgeName = `${nodeNameById.get(edge.source) ?? edge.source} -> ${nodeNameById.get(edge.target) ?? edge.target}`
      if ((prev.protocol ?? '') !== (edge.protocol ?? '')) {
        modifiedEdges.push({ name: edgeName, field: 'protocol', oldValue: prev.protocol ?? '', newValue: edge.protocol ?? '' })
      }
      if ((prev.direction ?? '') !== (edge.direction ?? '')) {
        modifiedEdges.push({ name: edgeName, field: 'direction', oldValue: prev.direction ?? '', newValue: edge.direction ?? '' })
      }
      if ((prev.syncAsync ?? '') !== (edge.syncAsync ?? '')) {
        modifiedEdges.push({ name: edgeName, field: 'syncAsync', oldValue: prev.syncAsync ?? '', newValue: edge.syncAsync ?? '' })
      }
    }
  }

  // Check for removed edges
  for (const [id, edge] of prevEdgeMap) {
    if (!currEdgeMap.has(id)) {
      removedEdges.push({
        source: prevNodeNameById.get(edge.source) ?? edge.source,
        target: prevNodeNameById.get(edge.target) ?? edge.target,
        protocol: edge.protocol,
      })
    }
  }

  return {
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    modifiedNodes,
    modifiedEdges,
  }
}

/** Returns true if the delta contains any changes. */
export function isDeltaEmpty(delta: GraphDelta): boolean {
  return (
    delta.addedNodes.length === 0 &&
    delta.removedNodes.length === 0 &&
    delta.addedEdges.length === 0 &&
    delta.removedEdges.length === 0 &&
    delta.modifiedNodes.length === 0 &&
    delta.modifiedEdges.length === 0
  )
}
