import type { ContractNode, DependencyBucket, DependencyDeclarations, IndexedContract } from './node.js'

export type BrokenEdge = { from: string; to: string; bucket: DependencyBucket }
export type BucketMismatch = { from: string; to: string; declaredBucket: DependencyBucket; actualKind: ContractNode['kind'] }

export type Diagnostics = {
  exportErrors: { path: string; error: string }[]
  brokenEdges: BrokenEdge[]
  bucketMismatches: BucketMismatch[]
  cycles: string[][]
  orphans: string[]
}

const expectedKind: Record<DependencyBucket, ContractNode['kind']> = {
  primitives: 'primitive',
  functions: 'function',
  compositions: 'composition',
  modules: 'module',
}
const buckets: DependencyBucket[] = ['primitives', 'functions', 'compositions', 'modules']

function canonicalCycle(cycle: string[]): string[] {
  const body = cycle.slice(0, -1)
  if (body.length < 2) return cycle
  const rotations = body.map((_, index) => [...body.slice(index), ...body.slice(0, index)])
  rotations.sort((left, right) => left.join('\0').localeCompare(right.join('\0')))
  const best = rotations[0] || body
  return [...best, best[0] || body[0] || '']
}

function findCycles(nodes: ContractNode[], byId: Map<string, ContractNode>): string[][] {
  const state = new Map<string, 0 | 1 | 2>()
  const stack: string[] = []
  const cycles = new Map<string, string[]>()

  function visit(id: string): void {
    state.set(id, 1)
    stack.push(id)
    const node = byId.get(id)
    for (const requirement of node?.requires || []) {
      if (!byId.has(requirement)) continue
      const targetState = state.get(requirement) || 0
      if (targetState === 0) visit(requirement)
      else if (targetState === 1) {
        const start = stack.indexOf(requirement)
        const cycle = canonicalCycle([...stack.slice(start), requirement])
        cycles.set(cycle.join('\0'), cycle)
      }
    }
    stack.pop()
    state.set(id, 2)
  }

  for (const node of nodes) if (!state.has(node.id)) visit(node.id)
  return [...cycles.values()].sort((left, right) => left.join('\0').localeCompare(right.join('\0')))
}

export function resolveGraph(
  nodes: ContractNode[],
  declarations: Map<string, DependencyDeclarations>,
  exportErrors: Diagnostics['exportErrors'] = [],
): Diagnostics {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const brokenEdges: BrokenEdge[] = []
  const bucketMismatches: BucketMismatch[] = []

  for (const node of nodes) {
    const dependencies = declarations.get(node.id) || {}
    for (const requirement of node.requires) {
      if (!byId.has(requirement)) {
        const bucket = buckets.find(name => dependencies[name]?.includes(requirement)) || 'primitives'
        brokenEdges.push({ from: node.id, to: requirement, bucket })
      }
    }
    for (const bucket of buckets) {
      for (const targetId of dependencies[bucket] || []) {
        const target = byId.get(targetId)
        if (target && target.kind !== expectedKind[bucket]) {
          bucketMismatches.push({ from: node.id, to: targetId, declaredBucket: bucket, actualKind: target.kind })
        }
      }
    }
  }

  const cycles = findCycles(nodes, byId)
  const orphans = nodes
    .filter(node => node.kind !== 'primitive' && node.requires.length === 0 && node.requiredBy.length === 0)
    .map(node => node.id)
    .sort((left, right) => left.localeCompare(right))

  return { exportErrors, brokenEdges, bucketMismatches, cycles, orphans }
}

export function strictFailure(diagnostics: Diagnostics): boolean {
  return diagnostics.cycles.length > 0 || diagnostics.orphans.length > 0 || diagnostics.bucketMismatches.length > 0
}

export function diagnosticsHaveBrokenEdges(diagnostics: Diagnostics): boolean {
  return diagnostics.brokenEdges.length > 0
}

export type { IndexedContract }