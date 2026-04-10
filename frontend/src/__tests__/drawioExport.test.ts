import { describe, it, expect } from 'vitest'
import { toDrawio } from '../services/drawioExport'
import type { ArchitectureNode, ArchitectureEdge } from '../types/graph'

function makeNode(overrides: Partial<ArchitectureNode> & { id: string }): ArchitectureNode {
  return {
    id: overrides.id,
    type: overrides.type ?? 'service',
    position: overrides.position ?? { x: 100, y: 200 },
    data: { label: 'Node', ...(overrides.data ?? {}) },
  } as ArchitectureNode
}

function makeEdge(overrides: Partial<ArchitectureEdge> & { id: string; source: string; target: string }): ArchitectureEdge {
  return {
    id: overrides.id,
    source: overrides.source,
    target: overrides.target,
    data: { label: '', ...(overrides.data ?? {}) },
  } as ArchitectureEdge
}

describe('toDrawio', () => {
  it('produces valid XML structure for empty graph', () => {
    const result = toDrawio([], [])
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(result).toContain('<mxfile>')
    expect(result).toContain('</mxfile>')
    expect(result).toContain('<mxGraphModel>')
    expect(result).toContain('<root>')
    // Should have the two root cells (id=0 and id=1)
    expect(result).toContain('id="0"')
    expect(result).toContain('id="1"')
  })

  it('renders a node with position and label', () => {
    const nodes = [makeNode({ id: 'n1', position: { x: 50, y: 75 }, data: { label: 'API Server' } })]
    const result = toDrawio(nodes, [])
    expect(result).toContain('id="n1"')
    expect(result).toContain('value="API Server"')
    expect(result).toContain('x="50"')
    expect(result).toContain('y="75"')
    expect(result).toContain('vertex="1"')
  })

  it('uses cylinder style for database nodes', () => {
    const nodes = [makeNode({ id: 'n1', type: 'databaseSql', data: { label: 'DB' } })]
    const result = toDrawio(nodes, [])
    expect(result).toContain('shape=cylinder3')
  })

  it('uses hexagon style for loadBalancer nodes', () => {
    const nodes = [makeNode({ id: 'n1', type: 'loadBalancer', data: { label: 'LB' } })]
    const result = toDrawio(nodes, [])
    expect(result).toContain('shape=hexagon')
  })

  it('renders an edge with source and target', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'A' } }),
      makeNode({ id: 'n2', data: { label: 'B' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2' })]
    const result = toDrawio(nodes, edges)
    expect(result).toContain('id="e1"')
    expect(result).toContain('source="n1"')
    expect(result).toContain('target="n2"')
    expect(result).toContain('edge="1"')
  })

  it('includes protocol as edge label', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'A' } }),
      makeNode({ id: 'n2', data: { label: 'B' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2', data: { label: 'HTTP', protocol: 'http' } })]
    const result = toDrawio(nodes, edges)
    expect(result).toContain('value="HTTP"')
  })

  it('renders bidirectional edge with startArrow', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'A' } }),
      makeNode({ id: 'n2', data: { label: 'B' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2', data: { label: 'WS', direction: 'bidirectional' } })]
    const result = toDrawio(nodes, edges)
    expect(result).toContain('startArrow=classic')
    expect(result).toContain('endArrow=classic')
  })

  it('renders async edge as dashed', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'A' } }),
      makeNode({ id: 'n2', data: { label: 'B' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2', data: { label: 'async', syncAsync: 'async' } })]
    const result = toDrawio(nodes, edges)
    expect(result).toContain('dashed=1')
  })

  it('filters out pending nodes and edges', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'Keep' } }),
      makeNode({ id: 'n2', data: { label: 'Pending', pendingStatus: 'pendingAdd' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2', data: { label: '', pendingStatus: 'pendingDelete' } })]
    const result = toDrawio(nodes, edges)
    expect(result).toContain('id="n1"')
    expect(result).not.toContain('id="n2"')
    expect(result).not.toContain('id="e1"')
  })

  it('escapes XML special characters in labels', () => {
    const nodes = [makeNode({ id: 'n1', data: { label: 'A & B <test>' } })]
    const result = toDrawio(nodes, [])
    expect(result).toContain('A &amp; B &lt;test&gt;')
    expect(result).not.toContain('A & B <test>')
  })

  it('handles self-loop edge', () => {
    const nodes = [makeNode({ id: 'n1', data: { label: 'Service' } })]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n1' })]
    const result = toDrawio(nodes, edges)
    expect(result).toContain('source="n1"')
    expect(result).toContain('target="n1"')
  })

  it('renders edge with no protocol as empty label', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'A' } }),
      makeNode({ id: 'n2', data: { label: 'B' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2' })]
    const result = toDrawio(nodes, edges)
    expect(result).toContain('value=""')
  })
})
