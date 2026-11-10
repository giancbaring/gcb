import type { IndexDocument } from './report-json.js'

function cell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', '<br>')
}

function table(headers: string[], rows: string[][]): string[] {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...(rows.length ? rows.map(row => `| ${row.map(cell).join(' | ')} |`) : [`| ${headers.map(() => 'No findings').join(' | ')} |`]),
    '',
  ]
}

export function renderMarkdown(index: IndexDocument): string {
  const lines = [
    '# GCB Contract Index',
    '',
    `Generated: ${index.generatedAt}`, '',
    '## Summary', '',
    ...table(['Metric', 'Count'], [
      ['Total contracts', String(index.summary.total)],
      ['Indexed', String(index.summary.indexed)],
      ['Errors', String(index.summary.error)],
      ['Broken edges', String(index.summary.brokenEdges)],
      ['Bucket mismatches', String(index.summary.bucketMismatches)],
      ['Cycles', String(index.summary.cycles)],
      ['Orphans', String(index.summary.orphans)],
      ['CUE available', String(index.cueAvailable)],
    ]),
    '## Contract Catalog', '',
    ...table(['ID', 'Kind', 'Domain', 'Source', 'Requires', 'Required by'], index.contracts.map(contract => [
      contract.id,
      contract.kind,
      contract.domain,
      `${contract.status}: ${contract.sourcePath}`,
      String(contract.requires.length),
      String(contract.requiredBy.length),
    ])),
    '## Dependency Map', '',
  ]

  for (const contract of index.contracts) {
    lines.push(`### ${contract.id}`, '', `- Requires: ${contract.requires.length ? contract.requires.map(id => `\`${id}\``).join(', ') : 'none'}`)
    lines.push(`- Required by: ${contract.requiredBy.length ? contract.requiredBy.map(id => `\`${id}\``).join(', ') : 'none'}`)
    lines.push('')
  }

  lines.push('## Diagnostics', '')
  lines.push('### CUE export errors', '', ...table(['Path', 'Error'], index.diagnostics.exportErrors.map(item => [item.path, item.error])))
  lines.push('### Broken edges', '', ...table(['From', 'To', 'Bucket'], index.diagnostics.brokenEdges.map(item => [item.from, item.to, item.bucket])))
  lines.push('### Bucket mismatches', '', ...table(['From', 'To', 'Declared bucket', 'Actual kind'], index.diagnostics.bucketMismatches.map(item => [item.from, item.to, item.declaredBucket, item.actualKind])))
  lines.push('### Cycles', '', ...table(['Cycle'], index.diagnostics.cycles.map(cycle => [cycle.join(' → ')])))
  lines.push('### Orphans', '', ...table(['Contract'], index.diagnostics.orphans.map(id => [id])))
  return lines.join('\n')
}