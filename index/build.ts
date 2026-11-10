import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { discoverContracts } from './lib/discover.js'
import { buildGraph } from './lib/graph.js'
import { normalizeContract } from './lib/node.js'
import { readCue } from './lib/read-cue.js'
import { renderHtml } from './lib/report-html.js'
import { renderJson, type IndexDocument } from './lib/report-json.js'
import { renderMarkdown } from './lib/report-md.js'
import { diagnosticsHaveBrokenEdges, resolveGraph, strictFailure } from './lib/resolve.js'
import { watchCore } from './lib/watch.js'

const indexDirectory = dirname(fileURLToPath(import.meta.url))
const root = resolve(indexDirectory, '..')
const outputDirectory = join(indexDirectory, 'out')

export type BuildResult = {
  index: IndexDocument
  exitCode: number
}

export async function buildIndex(): Promise<BuildResult> {
  const strict = process.argv.includes('--verify')
  const discovery = discoverContracts(root)
  const indexedContracts = []
  const declarations = new Map()
  const exportErrors: { path: string; error: string }[] = []

  for (const source of discovery.sources) {
    try {
      const absolutePath = join(root, source.path)
      const result = readCue(absolutePath, basename(source.path, '.cue'))
      if (result.stderr.trim()) console.warn(`cue: ${source.path}: ${result.stderr.trim()}`)
      const indexed = normalizeContract(result.value, source)
      indexedContracts.push(indexed)
      declarations.set(indexed.node.id, indexed.dependencies)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      exportErrors.push({ path: source.path, error: message })
    }
  }

  const contracts = buildGraph(indexedContracts)
  contracts.sort((left, right) => left.id.localeCompare(right.id))
  const diagnostics = resolveGraph(contracts, declarations, exportErrors)
  const index: IndexDocument = {
    generatedAt: new Date().toISOString(),
    cueAvailable: discovery.cueAvailable,
    summary: {
      total: discovery.sources.length,
      indexed: contracts.length,
      error: diagnostics.exportErrors.length,
      brokenEdges: diagnostics.brokenEdges.length,
      bucketMismatches: diagnostics.bucketMismatches.length,
      cycles: diagnostics.cycles.length,
      orphans: diagnostics.orphans.length,
    },
    contracts,
    diagnostics,
  }

  mkdirSync(outputDirectory, { recursive: true })
  writeFileSync(join(outputDirectory, 'index.json'), renderJson(index), 'utf8')
  writeFileSync(join(outputDirectory, 'index.md'), renderMarkdown(index), 'utf8')
  writeFileSync(join(outputDirectory, 'index.html'), renderHtml(index, indexDirectory), 'utf8')

  const exitCode = diagnosticsHaveBrokenEdges(diagnostics) || (strict && strictFailure(diagnostics)) ? 1 : 0
  return { index, exitCode }
}

function printBuild(result: BuildResult): void {
  const { index } = result
  console.log(`Indexed ${index.summary.indexed}/${index.summary.total} contracts; CUE available: ${index.cueAvailable}.`)
  console.log(`Status: valid ${index.summary.indexed}, error ${index.summary.error}.`)
  console.log(`Diagnostics: broken edges ${index.summary.brokenEdges}, bucket mismatches ${index.summary.bucketMismatches}, cycles ${index.summary.cycles}, orphans ${index.summary.orphans}.`)
  for (const item of index.diagnostics.exportErrors) console.error(`export-error: ${item.path}: ${item.error.split('\n')[0]}`)
  for (const item of index.diagnostics.brokenEdges) console.error(`broken-edge: ${item.from} requires missing ${item.to} (${item.bucket})`)
  for (const item of index.diagnostics.bucketMismatches) console.warn(`bucket-mismatch: ${item.from} -> ${item.to}: ${item.declaredBucket} contains kind ${item.actualKind}`)
  for (const cycle of index.diagnostics.cycles) console.warn(`cycle: ${cycle.join(' -> ')}`)
  for (const orphan of index.diagnostics.orphans) console.warn(`orphan: ${orphan}`)
  console.log(`Wrote ${outputDirectory}`)
}

function printStatus(index: IndexDocument): void {
  for (const contract of index.contracts) {
    console.log(`${contract.status.toUpperCase()}\t${contract.kind}\t${contract.id}\t${contract.sourcePath}`)
  }
  for (const item of index.diagnostics.exportErrors) {
    console.log(`ERROR\tunknown\t${basename(item.path, '.cue')}\t${item.path}`)
  }
  console.log(`Summary: total ${index.summary.total}, valid ${index.summary.indexed}, error ${index.summary.error}.`)
}

function timestamp(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function diagnosticCounts(result: BuildResult): Record<string, number> {
  const summary = result.index.summary
  return {
    exportErrors: summary.error,
    broken: summary.brokenEdges,
    bucketMismatches: summary.bucketMismatches,
    cycles: summary.cycles,
    orphans: summary.orphans,
  }
}

async function runWatch(): Promise<void> {
  let previousCounts: Record<string, number> | undefined
  let previousExitCode: number | undefined
  let rebuilding = false
  let rebuildAgain = false

  async function rebuild(): Promise<void> {
    if (rebuilding) {
      rebuildAgain = true
      return
    }
    rebuilding = true
    do {
      rebuildAgain = false
      try {
        const result = await buildIndex()
        const index = result.index
        console.log(`[${timestamp()}] rebuilt — indexed: ${index.summary.indexed}, errors: ${index.summary.error}, broken: ${index.summary.brokenEdges}`)
        const currentCounts = diagnosticCounts(result)
        const growth = Object.entries(currentCounts)
          .filter(([category, count]) => count > (previousCounts?.[category] ?? 0))
          .map(([category, count]) => `${category} +${count - (previousCounts?.[category] ?? 0)}`)
        if (growth.length) console.warn(`[${timestamp()}] new diagnostics: ${growth.join(', ')}`)
        if (result.exitCode !== 0 && (previousExitCode === undefined || previousExitCode === 0 || growth.length > 0)) {
          console.error(`[${timestamp()}] build returned exit code ${result.exitCode}; watcher remains active`)
        }
        previousCounts = currentCounts
        previousExitCode = result.exitCode
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[${timestamp()}] rebuild failed: ${message}`)
      }
    } while (rebuildAgain)
    rebuilding = false
  }

  const closeWatcher = watchCore(() => { void rebuild() })
  const shutdown = (): void => {
    closeWatcher()
    process.exit(0)
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  await rebuild()
}

async function main(): Promise<void> {
  if (process.argv.includes('--status')) {
    const result = await buildIndex()
    printStatus(result.index)
    return
  }
  if (process.argv.includes('--watch')) {
    await runWatch()
    return
  }
  const result = await buildIndex()
  printBuild(result)
  process.exitCode = result.exitCode
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch(error => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
  })
}