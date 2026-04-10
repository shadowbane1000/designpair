import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef, useState } from 'react'
import { useSuggestions } from '../hooks/useSuggestions'
import type { ArchitectureNode, ArchitectureEdge } from '../types/graph'
import { MarkerType } from '@xyflow/react'

// --- Helpers ---

function at<T>(arr: T[], idx: number): T {
  const item = arr[idx]
  if (item === undefined) throw new Error(`Expected item at index ${String(idx)}`)
  return item
}

function makeNode(id: string, label: string, type = 'service' as const): ArchitectureNode {
  return { id, type, position: { x: 0, y: 0 }, data: { label } }
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  protocol?: string,
  direction = 'oneWay',
  syncAsync = 'sync',
): ArchitectureEdge {
  return {
    id,
    source,
    target,
    type: 'labeled',
    data: { label: protocol ?? '', protocol, direction, syncAsync },
    markerEnd: { type: MarkerType.ArrowClosed },
  } as ArchitectureEdge
}

/**
 * Test wrapper: creates state + refs that useSuggestions needs,
 * pre-populated with initial committed nodes/edges.
 */
function useSuggestionsTestHarness(
  initialNodes: ArchitectureNode[],
  initialEdges: ArchitectureEdge[],
) {
  const [nodes, setNodesRaw] = useState(initialNodes)
  const [edges, setEdgesRaw] = useState(initialEdges)
  const nodesRef = useRef(initialNodes)
  const edgesRef = useRef(initialEdges)

  // Wrap setters to keep refs in sync
  const setNodes = (updater: (ns: ArchitectureNode[]) => ArchitectureNode[]) => {
    setNodesRaw((prev) => {
      const next = updater(prev)
      ;(nodesRef as { current: ArchitectureNode[] }).current = next
      return next
    })
  }
  const setEdges = (updater: (es: ArchitectureEdge[]) => ArchitectureEdge[]) => {
    setEdgesRaw((prev) => {
      const next = updater(prev)
      ;(edgesRef as { current: ArchitectureEdge[] }).current = next
      return next
    })
  }

  const suggestions = useSuggestions(setNodes, setEdges, nodesRef, edgesRef)
  return { ...suggestions, nodes, edges }
}

// --- Tests ---

