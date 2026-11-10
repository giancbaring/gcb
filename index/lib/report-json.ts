import type { ContractNode } from './node.js'
import type { Diagnostics } from './resolve.js'

export type IndexDocument = {
  generatedAt: string
  cueAvailable: boolean
  summary: {
    total: number
    indexed: number
    error: number
    brokenEdges: number
    bucketMismatches: number
    cycles: number
    orphans: number
  }
  contracts: ContractNode[]
  diagnostics: Diagnostics
}

export function renderJson(index: IndexDocument): string {
  return JSON.stringify(index, null, 2) + '\n'
}