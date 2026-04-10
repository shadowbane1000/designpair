import { describe, it, expect } from 'vitest'
import { parseDiagramFile } from '../services/diagramIO'

describe('parseDiagramFile', () => {
  it('parses a valid diagram file', () => {
    const file = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'API' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n1', type: 'labeled', data: { label: '' } },
      ],
    }
    const result = parseDiagramFile(JSON.stringify(file))
    expect(result).not.toBeNull()
    expect(result?.nodes).toHaveLength(1)
    expect(result?.edges).toHaveLength(1)
  })

  it('returns null for invalid JSON', () => {
    expect(parseDiagramFile('not json')).toBeNull()
  })

  it('returns null when nodes array is missing', () => {
    expect(parseDiagramFile(JSON.stringify({ edges: [] }))).toBeNull()
  })

  it('returns null when edges array is missing', () => {
    expect(parseDiagramFile(JSON.stringify({ nodes: [] }))).toBeNull()
  })

  it('returns null for a node missing required fields', () => {
    const file = {
      version: 1,
      nodes: [{ id: 'n1' }], // missing type, position, data.label
      edges: [],
    }
    expect(parseDiagramFile(JSON.stringify(file))).toBeNull()
  })

  it('returns null for an edge missing required fields', () => {
    const file = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'API' } },
      ],
      edges: [{ id: 'e1' }], // missing source, target
    }
    expect(parseDiagramFile(JSON.stringify(file))).toBeNull()
  })

  it('returns null for non-object input', () => {
    expect(parseDiagramFile('"string"')).toBeNull()
    expect(parseDiagramFile('42')).toBeNull()
    expect(parseDiagramFile('null')).toBeNull()
  })

  it('returns null for array input', () => {
    expect(parseDiagramFile('[]')).toBeNull()
  })

  it('returns null for boolean input', () => {
    expect(parseDiagramFile('true')).toBeNull()
  })

  it('returns null when node is missing type', () => {
    const file = {
      version: 1,
      nodes: [{ id: 'n1', position: { x: 0, y: 0 }, data: { label: 'API' } }],
      edges: [],
    }
    expect(parseDiagramFile(JSON.stringify(file))).toBeNull()
  })

  it('returns null when node is missing position', () => {
    const file = {
      version: 1,
      nodes: [{ id: 'n1', type: 'service', data: { label: 'API' } }],
      edges: [],
    }
    expect(parseDiagramFile(JSON.stringify(file))).toBeNull()
  })

  it('returns null when node data.label is missing', () => {
    const file = {
      version: 1,
      nodes: [{ id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
    }
    expect(parseDiagramFile(JSON.stringify(file))).toBeNull()
  })

  it('returns null when edge is missing source', () => {
    const file = {
      version: 1,
      nodes: [{ id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'API' } }],
      edges: [{ id: 'e1', target: 'n1' }],
    }
    expect(parseDiagramFile(JSON.stringify(file))).toBeNull()
  })

  it('returns null when edge is missing target', () => {
    const file = {
      version: 1,
      nodes: [{ id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'API' } }],
      edges: [{ id: 'e1', source: 'n1' }],
    }
    expect(parseDiagramFile(JSON.stringify(file))).toBeNull()
  })

  it('parses a valid empty diagram', () => {
    const file = { version: 1, nodes: [], edges: [] }
    const result = parseDiagramFile(JSON.stringify(file))
    expect(result).not.toBeNull()
    if (!result) throw new Error('expected non-null result')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })

  it('parses a complex diagram with multiple node types and edge protocols', () => {
    const file = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'apiGateway', position: { x: 0, y: 0 }, data: { label: 'Gateway', annotation: 'Entry point' } },
        { id: 'n2', type: 'service', position: { x: 200, y: 100 }, data: { label: 'API', replicaCount: 3 } },
        { id: 'n3', type: 'databaseSql', position: { x: 400, y: 200 }, data: { label: 'DB' } },
        { id: 'n4', type: 'cache', position: { x: 0, y: 200 }, data: { label: 'Redis' } },
        { id: 'n5', type: 'messageQueue', position: { x: 200, y: 300 }, data: { label: 'Queue' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'labeled', data: { label: 'HTTP', protocol: 'http' } },
        { id: 'e2', source: 'n2', target: 'n3', type: 'labeled', data: { label: 'SQL', protocol: 'sql' } },
        { id: 'e3', source: 'n2', target: 'n4', type: 'labeled', data: { label: 'TCP', protocol: 'tcp' } },
        { id: 'e4', source: 'n2', target: 'n5', type: 'labeled', data: { label: 'async', protocol: 'async', syncAsync: 'async' } },
        { id: 'e5', source: 'n1', target: 'n4', type: 'labeled', data: { label: 'WS', protocol: 'websocket', direction: 'bidirectional' } },
      ],
    }

    const result = parseDiagramFile(JSON.stringify(file))
    expect(result).not.toBeNull()
    if (!result) throw new Error('expected non-null result')
    expect(result.nodes).toHaveLength(5)
    expect(result.edges).toHaveLength(5)
  })

  it('round-trip: serialize -> stringify -> parse preserves structure', () => {
    const file = {
      version: 1,
      nodes: [
        { id: 'n1', type: 'service', position: { x: 50, y: 75 }, data: { label: 'API', replicaCount: 2, annotation: 'Main service' } },
        { id: 'n2', type: 'cache', position: { x: 300, y: 75 }, data: { label: 'Redis' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'labeled', data: { label: 'TCP', protocol: 'tcp' } },
      ],
    }

    const json = JSON.stringify(file)
    const parsed = parseDiagramFile(json)
    expect(parsed).not.toBeNull()
    if (!parsed) throw new Error('expected non-null result')

    expect(parsed.nodes).toHaveLength(2)
    expect(parsed.edges).toHaveLength(1)

    const apiNode = parsed.nodes.find((n) => n.id === 'n1')
    if (!apiNode) throw new Error('API node not found')
    expect(apiNode.data.label).toBe('API')
    expect(apiNode.data.replicaCount).toBe(2)
    expect(apiNode.data.annotation).toBe('Main service')
    expect(apiNode.position).toEqual({ x: 50, y: 75 })
  })

  it('handles a large graph (50 nodes, 49 edges)', () => {
    const nodes = []
    const edges = []
    for (let i = 0; i < 50; i++) {
      nodes.push({
        id: `n${String(i)}`,
        type: 'service',
        position: { x: i * 100, y: 0 },
        data: { label: `Service ${String(i)}` },
      })
    }
    for (let i = 0; i < 49; i++) {
      edges.push({
        id: `e${String(i)}`,
        source: `n${String(i)}`,
        target: `n${String(i + 1)}`,
        type: 'labeled',
        data: { label: '' },
      })
    }

    const file = { version: 1, nodes, edges }
    const result = parseDiagramFile(JSON.stringify(file))
    expect(result).not.toBeNull()
    if (!result) throw new Error('expected non-null result')
    expect(result.nodes).toHaveLength(50)
    expect(result.edges).toHaveLength(49)
  })

  it('handles nodes with all optional fields present', () => {
    const file = {
      version: 1,
      nodes: [
        {
          id: 'n1',
          type: 'service',
          position: { x: 0, y: 0 },
          data: {
            label: 'Full Node',
            replicaCount: 5,
            annotation: 'This node has all optional fields',
          },
        },
      ],
      edges: [],
    }
    const result = parseDiagramFile(JSON.stringify(file))
    expect(result).not.toBeNull()
    if (!result) throw new Error('expected non-null result')
    const node = result.nodes[0]
    if (!node) throw new Error('node not found')
    expect(node.data.label).toBe('Full Node')
    expect(node.data.replicaCount).toBe(5)
    expect(node.data.annotation).toBe('This node has all optional fields')
  })

  it('returns null for deeply nested invalid structure', () => {
    const file = {
      version: 1,
      nodes: [
        {
          id: 'n1',
          type: 'service',
          position: { x: 0, y: 0 },
          data: { label: 'Valid' },
        },
        {
          id: 'n2',
          type: 'service',
          position: { x: 100, y: 0 },
          data: { label: '' }, // empty label is falsy
        },
      ],
      edges: [],
    }
    expect(parseDiagramFile(JSON.stringify(file))).toBeNull()
  })
})
