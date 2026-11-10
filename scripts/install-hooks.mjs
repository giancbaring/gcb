import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const hookPaths = ['pre-commit', 'pre-push'].map(name => resolve(root, '.githooks', name))

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr || result.error?.message || `git ${args.join(' ')} failed with ${result.status}`)
  }
  return result.stdout.trim()
}

git(['config', 'core.hooksPath', '.githooks'])
if (git(['config', '--get', 'core.hooksPath']) !== '.githooks') {
  throw new Error('git core.hooksPath did not retain .githooks')
}

if (process.platform === 'win32') {
  for (const hookPath of hookPaths) {
    const hook = readFileSync(hookPath, 'utf8')
    if (hook.includes('\r\n')) writeFileSync(hookPath, hook.replace(/\r\n/g, '\n'), 'utf8')
  }
}

console.log('hooks installed at .githooks')