describe('useSuggestions — flattening', () => {
  describe('node flattening', () => {
    it('add then delete same node cancels both', () => {
      const { result } = renderHook(() => useSuggestionsTestHarness([], []))

      act(() => { result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' }) })
      expect(result.current.suggestions.additions.nodes).toHaveLength(1)

      act(() => { result.current.addSuggestion('delete_node', { name: 'Redis' }) })
      expect(result.current.suggestions.additions.nodes).toHaveLength(0)
      expect(result.current.hasPending).toBe(false)
    })

    it('delete committed node then re-add same name cancels deletion', () => {
      const nodes = [makeNode('n1', 'API')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('delete_node', { name: 'API' }) })
      expect(result.current.suggestions.deletions.nodeIds).toContain('n1')

      act(() => { result.current.addSuggestion('add_node', { type: 'service', name: 'API' }) })
      expect(result.current.suggestions.deletions.nodeIds).not.toContain('n1')
      expect(result.current.suggestions.additions.nodes).toHaveLength(0)
      expect(result.current.hasPending).toBe(false)
    })

    it('delete committed then add different name = two separate operations', () => {
      const nodes = [makeNode('n1', 'API')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('delete_node', { name: 'API' }) })
      act(() => { result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' }) })

      expect(result.current.suggestions.deletions.nodeIds).toContain('n1')
      expect(result.current.suggestions.additions.nodes).toHaveLength(1)
      expect(at(result.current.suggestions.additions.nodes, 0).name).toBe('Redis')
    })

    it('modify then modify same node (latest wins)', () => {
      const nodes = [makeNode('n1', 'API')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('modify_node', { name: 'API', new_name: 'Gateway' }) })
      act(() => { result.current.addSuggestion('modify_node', { name: 'API', new_name: 'Router' }) })

      expect(result.current.suggestions.modifications.nodes).toHaveLength(1)
      expect(at(result.current.suggestions.modifications.nodes, 0).newValues.name).toBe('Router')
      expect(at(result.current.suggestions.modifications.nodes, 0).oldValues.name).toBe('API')
    })

    it('modify a pending-add node applies directly', () => {
      const { result } = renderHook(() => useSuggestionsTestHarness([], []))

      act(() => { result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' }) })
      act(() => { result.current.addSuggestion('modify_node', { name: 'Redis', new_name: 'Memcached', replica_count: 3 }) })

      expect(result.current.suggestions.modifications.nodes).toHaveLength(0)
      expect(at(result.current.suggestions.additions.nodes, 0).name).toBe('Memcached')
      expect(at(result.current.suggestions.additions.nodes, 0).replicaCount).toBe(3)
    })
  })

  describe('edge flattening', () => {
    it('add edge then modify it applies to pending add', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('add_edge', { source: 'API', target: 'DB', protocol: 'http', direction: 'oneWay' }) })
      act(() => {
        result.current.addSuggestion('modify_edge', {
          source: 'API', target: 'DB', protocol: 'http', direction: 'oneWay', new_protocol: 'grpc',
        })
      })

      expect(result.current.suggestions.modifications.edges).toHaveLength(0)
      expect(at(result.current.suggestions.additions.edges, 0).protocol).toBe('grpc')
    })

    it('delete pending-add edge removes it', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('add_edge', { source: 'API', target: 'DB', protocol: 'http' }) })
      expect(result.current.suggestions.additions.edges).toHaveLength(1)

      act(() => { result.current.addSuggestion('delete_edge', { source: 'API', target: 'DB', protocol: 'http' }) })
      expect(result.current.suggestions.additions.edges).toHaveLength(0)
      expect(result.current.hasPending).toBe(false)
    })

    it('delete committed edge then add same-identity cancels deletion', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const edges = [makeEdge('e1', 'n1', 'n2', 'http', 'oneWay')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, edges))

      act(() => { result.current.addSuggestion('delete_edge', { source: 'API', target: 'DB', protocol: 'http', direction: 'oneWay' }) })
      expect(result.current.suggestions.deletions.edgeIds).toContain('e1')

      act(() => { result.current.addSuggestion('add_edge', { source: 'API', target: 'DB', protocol: 'http', direction: 'oneWay' }) })
      expect(result.current.suggestions.deletions.edgeIds).not.toContain('e1')
      expect(result.current.suggestions.additions.edges).toHaveLength(0)
    })

    it('delete edge then add different-protocol edge = two separate operations', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const edges = [makeEdge('e1', 'n1', 'n2', 'http', 'oneWay')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, edges))

      act(() => { result.current.addSuggestion('delete_edge', { source: 'API', target: 'DB', protocol: 'http', direction: 'oneWay' }) })
      act(() => { result.current.addSuggestion('add_edge', { source: 'API', target: 'DB', protocol: 'grpc', direction: 'oneWay' }) })

      expect(result.current.suggestions.deletions.edgeIds).toContain('e1')
      expect(result.current.suggestions.additions.edges).toHaveLength(1)
      expect(at(result.current.suggestions.additions.edges, 0).protocol).toBe('grpc')
    })

    it('modify then modify same edge (latest wins)', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const edges = [makeEdge('e1', 'n1', 'n2', 'http', 'oneWay')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, edges))

      act(() => {
        result.current.addSuggestion('modify_edge', {
          source: 'API', target: 'DB', protocol: 'http', direction: 'oneWay', new_protocol: 'grpc',
        })
      })
      act(() => {
        result.current.addSuggestion('modify_edge', {
          source: 'API', target: 'DB', protocol: 'http', direction: 'oneWay', new_protocol: 'sql',
        })
      })

      expect(result.current.suggestions.modifications.edges).toHaveLength(1)
      expect(at(result.current.suggestions.modifications.edges, 0).newValues.protocol).toBe('sql')
      expect(at(result.current.suggestions.modifications.edges, 0).oldValues.protocol).toBe('http')
    })
  })

  describe('node deletion cascades edges', () => {
    it('deleting a committed node also marks its edges as pending-delete', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB'), makeNode('n3', 'Cache')]
      const edges = [
        makeEdge('e1', 'n1', 'n2', 'http'),
        makeEdge('e2', 'n1', 'n3', 'tcp'),
        makeEdge('e3', 'n2', 'n3', 'sql'),
      ]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, edges))

      act(() => { result.current.addSuggestion('delete_node', { name: 'API' }) })

      expect(result.current.suggestions.deletions.nodeIds).toContain('n1')
      expect(result.current.suggestions.deletions.edgeIds).toContain('e1')
      expect(result.current.suggestions.deletions.edgeIds).toContain('e2')
      expect(result.current.suggestions.deletions.edgeIds).not.toContain('e3')
    })
  })

  describe('React Flow integration', () => {
    it('pending-add nodes appear in React Flow state', () => {
      const { result } = renderHook(() => useSuggestionsTestHarness([], []))
      act(() => { result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' }) })

      expect(result.current.nodes).toHaveLength(1)
      expect(at(result.current.nodes, 0).data.pendingStatus).toBe('pendingAdd')
      expect(at(result.current.nodes, 0).data.label).toBe('Redis')
    })

    it('pending-delete nodes show in React Flow state', () => {
      const nodes = [makeNode('n1', 'API')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))
      act(() => { result.current.addSuggestion('delete_node', { name: 'API' }) })

      expect(at(result.current.nodes, 0).data.pendingStatus).toBe('pendingDelete')
    })

    it('pending-modify nodes show new values', () => {
      const nodes = [makeNode('n1', 'API')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))
      act(() => { result.current.addSuggestion('modify_node', { name: 'API', new_name: 'Gateway' }) })

      const merged = at(result.current.nodes, 0)
      expect(merged.data.pendingStatus).toBe('pendingModify')
      expect(merged.data.label).toBe('Gateway')
      expect(merged.data.pendingOldValues?.name).toBe('API')
    })
  })

  describe('discardAll', () => {
    it('clears all suggestions and restores committed state', () => {
      const nodes = [makeNode('n1', 'API')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => {
        result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' })
        result.current.addSuggestion('delete_node', { name: 'API' })
      })
      expect(result.current.hasPending).toBe(true)

      act(() => { result.current.discardAll() })
      expect(result.current.hasPending).toBe(false)
      // Only committed node remains, no pending status
      expect(result.current.nodes).toHaveLength(1)
      expect(at(result.current.nodes, 0).data.label).toBe('API')
    })
  })

  describe('approveAll', () => {
    it('strips pending status, keeping all nodes', () => {
      const nodes = [makeNode('n1', 'API')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' }) })
      expect(result.current.nodes).toHaveLength(2)

      act(() => { result.current.approveAll() })
      expect(result.current.hasPending).toBe(false)
      expect(result.current.nodes).toHaveLength(2)
      // No pendingStatus on any node
      for (const n of result.current.nodes) {
        expect(n.data.pendingStatus).toBeUndefined()
      }
    })
  })

  describe('pending name resolution', () => {
    it('rename then rename again (chain modification)', () => {
      const nodes = [makeNode('n1', 'Service')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('modify_node', { name: 'Service', new_name: 'blah' }) })
      expect(at(result.current.suggestions.modifications.nodes, 0).newValues.name).toBe('blah')

      // AI references the node by its pending name
      act(() => { result.current.addSuggestion('modify_node', { name: 'blah', new_name: 'asdf' }) })
      expect(result.current.suggestions.modifications.nodes).toHaveLength(1)
      expect(at(result.current.suggestions.modifications.nodes, 0).newValues.name).toBe('asdf')
      expect(at(result.current.suggestions.modifications.nodes, 0).oldValues.name).toBe('Service')
    })

    it('rename then revert to original cancels modification', () => {
      const nodes = [makeNode('n1', 'Service')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('modify_node', { name: 'Service', new_name: 'blah' }) })
      expect(result.current.hasPending).toBe(true)

      act(() => { result.current.addSuggestion('modify_node', { name: 'blah', new_name: 'Service' }) })
      expect(result.current.hasPending).toBe(false)
      expect(result.current.suggestions.modifications.nodes).toHaveLength(0)
    })

    it('rename then rename then revert cancels modification', () => {
      const nodes = [makeNode('n1', 'Service')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('modify_node', { name: 'Service', new_name: 'A' }) })
      act(() => { result.current.addSuggestion('modify_node', { name: 'A', new_name: 'B' }) })
      act(() => { result.current.addSuggestion('modify_node', { name: 'B', new_name: 'Service' }) })
      expect(result.current.hasPending).toBe(false)
    })

    it('rename then delete by pending name', () => {
      const nodes = [makeNode('n1', 'Service')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('modify_node', { name: 'Service', new_name: 'blah' }) })
      act(() => { result.current.addSuggestion('delete_node', { name: 'blah' }) })

      // Modification should be cleared, node should be pending-delete
      expect(result.current.suggestions.modifications.nodes).toHaveLength(0)
      expect(result.current.suggestions.deletions.nodeIds).toContain('n1')
    })

    it('modify replica then revert replica cancels modification', () => {
      const nodes = [makeNode('n1', 'Service')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('modify_node', { name: 'Service', replica_count: 3 }) })
      expect(result.current.hasPending).toBe(true)

      act(() => { result.current.addSuggestion('modify_node', { name: 'Service', replica_count: 1 }) })
      expect(result.current.hasPending).toBe(false)
    })

    it('edge operations use pending-renamed node names', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const edges = [makeEdge('e1', 'n1', 'n2', 'http', 'oneWay')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, edges))

      // Rename API → Gateway
      act(() => { result.current.addSuggestion('modify_node', { name: 'API', new_name: 'Gateway' }) })

      // Add edge using the pending name
      act(() => { result.current.addSuggestion('add_edge', { source: 'Gateway', target: 'DB', protocol: 'grpc' }) })
      expect(result.current.suggestions.additions.edges).toHaveLength(1)
      // Edge should reference the committed node ID
      expect(at(result.current.suggestions.additions.edges, 0).source).toBe('n1')
    })

    it('delete edge referencing pending-renamed node', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const edges = [makeEdge('e1', 'n1', 'n2', 'http', 'oneWay')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, edges))

      // Rename API → Gateway
      act(() => { result.current.addSuggestion('modify_node', { name: 'API', new_name: 'Gateway' }) })

      // Delete edge using the pending name
      act(() => { result.current.addSuggestion('delete_edge', { source: 'Gateway', target: 'DB', protocol: 'http', direction: 'oneWay' }) })
      expect(result.current.suggestions.deletions.edgeIds).toContain('e1')
    })
  })

  describe('edge cascade on node deletion with pending edges', () => {
    it('deleting a node also removes pending-add edges connected to it', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      // Add a pending node and edges to it
      act(() => { result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' }) })
      act(() => { result.current.addSuggestion('add_edge', { source: 'API', target: 'Redis', protocol: 'tcp' }) })
      expect(result.current.suggestions.additions.edges).toHaveLength(1)

      // Delete the pending node — its pending edge should vanish
      act(() => { result.current.addSuggestion('delete_node', { name: 'Redis' }) })
      expect(result.current.suggestions.additions.nodes).toHaveLength(0)
      expect(result.current.suggestions.additions.edges).toHaveLength(0)
    })

    it('deleting committed node cascades to committed edges and removes pending edge modifications', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB'), makeNode('n3', 'Cache')]
      const edges = [
        makeEdge('e1', 'n1', 'n2', 'http'),
        makeEdge('e2', 'n1', 'n3', 'tcp'),
      ]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, edges))

      // Modify edge e1 first
      act(() => {
        result.current.addSuggestion('modify_edge', {
          source: 'API', target: 'DB', protocol: 'http', direction: 'oneWay', new_protocol: 'grpc',
        })
      })
      expect(result.current.suggestions.modifications.edges).toHaveLength(1)

      // Delete API node — should cascade edges and clear the edge modification
      act(() => { result.current.addSuggestion('delete_node', { name: 'API' }) })
      expect(result.current.suggestions.deletions.nodeIds).toContain('n1')
      expect(result.current.suggestions.deletions.edgeIds).toContain('e1')
      expect(result.current.suggestions.deletions.edgeIds).toContain('e2')
      // Edge modification for e1 should be cleared since the edge is being deleted
      expect(result.current.suggestions.modifications.edges).toHaveLength(0)
    })
  })

  describe('approveAll — detailed', () => {
    it('pending-add nodes become committed, pending-delete nodes are removed', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const edges = [makeEdge('e1', 'n1', 'n2', 'http')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, edges))

      // Add a node, delete a node, modify an edge
      act(() => { result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' }) })
      act(() => { result.current.addSuggestion('delete_node', { name: 'DB' }) })

      expect(result.current.nodes).toHaveLength(3) // API + Redis + DB (pending-delete)

      act(() => { result.current.approveAll() })

      // DB should be removed, Redis should be committed
      expect(result.current.hasPending).toBe(false)
      expect(result.current.nodes).toHaveLength(2)
      const nodeLabels = result.current.nodes.map((n) => n.data.label)
      expect(nodeLabels).toContain('API')
      expect(nodeLabels).toContain('Redis')
      expect(nodeLabels).not.toContain('DB')

      // No node should have pending status
      for (const n of result.current.nodes) {
        expect(n.data.pendingStatus).toBeUndefined()
      }
    })

    it('pending-add edges survive approval, pending-delete edges are removed', () => {
      const nodes = [makeNode('n1', 'API'), makeNode('n2', 'DB')]
      const edges = [makeEdge('e1', 'n1', 'n2', 'http')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, edges))

      // Delete committed edge, add a new one
      act(() => { result.current.addSuggestion('delete_edge', { source: 'API', target: 'DB', protocol: 'http', direction: 'oneWay' }) })
      act(() => { result.current.addSuggestion('add_edge', { source: 'API', target: 'DB', protocol: 'grpc' }) })

      act(() => { result.current.approveAll() })

      expect(result.current.hasPending).toBe(false)
      // Old http edge should be gone, new grpc edge should remain
      expect(result.current.edges).toHaveLength(1)
      const edge = at(result.current.edges, 0)
      expect(edge.data?.protocol).toBe('grpc')
      expect(edge.data?.pendingStatus).toBeUndefined()
    })

    it('pending-modify node shows new values after approval', () => {
      const nodes = [makeNode('n1', 'API')]
      const { result } = renderHook(() => useSuggestionsTestHarness(nodes, []))

      act(() => { result.current.addSuggestion('modify_node', { name: 'API', new_name: 'Gateway', replica_count: 3 }) })
      act(() => { result.current.approveAll() })

      expect(result.current.hasPending).toBe(false)
      const node = at(result.current.nodes, 0)
      expect(node.data.label).toBe('Gateway')
      expect(node.data.replicaCount).toBe(3)
      expect(node.data.pendingStatus).toBeUndefined()
    })
  })

  describe('auto-layout integration', () => {
    it('pending-add nodes get repositioned near their connected neighbors', () => {
      const nodes = [makeNode('n1', 'API')]
      // Place API at a specific position
      const nodesWithPos = nodes.map((n) => ({ ...n, position: { x: 300, y: 100 } }))
      const { result } = renderHook(() => useSuggestionsTestHarness(nodesWithPos, []))

      act(() => { result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' }) })
      act(() => { result.current.addSuggestion('add_edge', { source: 'API', target: 'Redis', protocol: 'tcp' }) })

      // Redis should have been positioned near API (300, 100), offset 200px below
      const redis = result.current.nodes.find((n) => n.data.label === 'Redis')
      if (!redis) throw new Error('Redis node not found')
      expect(redis.position.x).toBe(300)
      expect(redis.position.y).toBe(300) // 100 + 200 offset
    })

    it('multiple unconnected pending nodes get stacked without overlapping', () => {
      const nodes = [makeNode('n1', 'API')]
      const nodesWithPos = nodes.map((n) => ({ ...n, position: { x: 200, y: 100 } }))
      const { result } = renderHook(() => useSuggestionsTestHarness(nodesWithPos, []))

      act(() => { result.current.addSuggestion('add_node', { type: 'cache', name: 'Redis' }) })
      act(() => { result.current.addSuggestion('add_node', { type: 'databaseSql', name: 'DB' }) })

      const redis = result.current.nodes.find((n) => n.data.label === 'Redis')
      const db = result.current.nodes.find((n) => n.data.label === 'DB')
      if (!redis) throw new Error('Redis not found')
      if (!db) throw new Error('DB not found')

      // Both should be positioned, and they should not overlap
      const samePos = redis.position.x === db.position.x && redis.position.y === db.position.y
      expect(samePos).toBe(false)
    })
  })
})
