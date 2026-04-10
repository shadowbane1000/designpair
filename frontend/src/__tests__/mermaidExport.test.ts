import { describe, it, expect } from 'vitest'
import { toMermaid } from '../services/mermaidExport'
import type { ArchitectureNode, ArchitectureEdge } from '../types/graph'

function makeNode(overrides: Partial<ArchitectureNode> & { id: string }): ArchitectureNode {
  return {
    id: overrides.id,
    type: overrides.type ?? 'service',
    position: overrides.position ?? { x: 0, y: 0 },
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

describe('toMermaid', () => {
  it('returns flowchart TD header for empty graph', () => {
    const result = toMermaid([], [])
    expect(result).toBe('flowchart TD')
  })

  it('renders a single service node as a rectangle', () => {
    const nodes = [makeNode({ id: 'n1', type: 'service', data: { label: 'API' } })]
    const result = toMermaid(nodes, [])
    expect(result).toContain('n1["API"]')
  })

  it('renders a database node as a cylinder', () => {
    const nodes = [makeNode({ id: 'n1', type: 'databaseSql', data: { label: 'Postgres' } })]
    const result = toMermaid(nodes, [])
    expect(result).toContain('n1[("Postgres")]')
  })

  it('renders a cache node as a cylinder', () => {
    const nodes = [makeNode({ id: 'n1', type: 'cache', data: { label: 'Redis' } })]
    const result = toMermaid(nodes, [])
    expect(result).toContain('n1[("Redis")]')
  })

  it('renders a messageQueue node as a stadium', () => {
    const nodes = [makeNode({ id: 'n1', type: 'messageQueue', data: { label: 'SQS' } })]
    const result = toMermaid(nodes, [])
    expect(result).toContain('n1(["SQS"])')
  })

  it('renders a loadBalancer node as a hexagon', () => {
    const nodes = [makeNode({ id: 'n1', type: 'loadBalancer', data: { label: 'LB' } })]
    const result = toMermaid(nodes, [])
    expect(result).toContain('n1{{"LB"}}')
  })

  it('renders a firewall node as a subroutine', () => {
    const nodes = [makeNode({ id: 'n1', type: 'firewall', data: { label: 'WAF' } })]
    const result = toMermaid(nodes, [])
    expect(result).toContain('n1[["WAF"]]')
  })

  it('renders a webClient node as an asymmetric shape', () => {
    const nodes = [makeNode({ id: 'n1', type: 'webClient', data: { label: 'Browser' } })]
    const result = toMermaid(nodes, [])
    expect(result).toContain('n1>"Browser"]')
  })

  it('renders a one-way edge without label', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'A' } }),
      makeNode({ id: 'n2', data: { label: 'B' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2' })]
    const result = toMermaid(nodes, edges)
    expect(result).toContain('n1 ----> n2')
  })

  it('renders an edge with protocol label', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'A' } }),
      makeNode({ id: 'n2', data: { label: 'B' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2', data: { label: 'HTTP', protocol: 'http' } })]
    const result = toMermaid(nodes, edges)
    expect(result).toContain('n1 --|HTTP|--> n2')
  })

  it('renders a bidirectional edge', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'A' } }),
      makeNode({ id: 'n2', data: { label: 'B' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2', data: { label: 'WS', protocol: 'websocket', direction: 'bidirectional' } })]
    const result = toMermaid(nodes, edges)
    expect(result).toContain('<--')
    expect(result).toContain('-->')
  })

  it('includes async in edge label when syncAsync is async', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'A' } }),
      makeNode({ id: 'n2', data: { label: 'B' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2', data: { label: 'pub/sub', protocol: 'pubsub', syncAsync: 'async' } })]
    const result = toMermaid(nodes, edges)
    expect(result).toContain('PUBSUB async')
  })

  it('filters out pending nodes and edges', () => {
    const nodes = [
      makeNode({ id: 'n1', data: { label: 'Keep' } }),
      makeNode({ id: 'n2', data: { label: 'Pending', pendingStatus: 'pendingAdd' } }),
    ]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n2', data: { label: '', pendingStatus: 'pendingDelete' } })]
    const result = toMermaid(nodes, edges)
    expect(result).toContain('n1')
    expect(result).not.toContain('n2')
    expect(result).not.toContain('e1')
  })

  it('handles self-loop edge', () => {
    const nodes = [makeNode({ id: 'n1', data: { label: 'Service' } })]
    const edges = [makeEdge({ id: 'e1', source: 'n1', target: 'n1' })]
    const result = toMermaid(nodes, edges)
    expect(result).toContain('n1 ----> n1')
  })

  it('sanitizes IDs with special characters', () => {
    const nodes = [makeNode({ id: 'node.with spaces!', data: { label: 'Test' } })]
    const result = toMermaid(nodes, [])
    // Should not contain the original special characters in the ID part
    expect(result).not.toContain('node.with spaces!')
    expect(result).toContain('node_with_spaces_')
  })
})
