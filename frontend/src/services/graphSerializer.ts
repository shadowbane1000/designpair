import type {
  ArchitectureNode,
  ArchitectureEdge,
  GraphState,
  SerializedNode,
} from '../types/graph'

export function serializeGraph(
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
): GraphState {
  return {
    nodes: nodes.map((node) => {
      const serialized: SerializedNode = {
        id: node.id,
        type: node.type,
        name: node.data.label,
        position: { x: node.position.x, y: node.position.y },
      }
      const replicaCount = node.data.replicaCount
      if (replicaCount !== undefined && replicaCount > 1) {
        serialized.replicaCount = replicaCount
      }
      return serialized
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.data?.label ?? '',
    })),
  }
}
