import type { ContractNode, IndexedContract } from './node.js'

export function buildGraph(contracts: IndexedContract[]): ContractNode[] {
  const nodes = contracts.map(({ node }) => ({ ...node, requires: [...node.requires], requiredBy: [] }))
  const byId = new Map(nodes.map(node => [node.id, node]))

  for (const node of nodes) {
    for (const requirement of node.requires) {
      const target = byId.get(requirement)
      if (target && !target.requiredBy.includes(node.id)) target.requiredBy.push(node.id)
    }
  }

  for (const node of nodes) node.requiredBy.sort((left, right) => left.localeCompare(right))
  return nodes
}