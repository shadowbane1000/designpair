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

    // Pending node should be near its neighbor (committed node at 50,50)
    const nodeB = result.find((n) => n.id === 'b')
    if (!nodeB) throw new Error('nodeB not found')
    expect(nodeB.position.x).toBe(50) // same x as neighbor
    expect(nodeB.position.y).toBe(250) // 200px below neighbor
  })

  it('positions pending nodes near connected neighbors regardless of canvas position', () => {
    // Place committed node far from origin
    const committed = makeNode('a', 500, 500)
    const pending = makeNode('b', 0, 0, 'pendingAdd')
    const nodes = [committed, pending]
    const edges = [makeEdge('e1', 'a', 'b')]

    const result = layoutNewNodes(nodes, edges)

    const nodeB = result.find((n) => n.id === 'b')
    if (!nodeB) throw new Error('nodeB not found')
    // Should be placed near the neighbor at (500, 500), offset 200px below
    expect(nodeB.position.x).toBe(500)
    expect(nodeB.position.y).toBe(700)
  })

  it('positions unconnected pending nodes near center of existing nodes', () => {
    const nodes = [
      makeNode('a', 100, 100),
      makeNode('b', 300, 100),
      makeNode('c', 0, 0, 'pendingAdd'),
    ]
    const edges: ArchitectureEdge[] = []

    const result = layoutNewNodes(nodes, edges)

    const nodeC = result.find((n) => n.id === 'c')
    if (!nodeC) throw new Error('nodeC not found')
    // Center x of existing nodes is (100+300)/2 = 200
    expect(nodeC.position.x).toBe(200)
    // Should be placed below the max y of existing nodes (100) + 200
    expect(nodeC.position.y).toBe(300)
  })

  it('avoids overlapping when multiple pending nodes target the same neighbor', () => {
    const committed = makeNode('a', 200, 200)
    const pending1 = makeNode('b', 0, 0, 'pendingAdd')
    const pending2 = makeNode('c', 0, 0, 'pendingAdd')
    const nodes = [committed, pending1, pending2]
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'a', 'c')]

    const result = layoutNewNodes(nodes, edges)

    const nodeB = result.find((n) => n.id === 'b')
    const nodeC = result.find((n) => n.id === 'c')
    if (!nodeB) throw new Error('nodeB not found')
    if (!nodeC) throw new Error('nodeC not found')
    // They should not be at the same position
    const samePos = nodeB.position.x === nodeC.position.x && nodeB.position.y === nodeC.position.y
    expect(samePos).toBe(false)
  })

  it('returns nodes unchanged when no pending-add nodes exist', () => {
    const nodes = [makeNode('a', 50, 50), makeNode('b', 200, 200)]
    const edges = [makeEdge('e1', 'a', 'b')]

    const result = layoutNewNodes(nodes, edges)
    expect(result).toBe(nodes) // same reference, no transformation
  })
})
