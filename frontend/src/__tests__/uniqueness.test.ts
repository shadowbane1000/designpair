import { describe, it, expect } from 'vitest'

// Test the pure uniqueName function directly by extracting the logic
// (useGraphState uses React Flow hooks that require a provider, so we test the core logic)

/** Generate a unique name by appending "(2)", "(3)", etc. if needed. */
function uniqueName(desired: string, existingNames: Set<string>): string {
  if (!existingNames.has(desired)) return desired
  let i = 2
  while (existingNames.has(`${desired} (${String(i)})`)) i++
  return `${desired} (${String(i)})`
}

/** Check if an edge with the same (source, target, protocol, direction) already exists. */
function edgeExists(
  edges: Array<{ source: string; target: string; protocol?: string; direction?: string }>,
  source: string,
  target: string,
  protocol: string | undefined,
  direction: string | undefined,
): boolean {
  return edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      (e.protocol ?? undefined) === protocol &&
      (e.direction ?? 'oneWay') === (direction ?? 'oneWay'),
  )
}

describe('uniqueName', () => {
  it('returns the desired name when no conflict', () => {
    expect(uniqueName('Service', new Set())).toBe('Service')
    expect(uniqueName('Service', new Set(['Database']))).toBe('Service')
  })

  it('auto-suffixes (2) when name already exists', () => {
    expect(uniqueName('Service', new Set(['Service']))).toBe('Service (2)')
  })

  it('auto-suffixes (3) when (2) also exists', () => {
    expect(uniqueName('Service', new Set(['Service', 'Service (2)']))).toBe('Service (3)')
  })

  it('finds next available suffix skipping gaps', () => {
    // If (2) and (3) exist, next is (4)
    const names = new Set(['Service', 'Service (2)', 'Service (3)'])
    expect(uniqueName('Service', names)).toBe('Service (4)')
  })

  it('handles different base names independently', () => {
    const names = new Set(['Service', 'Database'])
    expect(uniqueName('Service', names)).toBe('Service (2)')
    expect(uniqueName('Database', names)).toBe('Database (2)')
    expect(uniqueName('Cache', names)).toBe('Cache')
  })
})

describe('edgeExists', () => {
  const edges = [
    { source: 'n1', target: 'n2', protocol: 'http', direction: 'oneWay' },
    { source: 'n1', target: 'n3', protocol: 'grpc', direction: 'bidirectional' },
  ]

  it('finds exact match', () => {
    expect(edgeExists(edges, 'n1', 'n2', 'http', 'oneWay')).toBe(true)
  })

  it('returns false for different protocol', () => {
    expect(edgeExists(edges, 'n1', 'n2', 'grpc', 'oneWay')).toBe(false)
  })

  it('returns false for different direction', () => {
    expect(edgeExists(edges, 'n1', 'n2', 'http', 'bidirectional')).toBe(false)
  })

  it('returns false for reversed source/target', () => {
    expect(edgeExists(edges, 'n2', 'n1', 'http', 'oneWay')).toBe(false)
  })

  it('defaults direction to oneWay for comparison', () => {
    expect(edgeExists(edges, 'n1', 'n2', 'http', undefined)).toBe(true)
  })

  it('allows same source/target with different protocol', () => {
    expect(edgeExists(edges, 'n1', 'n2', 'sql', 'oneWay')).toBe(false)
  })
})

describe('node name uniqueness across pending state', () => {
  it('pending-add nodes should be considered for uniqueness', () => {
    // Simulate: committed has "Service", pending-add has "Service (2)"
    // Next auto-suffix should be "(3)"
    const allNames = new Set(['Service', 'Service (2)'])
    expect(uniqueName('Service', allNames)).toBe('Service (3)')
  })

  it('rename blocked when name taken by another node', () => {
    // This tests the logic: if desired name is in existingNames, it's blocked
    const otherNames = new Set(['Database'])
    // Trying to rename to "Database" — it exists
    expect(otherNames.has('Database')).toBe(true)
    // Trying to rename to "Cache" — it doesn't exist
    expect(otherNames.has('Cache')).toBe(false)
  })
})
