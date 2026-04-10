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
      { id: 'n2', type: 'databaseSql', position: { x: 200, y: 0 }, data: { label: 'DB' } },
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
      { id: 'n2', type: 'databaseSql', position: { x: 200, y: 0 }, data: { label: 'DB' } },
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

  it('includes replicaCount when > 1', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'API', replicaCount: 3 } },
    ]
    const result = serializeGraph(nodes, [])
    expect(result.nodes[0]?.replicaCount).toBe(3)
  })

  it('omits replicaCount when 1 or undefined', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A', replicaCount: 1 } },
      { id: 'n2', type: 'service', position: { x: 100, y: 0 }, data: { label: 'B' } },
    ]
    const result = serializeGraph(nodes, [])
    expect(result.nodes[0]?.replicaCount).toBeUndefined()
    expect(result.nodes[1]?.replicaCount).toBeUndefined()
  })

  it('serializes new component types', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'apiGateway', position: { x: 0, y: 0 }, data: { label: 'Gateway' } },
      { id: 'n2', type: 'iotClient', position: { x: 100, y: 0 }, data: { label: 'Sensors' } },
    ]
    const result = serializeGraph(nodes, [])
    expect(result.nodes[0]?.type).toBe('apiGateway')
    expect(result.nodes[1]?.type).toBe('iotClient')
  })

  it('includes annotation when non-empty', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'API', annotation: 'Handles REST' } },
    ]
    const result = serializeGraph(nodes, [])
    expect(result.nodes[0]?.annotation).toBe('Handles REST')
  })

  it('omits annotation when empty or undefined', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A', annotation: '' } },
      { id: 'n2', type: 'service', position: { x: 100, y: 0 }, data: { label: 'B' } },
    ]
    const result = serializeGraph(nodes, [])
    expect(result.nodes[0]?.annotation).toBeUndefined()
    expect(result.nodes[1]?.annotation).toBeUndefined()
  })

  it('includes edge protocol when set', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'API' } },
      { id: 'n2', type: 'databaseSql', position: { x: 200, y: 0 }, data: { label: 'DB' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: 'gRPC', protocol: 'grpc' } },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.edges[0]?.protocol).toBe('grpc')
  })

  it('includes edge direction when bidirectional', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', type: 'service', position: { x: 200, y: 0 }, data: { label: 'B' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: 'WS', protocol: 'websocket', direction: 'bidirectional' } },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.edges[0]?.direction).toBe('bidirectional')
  })

  it('omits edge direction when oneWay (default)', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', type: 'service', position: { x: 200, y: 0 }, data: { label: 'B' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: 'HTTP', protocol: 'http', direction: 'oneWay' } },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.edges[0]?.direction).toBeUndefined()
  })

  it('includes syncAsync when async', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', type: 'messageQueue', position: { x: 200, y: 0 }, data: { label: 'Q' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: 'async', protocol: 'async', syncAsync: 'async' } },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.edges[0]?.syncAsync).toBe('async')
  })

  it('omits syncAsync when sync (default)', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'n2', type: 'service', position: { x: 200, y: 0 }, data: { label: 'B' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: 'HTTP', protocol: 'http', syncAsync: 'sync' } },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.edges[0]?.syncAsync).toBeUndefined()
  })
})

