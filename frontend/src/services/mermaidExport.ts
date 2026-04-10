import type { ArchitectureNode, ArchitectureEdge, ComponentType } from '../types/graph'

/**
 * Sanitize a label for use as a Mermaid node ID.
 * Strips non-alphanumeric characters and collapses spaces.
 */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * Escape a label for Mermaid display text (quotes, brackets).
 */
function escapeLabel(label: string): string {
  return label.replace(/"/g, '#quot;').replace(/[[\](){}]/g, '')
}

/**
 * Map a component type to a Mermaid node shape.
 *
 * Mermaid shapes:
 *   rectangle:  [label]
 *   cylinder:   [(label)]
 *   stadium:    ([label])
 *   hexagon:    {{label}}
 *   trapezoid:  [/label\]
 *   subroutine: [[label]]
 */
function shapeForType(type: ComponentType, label: string): string {
  const escaped = escapeLabel(label)
  switch (type) {
    case 'databaseSql':
    case 'databaseNosql':
      return `[("${escaped}")]`
    case 'cache':
      return `[("${escaped}")]`
    case 'messageQueue':
    case 'eventBus':
    case 'streamProcessor':
      return `(["${escaped}"])`
    case 'loadBalancer':
      return `{{"${escaped}"}}`
    case 'cdn':
    case 'dns':
    case 'firewall':
      return `[["${escaped}"]]`
    case 'webClient':
    case 'mobileClient':
    case 'iotClient':
      return `>"${escaped}"]`
    default:
      return `["${escaped}"]`
  }
}

/**
 * Build the arrow syntax for an edge based on direction and protocol.
 */
function arrowForEdge(edge: ArchitectureEdge): { left: string; right: string } {
  const isBidi = edge.data?.direction === 'bidirectional'
  if (isBidi) {
    return { left: '<--', right: '-->' }
  }
  return { left: '--', right: '-->' }
}

/**
 * Build the edge label portion (the text between pipes).
 */
function edgeLabelText(edge: ArchitectureEdge): string {
  const parts: string[] = []
  if (edge.data?.protocol) {
    parts.push(edge.data.protocol.toUpperCase())
  }
  if (edge.data?.syncAsync === 'async') {
    parts.push('async')
  }
  return parts.join(' ')
}

/**
 * Convert architecture nodes and edges to a Mermaid flowchart string.
 */
export function toMermaid(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): string {
  const lines: string[] = ['flowchart TD']

  // Filter out pending nodes/edges
  const cleanNodes = nodes.filter(
    (n) => n.data.pendingStatus !== 'pendingAdd' && n.data.pendingStatus !== 'pendingDelete',
  )
  const cleanEdges = edges.filter(
    (e) => e.data?.pendingStatus !== 'pendingAdd' && e.data?.pendingStatus !== 'pendingDelete',
  )

  // Nodes
  for (const node of cleanNodes) {
    const id = sanitizeId(node.id)
    const shape = shapeForType(node.type, node.data.label)
    lines.push(`    ${id}${shape}`)
  }

  // Edges
  for (const edge of cleanEdges) {
    const src = sanitizeId(edge.source)
    const tgt = sanitizeId(edge.target)
    const { left, right } = arrowForEdge(edge)
    const label = edgeLabelText(edge)
    if (label) {
      lines.push(`    ${src} ${left}|${label}|${right} ${tgt}`)
    } else {
      lines.push(`    ${src} ${left}${right} ${tgt}`)
    }
  }

  return lines.join('\n')
}

/**
 * Export the diagram as a Mermaid .md file download.
 */
export function exportMermaid(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): void {
  const mermaid = toMermaid(nodes, edges)
  const content = `\`\`\`mermaid\n${mermaid}\n\`\`\`\n`
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'designpair-diagram.md'
  a.click()
  URL.revokeObjectURL(url)
}
