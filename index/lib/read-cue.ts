import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'

function labelFor(filePath: string): string {
  return basename(filePath, '.cue').replace(/-([a-z0-9])/g, (_match, letter: string) => letter.toUpperCase())
}

function exportCue(filePath: string, expression?: string): { value?: unknown; stderr: string; error?: string } {
  const args = ['export', filePath]
  if (expression) args.push('-e', expression)
  args.push('--out', 'json')
  const result = spawnSync('cue', args, { encoding: 'utf8' })
  const stderr = result.stderr || ''
  if (result.error) return { stderr, error: result.error.message }
  if (result.status !== 0) return { stderr, error: `cue export exited ${result.status}: ${stderr.trim()}` }
  try {
    return { value: JSON.parse(result.stdout), stderr }
  } catch (error) {
    return { stderr, error: `cue export produced invalid JSON: ${String(error)}` }
  }
}

function matchingContract(value: unknown, expectedId: string): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const root = value as Record<string, unknown>
    if (root.id === expectedId) return root
    for (const candidate of Object.values(root)) {
      if (candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate)) {
        if ((candidate as Record<string, unknown>).id === expectedId) return candidate
      }
    }
  }
  throw new Error(`No exported top-level value has id ${expectedId}`)
}

export function readCue(filePath: string, expectedId: string): { value: unknown; stderr: string } {
  const selected = exportCue(filePath, labelFor(filePath))
  if (!selected.error) return { value: matchingContract(selected.value, expectedId), stderr: selected.stderr }

  const fallback = exportCue(filePath)
  if (!fallback.error) return { value: matchingContract(fallback.value, expectedId), stderr: selected.stderr + fallback.stderr }
  throw new Error(`${selected.error}; fallback export failed: ${fallback.error}`)
}