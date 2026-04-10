import { describe, it, expect } from 'vitest'
import { pickHandlePositions, routeEdges } from '../services/edgeRouting'
import type { ArchitectureNode, ArchitectureEdge } from '../types/graph'

function makeNode(id: string, x: number, y: number): ArchitectureNode {
  return {
    id,
    type: 'service',
    position: { x, y },
    data: { label: id },
  } as ArchitectureNode
}

describe('pickHandlePositions', () => {
  it('picks right/left for horizontal relationship', () => {
    const source = makeNode('a', 0, 100)
    const target = makeNode('b', 300, 100)
    const result = pickHandlePositions(source, target)
    expect(result).toEqual({ sourceHandle: 'right-source', targetHandle: 'left-target' })
  })

  it('picks left/right when target is to the left', () => {
    const source = makeNode('a', 300, 100)
    const target = makeNode('b', 0, 100)
    const result = pickHandlePositions(source, target)
    expect(result).toEqual({ sourceHandle: 'left-source', targetHandle: 'right-target' })
  })

  it('picks bottom/top for vertical relationship', () => {
    const source = makeNode('a', 100, 0)
    const target = makeNode('b', 100, 300)
    const result = pickHandlePositions(source, target)
    expect(result).toEqual({ sourceHandle: 'bottom-source', targetHandle: 'top-target' })
  })

  it('picks top/bottom when target is above', () => {
    const source = makeNode('a', 100, 300)
    const target = makeNode('b', 100, 0)
    const result = pickHandlePositions(source, target)
    expect(result).toEqual({ sourceHandle: 'top-source', targetHandle: 'bottom-target' })
  })

  it('defaults to bottom/top when nodes are undefined', () => {
    const result = pickHandlePositions(undefined, undefined)
    expect(result).toEqual({ sourceHandle: 'bottom-source', targetHandle: 'top-target' })
  })

  it('defaults to bottom/top when source is undefined', () => {
    const target = makeNode('b', 100, 100)
    const result = pickHandlePositions(undefined, target)
    expect(result).toEqual({ sourceHandle: 'bottom-source', targetHandle: 'top-target' })
  })

  it('defaults to bottom/top when target is undefined', () => {
    const source = makeNode('a', 100, 100)
    const result = pickHandlePositions(source, undefined)
    expect(result).toEqual({ sourceHandle: 'bottom-source', targetHandle: 'top-target' })
  })

  it('picks bottom/top for diagonal where vertical dominates', () => {
    const source = makeNode('a', 0, 0)
    const target = makeNode('b', 50, 300)
    const result = pickHandlePositions(source, target)
    expect(result).toEqual({ sourceHandle: 'bottom-source', targetHandle: 'top-target' })
  })

  it('picks right/left for diagonal where horizontal dominates', () => {
    const source = makeNode('a', 0, 0)
    const target = makeNode('b', 400, 50)
    const result = pickHandlePositions(source, target)
    expect(result).toEqual({ sourceHandle: 'right-source', targetHandle: 'left-target' })
  })

  it('picks vertical for nodes at same x', () => {
    const source = makeNode('a', 100, 0)
    const target = makeNode('b', 100, 500)
    const result = pickHandlePositions(source, target)
    expect(result).toEqual({ sourceHandle: 'bottom-source', targetHandle: 'top-target' })
  })

  it('handles same-position nodes (defaults to vertical)', () => {
    const source = makeNode('a', 100, 100)
    const target = makeNode('b', 100, 100)
    const result = pickHandlePositions(source, target)
    // dx=0, dy=0 -> Math.abs(0) > Math.abs(0) is false -> vertical branch -> dy > 0 is false -> top/bottom
    expect(result).toEqual({ sourceHandle: 'top-source', targetHandle: 'bottom-target' })
  })
})

describe('routeEdges', () => {
  it('assigns handles to edges without existing handles', () => {
    const nodes = [makeNode('a', 0, 100), makeNode('b', 300, 100)]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'a', target: 'b', data: { label: '' } } as ArchitectureEdge,
    ]

    const result = routeEdges(edges, nodes)
    const routed = result[0]
    if (!routed) throw new Error('routed edge not found')
    expect(routed.sourceHandle).toBe('right-source')
    expect(routed.targetHandle).toBe('left-target')
  })

  it('does not override edges that already have handles', () => {
    const nodes = [makeNode('a', 0, 100), makeNode('b', 300, 100)]
    const edges: ArchitectureEdge[] = [
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        sourceHandle: 'top-source',
        targetHandle: 'bottom-target',
        data: { label: '' },
      } as ArchitectureEdge,
    ]

    const result = routeEdges(edges, nodes)
    const routed = result[0]
    if (!routed) throw new Error('routed edge not found')
    expect(routed.sourceHandle).toBe('top-source')
    expect(routed.targetHandle).toBe('bottom-target')
  })

  it('handles missing node gracefully (falls back to default)', () => {
    const nodes = [makeNode('a', 0, 0)]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'a', target: 'nonexistent', data: { label: '' } } as ArchitectureEdge,
    ]

    const result = routeEdges(edges, nodes)
    const routed = result[0]
    if (!routed) throw new Error('routed edge not found')
    expect(routed.sourceHandle).toBe('bottom-source')
    expect(routed.targetHandle).toBe('top-target')
  })

  it('routes multiple edges independently', () => {
    const nodes = [
      makeNode('a', 0, 0),
      makeNode('b', 300, 0),
      makeNode('c', 0, 300),
    ]
    const edges: ArchitectureEdge[] = [
      { id: 'e1', source: 'a', target: 'b', data: { label: '' } } as ArchitectureEdge,
      { id: 'e2', source: 'a', target: 'c', data: { label: '' } } as ArchitectureEdge,
    ]

    const result = routeEdges(edges, nodes)
    // a->b is horizontal (right/left)
    const e1 = result.find((e) => e.id === 'e1')
    if (!e1) throw new Error('e1 not found')
    expect(e1.sourceHandle).toBe('right-source')
    expect(e1.targetHandle).toBe('left-target')

    // a->c is vertical (bottom/top)
    const e2 = result.find((e) => e.id === 'e2')
    if (!e2) throw new Error('e2 not found')
    expect(e2.sourceHandle).toBe('bottom-source')
    expect(e2.targetHandle).toBe('top-target')
  })
})
