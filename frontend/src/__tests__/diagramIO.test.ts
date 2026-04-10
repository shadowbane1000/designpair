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
})
