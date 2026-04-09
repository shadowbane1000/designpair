import { describe, it, expect } from 'vitest'
import { serializeGraph } from '../services/graphSerializer'
import type { ArchitectureNode, ArchitectureEdge } from '../types/graph'

describe('serializeGraph', () => {
  it('serializes an empty graph', () => {
    const result = serializeGraph([], [])
    expect(result).toEqual({ nodes: [], edges: [] })
  })

  it('serializes a single node', () => {
    const nodes: ArchitectureNode[] = [
      {
        id: 'n1',
        type: 'service',
        position: { x: 100, y: 200 },
        data: { label: 'API' },
      },
    ]
    const result = serializeGraph(nodes, [])
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0]).toEqual({
      id: 'n1',
      type: 'service',
      name: 'API',
      position: { x: 100, y: 200 },
    })
  })

  it('serializes multiple nodes with edges', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'API' } },
      { id: 'n2', type: 'database', position: { x: 200, y: 0 }, data: { label: 'DB' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: 'SQL' } },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]).toEqual({
      id: 'e1',
      source: 'n1',
      target: 'n2',
      label: 'SQL',
    })
  })

  it('serializes edges without labels as empty string', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', type: 'service', position: { x: 100, y: 0 }, data: { label: 'B' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: '' } },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.edges[0]?.label).toBe('')
  })

  it('handles edges with undefined data', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', type: 'service', position: { x: 100, y: 0 }, data: { label: 'B' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2' },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.edges[0]?.label).toBe('')
  })

  it('serializes multiple edges between the same two nodes', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'API' } },
      { id: 'n2', type: 'database', position: { x: 200, y: 0 }, data: { label: 'DB' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: 'HTTP' } },
      { id: 'e2', source: 'n1', target: 'n2', data: { label: 'async' } },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]?.label).toBe('HTTP')
    expect(result.edges[1]?.label).toBe('async')
  })

  it('maps data.label to name for nodes', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'cache', position: { x: 50, y: 75 }, data: { label: 'Redis' } },
    ]
    const result = serializeGraph(nodes, [])
    expect(result.nodes[0]?.name).toBe('Redis')
  })
})
