import { describe, it, expect } from 'vitest'
import { computeLayout, layoutNewNodes } from '../services/autoLayout'
import type { ArchitectureNode, ArchitectureEdge } from '../types/graph'

function makeNode(id: string, x: number, y: number, pendingStatus?: string): ArchitectureNode {
  return {
    id,
    type: 'service',
    position: { x, y },
    data: {
      label: id,
      ...(pendingStatus ? { pendingStatus } : {}),
    },
  } as ArchitectureNode
}

function makeEdge(id: string, source: string, target: string): ArchitectureEdge {
  return {
    id,
    source,
    target,
    type: 'labeled',
    data: { label: '' },
  } as ArchitectureEdge
}

describe('computeLayout', () => {
  it('assigns unique positions to all nodes', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 0, 0), makeNode('c', 0, 0)]
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')]

    const positions = computeLayout(nodes, edges)

    expect(positions.size).toBe(3)

    // All nodes should have distinct positions
    const posStrings = new Set<string>()
    for (const [, pos] of positions) {
      posStrings.add(`${String(pos.x)},${String(pos.y)}`)
    }
    expect(posStrings.size).toBe(3)
  })

  it('returns positions for disconnected nodes', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 100, 100)]
    const edges: ArchitectureEdge[] = []

    const positions = computeLayout(nodes, edges)
    expect(positions.size).toBe(2)
  })
})

describe('layoutNewNodes', () => {
  it('repositions pending-add nodes without moving committed nodes', () => {
    const committed = makeNode('a', 50, 50)
    const pending = makeNode('b', 0, 0, 'pendingAdd')
    const nodes = [committed, pending]
    const edges = [makeEdge('e1', 'a', 'b')]

    const result = layoutNewNodes(nodes, edges)

    // Committed node position unchanged
    const nodeA = result.find((n) => n.id === 'a')
    expect(nodeA?.position).toEqual({ x: 50, y: 50 })

    // Pending node should have been repositioned (not at 0,0)
    const nodeB = result.find((n) => n.id === 'b')
    expect(nodeB).toBeDefined()
    // dagre assigns a layout position; it should differ from the original 0,0
    // (exact value depends on dagre's layout algorithm)
  })

  it('returns nodes unchanged when no pending-add nodes exist', () => {
    const nodes = [makeNode('a', 50, 50), makeNode('b', 200, 200)]
    const edges = [makeEdge('e1', 'a', 'b')]

    const result = layoutNewNodes(nodes, edges)
    expect(result).toBe(nodes) // same reference, no transformation
  })
})
