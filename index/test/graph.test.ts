import { describe, expect, it } from 'vitest'
import { buildGraph } from '../lib/graph.js'
import { normalizeContract } from '../lib/node.js'

function contract(id: string, kind: 'primitive' | 'function' | 'composition', dependencies: Record<string, string[]> = {}) {
  return normalizeContract({
    id,
    kind,
    domain: 'foundation',
    depends_on: dependencies,
  }, { path: `core/${id}.cue` })
}

describe('contract graph', () => {
  it('builds requires and the exact requiredBy inversion', () => {
    const primitive = contract('subject', 'primitive')
    const fn = contract('validate', 'function', { primitives: ['subject'] })
    const composition = contract('login', 'composition', { primitives: ['subject'], functions: ['validate'] })
    const nodes = buildGraph([primitive, fn, composition])
    const byId = new Map(nodes.map(node => [node.id, node]))

    expect(byId.get('login')?.requires).toEqual(['subject', 'validate'])
    expect(byId.get('subject')?.requiredBy).toEqual(['login', 'validate'])
    expect(byId.get('validate')?.requiredBy).toEqual(['login'])
    for (const node of nodes) {
      for (const requirement of node.requires) expect(byId.get(requirement)?.requiredBy).toContain(node.id)
    }
  })

  it('deduplicates repeated dependency IDs in requires', () => {
    const node = contract('combined', 'composition', { primitives: ['subject', 'subject'] })
    expect(node.node.requires).toEqual(['subject'])
  })
})