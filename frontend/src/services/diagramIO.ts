import type { ArchitectureNode, ArchitectureEdge } from '../types/graph'

interface DiagramFile {
  version: 1
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
}

/**
 * Export the current diagram as a JSON file download.
 */
export function exportDiagram(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): void {
  // Strip pending status from exported data
  const cleanNodes = nodes
    .filter((n) => n.data.pendingStatus !== 'pendingAdd' && n.data.pendingStatus !== 'pendingDelete')
    .map((n) => ({
      ...n,
      data: { label: n.data.label, replicaCount: n.data.replicaCount },
    }))

  const cleanEdges = edges
    .filter((e) => e.data?.pendingStatus !== 'pendingAdd' && e.data?.pendingStatus !== 'pendingDelete')
    .map((e) => ({
      ...e,
      data: e.data ? {
        label: e.data.label,
        protocol: e.data.protocol,
        direction: e.data.direction,
        syncAsync: e.data.syncAsync,
      } : undefined,
    }))

  const file: DiagramFile = { version: 1, nodes: cleanNodes as ArchitectureNode[], edges: cleanEdges as ArchitectureEdge[] }
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'designpair-diagram.json'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Import a diagram from a JSON file. Returns the parsed nodes and edges,
 * or null if the file is invalid.
 */
export function parseDiagramFile(
  json: string,
): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } | null {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null

    const obj = parsed as Record<string, unknown>
    if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return null

    const nodes = obj.nodes as ArchitectureNode[]
    const edges = obj.edges as ArchitectureEdge[]

    // Basic validation: each node should have id, type, position, data.label
    for (const raw of nodes) {
      const n = raw as unknown as Record<string, unknown>
      if (!n.id || !n.type || !n.position) return null
      const data = n.data as Record<string, unknown> | undefined
      if (!data?.label) return null
    }

    // Each edge should have id, source, target
    for (const raw of edges) {
      const e = raw as unknown as Record<string, unknown>
      if (!e.id || !e.source || !e.target) return null
    }

    return { nodes, edges }
  } catch {
    return null
  }
}
