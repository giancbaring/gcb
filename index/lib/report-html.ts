import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { IndexDocument } from './report-json.js'

export function renderHtml(index: IndexDocument, indexDirectory: string): string {
  const template = readFileSync(join(indexDirectory, 'viewer', 'template.html'), 'utf8')
  const data = JSON.stringify(index).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026')
  return template.replace('/*__INDEX_DATA__*/', data)
}