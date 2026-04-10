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

const NEIGHBOR_OFFSET = 200

/**
 * Position newly added nodes (pendingAdd) based on their connected neighbors.
 *
 * For each pending node:
 * - If it connects to existing nodes, place it at the average position of those
 *   neighbors, offset 200px below (or in the direction with the most open space).
 * - If it has no connections yet, place it near the center of all existing nodes.
 *
 * This is simpler and more predictable than running dagre on the full graph,
 * which produces positions in an absolute coordinate space that doesn't match
 * the user's current canvas layout. Dagre full-layout is still used for
 * example/import loads where we control all positions.
 */
export function layoutNewNodes(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): ArchitectureNode[] {
  const pendingIds = new Set(
    nodes.filter((n) => n.data.pendingStatus === 'pendingAdd').map((n) => n.id),
  )
  if (pendingIds.size === 0) return nodes

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const existingNodes = nodes.filter((n) => !pendingIds.has(n.id))

  // Center of existing nodes as fallback
  let centerX = 250
  let centerY = 150
  if (existingNodes.length > 0) {
    centerX = existingNodes.reduce((s, n) => s + n.position.x, 0) / existingNodes.length
    centerY = existingNodes.reduce((s, n) => s + n.position.y, 0) / existingNodes.length
  }

  // Track positions we've already assigned to avoid overlap
  const usedPositions = existingNodes.map((n) => n.position)

  return nodes.map((node) => {
    if (!pendingIds.has(node.id)) return node

    // Find connected neighbors (from edges)
    const neighborPositions: { x: number; y: number }[] = []
    for (const edge of edges) {
      if (edge.source === node.id) {
        const neighbor = nodeMap.get(edge.target)
        if (neighbor && !pendingIds.has(neighbor.id)) {
          neighborPositions.push(neighbor.position)
        }
      }
      if (edge.target === node.id) {
        const neighbor = nodeMap.get(edge.source)
        if (neighbor && !pendingIds.has(neighbor.id)) {
          neighborPositions.push(neighbor.position)
        }
      }
    }

    let pos: { x: number; y: number }
    if (neighborPositions.length > 0) {
      // Average position of connected neighbors, offset below
      const avgX = neighborPositions.reduce((s, p) => s + p.x, 0) / neighborPositions.length
      const avgY = neighborPositions.reduce((s, p) => s + p.y, 0) / neighborPositions.length
      pos = { x: avgX, y: avgY + NEIGHBOR_OFFSET }
    } else {
      // No connections — place near center, below existing nodes
      const maxY = existingNodes.length > 0
        ? Math.max(...existingNodes.map((n) => n.position.y))
        : centerY
      pos = { x: centerX, y: maxY + NEIGHBOR_OFFSET }
    }

    // Nudge to avoid overlapping with existing or previously placed pending nodes
    pos = avoidOverlap(pos, usedPositions)
    usedPositions.push(pos)

    return { ...node, position: pos }
  })
}

/**
 * Nudge a position horizontally if it overlaps with any existing position.
 */
function avoidOverlap(
  pos: { x: number; y: number },
  used: { x: number; y: number }[],
): { x: number; y: number } {
  let { x } = pos
  const { y } = pos
  const threshold = NODE_WIDTH + 20
  let attempts = 0
  while (attempts < 10 && used.some((p) => Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < NODE_HEIGHT + 20)) {
    x += NODE_WIDTH + 40
    attempts++
  }
  return { x, y }
}
