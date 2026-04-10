import { describe, it, expect } from 'vitest'
import { computeDelta, isDeltaEmpty } from '../services/graphDelta'
import type { GraphState } from '../types/graph'

describe('computeDelta', () => {
  it('treats all nodes/edges as added when previous is null', () => {
    const current: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } }],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: '' }],
    }
    const delta = computeDelta(null, current)
    expect(delta.addedNodes).toHaveLength(1)
    expect(delta.addedNodes[0]).toEqual({ type: 'service', name: 'API' })
    expect(delta.addedEdges).toHaveLength(1)
    expect(delta.removedNodes).toHaveLength(0)
    expect(delta.removedEdges).toHaveLength(0)
  })

  it('detects added nodes', () => {
    const prev: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } }],
      edges: [],
    }
    const curr: GraphState = {
      nodes: [
        { id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'cache', name: 'Redis', position: { x: 100, y: 0 } },
      ],
      edges: [],
    }
    const delta = computeDelta(prev, curr)
    expect(delta.addedNodes).toHaveLength(1)
    expect(delta.addedNodes[0]).toEqual({ type: 'cache', name: 'Redis' })
    expect(delta.removedNodes).toHaveLength(0)
  })

  it('detects removed nodes', () => {
    const prev: GraphState = {
      nodes: [
        { id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'cache', name: 'Redis', position: { x: 100, y: 0 } },
      ],
      edges: [],
    }
    const curr: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } }],
      edges: [],
    }
    const delta = computeDelta(prev, curr)
    expect(delta.removedNodes).toHaveLength(1)
    expect(delta.removedNodes[0]).toEqual({ type: 'cache', name: 'Redis' })
    expect(delta.addedNodes).toHaveLength(0)
  })

  it('detects added edges', () => {
    const prev: GraphState = {
      nodes: [
        { id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'databaseSql', name: 'DB', position: { x: 100, y: 0 } },
      ],
      edges: [],
    }
    const curr: GraphState = {
      nodes: [
        { id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'databaseSql', name: 'DB', position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: '', protocol: 'sql' }],
    }
    const delta = computeDelta(prev, curr)
    expect(delta.addedEdges).toHaveLength(1)
    expect(delta.addedEdges[0]).toEqual({ source: 'API', target: 'DB', protocol: 'sql' })
  })

  it('detects removed edges', () => {
    const prev: GraphState = {
      nodes: [
        { id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'databaseSql', name: 'DB', position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: '', protocol: 'sql' }],
    }
    const curr: GraphState = {
      nodes: [
        { id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'databaseSql', name: 'DB', position: { x: 100, y: 0 } },
      ],
      edges: [],
    }
    const delta = computeDelta(prev, curr)
    expect(delta.removedEdges).toHaveLength(1)
    expect(delta.removedEdges[0]).toEqual({ source: 'API', target: 'DB', protocol: 'sql' })
  })

  it('detects node rename as modification', () => {
    const prev: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } }],
      edges: [],
    }
    const curr: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'Gateway', position: { x: 0, y: 0 } }],
      edges: [],
    }
    const delta = computeDelta(prev, curr)
    expect(delta.modifiedNodes).toHaveLength(1)
    expect(delta.modifiedNodes[0]).toEqual({
      name: 'Gateway',
      field: 'name',
      oldValue: 'API',
      newValue: 'Gateway',
    })
  })

  it('detects edge protocol change as modification', () => {
    const prev: GraphState = {
      nodes: [
        { id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'databaseSql', name: 'DB', position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: '', protocol: 'http' }],
    }
    const curr: GraphState = {
      nodes: [
        { id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } },
        { id: 'n2', type: 'databaseSql', name: 'DB', position: { x: 100, y: 0 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', label: '', protocol: 'grpc' }],
    }
    const delta = computeDelta(prev, curr)
    expect(delta.modifiedEdges).toHaveLength(1)
    expect(delta.modifiedEdges[0]).toEqual({
      name: 'API -> DB',
      field: 'protocol',
      oldValue: 'http',
      newValue: 'grpc',
    })
  })

  it('returns empty delta when nothing changed', () => {
    const state: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } }],
      edges: [],
    }
    const delta = computeDelta(state, state)
    expect(isDeltaEmpty(delta)).toBe(true)
  })

  it('ignores position-only changes', () => {
    const prev: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 } }],
      edges: [],
    }
    const curr: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 500, y: 300 } }],
      edges: [],
    }
    const delta = computeDelta(prev, curr)
    expect(isDeltaEmpty(delta)).toBe(true)
  })

  it('detects replica count change', () => {
    const prev: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 }, replicaCount: 1 }],
      edges: [],
    }
    const curr: GraphState = {
      nodes: [{ id: 'n1', type: 'service', name: 'API', position: { x: 0, y: 0 }, replicaCount: 3 }],
      edges: [],
    }
    const delta = computeDelta(prev, curr)
    expect(delta.modifiedNodes).toHaveLength(1)
    expect(delta.modifiedNodes[0]?.field).toBe('replicaCount')
    expect(delta.modifiedNodes[0]?.oldValue).toBe('1')
    expect(delta.modifiedNodes[0]?.newValue).toBe('3')
  })
})

describe('isDeltaEmpty', () => {
  it('returns true for empty delta', () => {
    expect(isDeltaEmpty({
      addedNodes: [],
      removedNodes: [],
      addedEdges: [],
      removedEdges: [],
      modifiedNodes: [],
      modifiedEdges: [],
    })).toBe(true)
  })

  it('returns false when any array is non-empty', () => {
    expect(isDeltaEmpty({
      addedNodes: [{ type: 'service', name: 'X' }],
      removedNodes: [],
      addedEdges: [],
      removedEdges: [],
      modifiedNodes: [],
      modifiedEdges: [],
    })).toBe(false)
  })
})
