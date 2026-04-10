import { describe, it, expect } from 'vitest'
import { exampleDiagrams } from './examples'
import { ComponentTypes, EdgeProtocols } from '../types/graph'

const validComponentTypes = new Set(Object.values(ComponentTypes))
const validProtocols = new Set(Object.values(EdgeProtocols))

describe('exampleDiagrams', () => {
  it('has at least 4 examples', () => {
    expect(exampleDiagrams.length).toBeGreaterThanOrEqual(4)
  })

  it('each example has unique id', () => {
    const ids = exampleDiagrams.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const example of exampleDiagrams) {
    describe(example.name, () => {
      it('has required metadata', () => {
        expect(example.id).toBeTruthy()
        expect(example.name).toBeTruthy()
        expect(example.description).toBeTruthy()
        expect(example.suggestedQuestion).toBeTruthy()
      })

      it('has at least 4 nodes', () => {
        expect(example.nodes.length).toBeGreaterThanOrEqual(4)
      })

      it('has at least 3 edges', () => {
        expect(example.edges.length).toBeGreaterThanOrEqual(3)
      })

      it('all node types are valid component types', () => {
        for (const node of example.nodes) {
          expect(validComponentTypes.has(node.type as (typeof ComponentTypes)[keyof typeof ComponentTypes]),
            `Invalid type "${node.type}" on node "${node.data.label}"`,
          ).toBe(true)
        }
      })

      it('all node ids are unique', () => {
        const ids = example.nodes.map((n) => n.id)
        expect(new Set(ids).size).toBe(ids.length)
      })

      it('all edge source/targets reference existing nodes', () => {
        const nodeIds = new Set(example.nodes.map((n) => n.id))
        for (const edg of example.edges) {
          expect(nodeIds.has(edg.source),
            `Edge "${edg.id}" source "${edg.source}" not found in nodes`,
          ).toBe(true)
          expect(nodeIds.has(edg.target),
            `Edge "${edg.id}" target "${edg.target}" not found in nodes`,
          ).toBe(true)
        }
      })

      it('all edge protocols are valid', () => {
        for (const edg of example.edges) {
          if (edg.data?.protocol) {
            expect(validProtocols.has(edg.data.protocol),
              `Invalid protocol "${edg.data.protocol}" on edge "${edg.id}"`,
            ).toBe(true)
          }
        }
      })

      it('no two nodes share the same position', () => {
        const positions = example.nodes.map((n) => `${String(n.position.x)},${String(n.position.y)}`)
        expect(new Set(positions).size).toBe(positions.length)
      })
    })
  }
})
