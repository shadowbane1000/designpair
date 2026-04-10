import type {
  ArchitectureNode,
  ArchitectureEdge,
  GraphState,
  SerializedNode,
  SerializedEdge,
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
      const annotation = node.data.annotation
      if (annotation) {
        serialized.annotation = annotation
      }
      return serialized
    }),
    edges: edges.map((edge) => {
      const serialized: SerializedEdge = {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.data?.label ?? '',
      }
      if (edge.data?.protocol) {
        serialized.protocol = edge.data.protocol as string
      }
      if (edge.data?.direction && edge.data.direction !== 'oneWay') {
        serialized.direction = edge.data.direction as string
      }
      if (edge.data?.syncAsync && edge.data.syncAsync !== 'sync') {
        serialized.syncAsync = edge.data.syncAsync as string
      }
      return serialized
    }),
  }
}
