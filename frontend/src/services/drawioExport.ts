import type { ArchitectureNode, ArchitectureEdge, ComponentType } from '../types/graph'

/**
 * Escape a string for use in XML attribute values.
 */
function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Map a component type to a draw.io style string.
 */
function styleForType(type: ComponentType): string {
  switch (type) {
    case 'databaseSql':
    case 'databaseNosql':
      return 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#dae8fc;strokeColor=#6c8ebf;'
    case 'cache':
      return 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#d5e8d4;strokeColor=#82b366;'
    case 'messageQueue':
    case 'eventBus':
    case 'streamProcessor':
      return 'shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sqs;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;'
    case 'loadBalancer':
      return 'shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;fillColor=#fff2cc;strokeColor=#d6b656;'
    case 'cdn':
    case 'dns':
    case 'firewall':
      return 'shape=mxgraph.basic.cloud;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;'
    case 'webClient':
    case 'mobileClient':
    case 'iotClient':
      return 'shape=mxgraph.basic.rect;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;rounded=1;'
    case 'apiGateway':
      return 'rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;'
    case 'serverlessFunction':
      return 'rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;dashed=1;'
    default:
      return 'rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;'
  }
}

/**
 * Default cell dimensions.
 */
const NODE_WIDTH = 120
const NODE_HEIGHT = 60

/**
 * Convert architecture nodes and edges to a draw.io XML string.
 */
export function toDrawio(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): string {
  // Filter out pending nodes/edges
  const cleanNodes = nodes.filter(
    (n) => n.data.pendingStatus !== 'pendingAdd' && n.data.pendingStatus !== 'pendingDelete',
  )
  const cleanEdges = edges.filter(
    (e) => e.data?.pendingStatus !== 'pendingAdd' && e.data?.pendingStatus !== 'pendingDelete',
  )

  const cells: string[] = []

  // Root cells required by draw.io
  cells.push('      <mxCell id="0" />')
  cells.push('      <mxCell id="1" parent="0" />')

  // Node cells
  for (const node of cleanNodes) {
    const style = styleForType(node.type)
    const label = xmlEscape(node.data.label)
    const x = Math.round(node.position.x)
    const y = Math.round(node.position.y)
    cells.push(
      `      <mxCell id="${xmlEscape(node.id)}" value="${label}" style="${style}" vertex="1" parent="1">` +
      `\n        <mxGeometry x="${String(x)}" y="${String(y)}" width="${String(NODE_WIDTH)}" height="${String(NODE_HEIGHT)}" as="geometry" />` +
      `\n      </mxCell>`,
    )
  }

  // Edge cells
  for (const edge of cleanEdges) {
    const isBidi = edge.data?.direction === 'bidirectional'
    const isDashed = edge.data?.syncAsync === 'async'

    const styleParts = ['html=1']
    if (isBidi) {
      styleParts.push('startArrow=classic', 'endArrow=classic')
    } else {
      styleParts.push('endArrow=classic')
    }
    if (isDashed) {
      styleParts.push('dashed=1')
    }
    const edgeStyle = styleParts.join(';') + ';'

    const label = edge.data?.protocol ? xmlEscape(edge.data.protocol.toUpperCase()) : ''
    cells.push(
      `      <mxCell id="${xmlEscape(edge.id)}" value="${label}" style="${edgeStyle}" edge="1" parent="1" source="${xmlEscape(edge.source)}" target="${xmlEscape(edge.target)}">` +
      `\n        <mxGeometry relative="1" as="geometry" />` +
      `\n      </mxCell>`,
    )
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mxfile>',
    '  <diagram name="DesignPair">',
    '    <mxGraphModel>',
    '      <root>',
    ...cells,
    '      </root>',
    '    </mxGraphModel>',
    '  </diagram>',
    '</mxfile>',
  ].join('\n')
}

/**
 * Export the diagram as a .drawio file download.
 */
export function exportDrawio(nodes: ArchitectureNode[], edges: ArchitectureEdge[]): void {
  const xml = toDrawio(nodes, edges)
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'designpair-diagram.drawio'
  a.click()
  URL.revokeObjectURL(url)
}