describe('serializeGraph — round-trip', () => {
  it('preserves a complex multi-node topology through serialize', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'apiGateway', position: { x: 100, y: 0 }, data: { label: 'Gateway', annotation: 'Main entry' } },
      { id: 'n2', type: 'service', position: { x: 0, y: 200 }, data: { label: 'Auth Service', replicaCount: 3 } },
      { id: 'n3', type: 'databaseSql', position: { x: 200, y: 200 }, data: { label: 'Users DB' } },
      { id: 'n4', type: 'cache', position: { x: 400, y: 200 }, data: { label: 'Redis', replicaCount: 2, annotation: 'Session store' } },
      { id: 'n5', type: 'messageQueue', position: { x: 0, y: 400 }, data: { label: 'Events Queue' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: 'gRPC', protocol: 'grpc', direction: 'oneWay', syncAsync: 'sync' } },
      { id: 'e2', source: 'n2', target: 'n3', data: { label: 'SQL', protocol: 'sql' } },
      { id: 'e3', source: 'n2', target: 'n4', data: { label: 'TCP', protocol: 'tcp' } },
      { id: 'e4', source: 'n1', target: 'n4', data: { label: 'WebSocket', protocol: 'websocket', direction: 'bidirectional', syncAsync: 'async' } },
      { id: 'e5', source: 'n2', target: 'n5', data: { label: 'async', protocol: 'async', syncAsync: 'async' } },
    ]

    const serialized = serializeGraph(nodes, edges)

    // Verify node count and structure
    expect(serialized.nodes).toHaveLength(5)
    expect(serialized.edges).toHaveLength(5)

    // Verify annotated node
    const gateway = serialized.nodes.find((n) => n.id === 'n1')
    expect(gateway).toBeDefined()
    if (!gateway) throw new Error('gateway not found')
    expect(gateway.type).toBe('apiGateway')
    expect(gateway.name).toBe('Gateway')
    expect(gateway.annotation).toBe('Main entry')

    // Verify replicated node
    const authService = serialized.nodes.find((n) => n.id === 'n2')
    expect(authService).toBeDefined()
    if (!authService) throw new Error('authService not found')
    expect(authService.replicaCount).toBe(3)

    // Verify node with both replica + annotation
    const redis = serialized.nodes.find((n) => n.id === 'n4')
    expect(redis).toBeDefined()
    if (!redis) throw new Error('redis not found')
    expect(redis.replicaCount).toBe(2)
    expect(redis.annotation).toBe('Session store')

    // Verify bidirectional async edge
    const wsEdge = serialized.edges.find((e) => e.id === 'e4')
    expect(wsEdge).toBeDefined()
    if (!wsEdge) throw new Error('wsEdge not found')
    expect(wsEdge.protocol).toBe('websocket')
    expect(wsEdge.direction).toBe('bidirectional')
    expect(wsEdge.syncAsync).toBe('async')

    // Verify default-direction edge omits direction
    const grpcEdge = serialized.edges.find((e) => e.id === 'e1')
    expect(grpcEdge).toBeDefined()
    if (!grpcEdge) throw new Error('grpcEdge not found')
    expect(grpcEdge.direction).toBeUndefined()

    // Verify positions are preserved
    expect(gateway.position).toEqual({ x: 100, y: 0 })
    expect(authService.position).toEqual({ x: 0, y: 200 })
  })

  it('round-trip: serialize then JSON parse preserves data', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 50, y: 75 }, data: { label: 'API', replicaCount: 2, annotation: 'Primary API' } },
      { id: 'n2', type: 'cache', position: { x: 300, y: 75 }, data: { label: 'Cache' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n2', data: { label: 'TCP', protocol: 'tcp', direction: 'oneWay', syncAsync: 'sync' } },
    ]

    const serialized = serializeGraph(nodes, edges)
    const json = JSON.stringify(serialized)
    const deserialized = JSON.parse(json) as typeof serialized

    expect(deserialized.nodes).toHaveLength(2)
    expect(deserialized.edges).toHaveLength(1)

    const api = deserialized.nodes.find((n) => n.id === 'n1')
    if (!api) throw new Error('api not found')
    expect(api.name).toBe('API')
    expect(api.replicaCount).toBe(2)
    expect(api.annotation).toBe('Primary API')
    expect(api.position).toEqual({ x: 50, y: 75 })

    const cache = deserialized.nodes.find((n) => n.id === 'n2')
    if (!cache) throw new Error('cache not found')
    expect(cache.name).toBe('Cache')
    expect(cache.replicaCount).toBeUndefined()
    expect(cache.annotation).toBeUndefined()
  })

  it('handles a single self-loop edge', () => {
    const nodes: ArchitectureNode[] = [
      { id: 'n1', type: 'service', position: { x: 0, y: 0 }, data: { label: 'Recursive' } },
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'n1', target: 'n1', data: { label: 'self', protocol: 'http' } },
    ]
    const result = serializeGraph(nodes, edges)
    expect(result.edges).toHaveLength(1)
    const selfEdge = result.edges[0]
    if (!selfEdge) throw new Error('selfEdge not found')
    expect(selfEdge.source).toBe('n1')
    expect(selfEdge.target).toBe('n1')
    expect(selfEdge.protocol).toBe('http')
  })
})
