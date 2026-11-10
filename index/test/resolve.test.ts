import { describe, expect, it } from 'vitest'
import { buildGraph } from '../lib/graph.js'
import { normalizeContract } from '../lib/node.js'
import { diagnosticsHaveBrokenEdges, resolveGraph, strictFailure } from '../lib/resolve.js'

function contract(id: string, kind: 'primitive' | 'function' | 'composition', dependencies: Record<string, string[]> = {}) {
  return normalizeContract({
    id,
    kind,
    domain: 'identity',
    depends_on: dependencies,
  }, { path: `core/${id}.cue` })
}

function resolve(contracts: ReturnType<typeof contract>[]) {
  const nodes = buildGraph(contracts)
  return resolveGraph(nodes, new Map(contracts.map(item => [item.node.id, item.dependencies])))
}

describe('dependency resolution', () => {
  it('reports a broken edge without treating it as a bucket mismatch', () => {
    const diagnostics = resolve([contract('login', 'composition', { functions: ['missing'] })])
    expect(diagnostics.brokenEdges).toEqual([{ from: 'login', to: 'missing', bucket: 'functions' }])
    expect(diagnostics.bucketMismatches).toEqual([])
    expect(diagnosticsHaveBrokenEdges(diagnostics)).toBe(true)
  })

  it('reports a bucket mismatch for a resolved target', () => {
    const diagnostics = resolve([
      contract('create-session', 'function'),
      contract('attempt-login', 'composition', { compositions: ['create-session'] }),
    ])
    expect(diagnostics.bucketMismatches).toEqual([{
      from: 'attempt-login', to: 'create-session', declaredBucket: 'compositions', actualKind: 'function',
    }])
    expect(diagnostics.brokenEdges).toEqual([])
  })

  it('detects cycles and flags only isolated non-primitives as orphans', () => {
    const diagnostics = resolve([
      contract('a', 'function', { functions: ['b'] }),
      contract('b', 'function', { functions: ['a'] }),
      contract('isolated', 'composition'),
      contract('primitive', 'primitive'),
    ])
    expect(diagnostics.cycles).toEqual([['a', 'b', 'a']])
    expect(diagnostics.orphans).toEqual(['isolated'])
    expect(strictFailure(diagnostics)).toBe(true)
  })

  it('keeps CUE export errors available to callers', () => {
    const diagnostics = resolveGraph([], new Map(), [{ path: 'core/bad.cue', error: 'cue export failed' }])
    expect(diagnostics.exportErrors).toEqual([{ path: 'core/bad.cue', error: 'cue export failed' }])
  })
})