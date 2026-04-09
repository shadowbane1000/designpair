import type {
  ArchitectureNode,
  ArchitectureEdge,
  GraphState,
} from '../types/graph'

export function serializeGraph(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): GraphState {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      name: node.data.label,
      position: { x: node.position.x, y: node.position.y },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.data?.label ?? '',
    })),
  }
}
