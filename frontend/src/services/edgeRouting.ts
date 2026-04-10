import type { ArchitectureNode, ArchitectureEdge } from '../types/graph'

type HandleSide = 'top' | 'bottom' | 'left' | 'right'

/**
 * Pick the best source/target handle positions based on the relative
 * placement of source and target nodes. Returns handle IDs matching
 * the BaseNode handle naming convention: "{side}-source" / "{side}-target".
 */
export function pickHandlePositions(
  sourceNode: ArchitectureNode | undefined,
  targetNode: ArchitectureNode | undefined,
): { sourceHandle: string; targetHandle: string } {
  if (!sourceNode || !targetNode) {
    return { sourceHandle: 'bottom-source', targetHandle: 'top-target' }
  }

  const dx = targetNode.position.x - sourceNode.position.x
  const dy = targetNode.position.y - sourceNode.position.y

  let sourceSide: HandleSide
  let targetSide: HandleSide

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal relationship dominant
    if (dx > 0) {
      sourceSide = 'right'
      targetSide = 'left'
    } else {
      sourceSide = 'left'
      targetSide = 'right'
    }
  } else {
    // Vertical relationship dominant
    if (dy > 0) {
      sourceSide = 'bottom'
      targetSide = 'top'
    } else {
      sourceSide = 'top'
      targetSide = 'bottom'
    }
  }

  return {
    sourceHandle: `${sourceSide}-source`,
    targetHandle: `${targetSide}-target`,
  }
}

/**
 * Apply smart handle positions to edges that don't already have handles set.
 * Typically called for AI-created (pending-add) edges.
 */
export function routeEdges(
  edges: ArchitectureEdge[],
  nodes: ArchitectureNode[],
): ArchitectureEdge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  return edges.map((edge) => {
    // Only route edges that don't have handles explicitly set
    if (edge.sourceHandle && edge.targetHandle) return edge

    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    const { sourceHandle, targetHandle } = pickHandlePositions(source, target)

    return { ...edge, sourceHandle, targetHandle }
  })
}
