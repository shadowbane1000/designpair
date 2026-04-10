import dagre, { type GraphLabel, type NodeLabel, type EdgeLabel } from '@dagrejs/dagre'
import type { ArchitectureNode, ArchitectureEdge } from '../types/graph'

const NODE_WIDTH = 180
const NODE_HEIGHT = 100

/**
 * Compute a dagre layout for the given nodes and edges.
 * Returns new positions for each node keyed by node ID.
 */
export function computeLayout(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel>()
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  for (const node of nodes) {
    const dagreNode = g.node(node.id) as { x: number; y: number } | undefined
    if (dagreNode) {
      // dagre centers nodes; offset to top-left for React Flow
      positions.set(node.id, {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - NODE_HEIGHT / 2,
      })
    }
  }

  return positions
}

/**
 * Apply dagre layout only to newly added nodes (pendingAdd),
 * integrating them into the existing layout without moving committed nodes.
 *
 * Strategy: run dagre on all nodes, then only update positions of pending-add nodes.
 * Committed nodes keep their current positions.
 */
export function layoutNewNodes(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): ArchitectureNode[] {
  const pendingIds = new Set(
    nodes.filter((n) => n.data.pendingStatus === 'pendingAdd').map((n) => n.id),
  )
  if (pendingIds.size === 0) return nodes

  const positions = computeLayout(nodes, edges)

  return nodes.map((node) => {
    if (!pendingIds.has(node.id)) return node
    const pos = positions.get(node.id)
    if (!pos) return node
    return { ...node, position: pos }
  })
}
