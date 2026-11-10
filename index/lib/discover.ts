import { readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import type { ContractSource } from './node.js'

export type DiscoveryResult = {
  sources: ContractSource[]
  cueAvailable: boolean
}

export function discoverContracts(root: string): DiscoveryResult {
  const corePath = resolve(root, 'core')
  const cuePaths: string[] = []

  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory() && directory === corePath && entry.name === 'schema') continue
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile() && entry.name.endsWith('.cue')) cuePaths.push(path)
    }
  }

  walk(corePath)
  cuePaths.sort()
  const cueAvailable = spawnSync('cue', ['version'], { cwd: root, encoding: 'utf8' }).status === 0
  const sources = cuePaths.map(cuePath => ({
    path: relative(root, cuePath).replaceAll('\\', '/'),
  }))

  return { sources, cueAvailable }
}