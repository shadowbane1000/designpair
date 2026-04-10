import { describe, it, expect } from 'vitest'
import { pickHandlePositions } from '../services/edgeRouting'
import type { ArchitectureNode } from '../types/graph'

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
})
