import { readdirSync, watch, type FSWatcher } from 'node:fs'
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export type DebouncedCallback = (() => void) & { cancel: () => void }

export function debounceChange(onChange: () => void, delay = 200): DebouncedCallback {
  let timer: ReturnType<typeof setTimeout> | undefined
  const debounced = (() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      onChange()
    }, delay)
  }) as DebouncedCallback
  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
  }
  return debounced
}

function directoriesBelow(root: string): string[] {
  const directories = [root]
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) directories.push(...directoriesBelow(join(root, entry.name)))
  }
  return directories
}

export function watchCore(onChange: () => void): () => void {
  const root = resolve(process.cwd())
  const coreDirectory = join(root, 'core')
  const watchers = new Set<FSWatcher>()
  const debouncedChange = debounceChange(onChange)
  let closed = false
  let usingFallback = false

  function isContractPath(directory: string, filename: string | Buffer | null): boolean {
    if (filename === null) return false
    const changedPath = isAbsolute(filename.toString())
      ? filename.toString()
      : resolve(directory, filename.toString())
    const relativePath = relative(coreDirectory, changedPath)
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`)) return false
    const normalized = changedPath.replaceAll('\\', '/')
    if (normalized.includes('/index/out/')) return false
    return extname(changedPath) === '.cue'
  }

  function closeAll(): void {
    for (const watcher of watchers) watcher.close()
    watchers.clear()
  }

  function handleEvent(directory: string, filename: string | Buffer | null): void {
    if (!closed && isContractPath(directory, filename)) debouncedChange()
  }

  function startFallback(): void {
    if (closed || usingFallback) return
    usingFallback = true
    console.warn('Recursive fs.watch unavailable; watching core/ and its subdirectories individually.')
    closeAll()
    for (const directory of directoriesBelow(coreDirectory)) {
      try {
        const watcher = watch(directory, { encoding: 'utf8' }, (_event, filename) => handleEvent(directory, filename))
        watchers.add(watcher)
        watcher.on('error', error => {
          watchers.delete(watcher)
          watcher.close()
          console.error(`Watcher error at ${directory}: ${error.message}`)
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Unable to watch ${directory}: ${message}`)
      }
    }
  }

  try {
    const watcher = watch(coreDirectory, { recursive: true, encoding: 'utf8' }, (_event, filename) => handleEvent(coreDirectory, filename))
    watchers.add(watcher)
    watcher.on('error', error => {
      if (usingFallback || closed) return
      console.warn(`Recursive fs.watch failed: ${error.message}`)
      startFallback()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`Recursive fs.watch unavailable: ${message}`)
    startFallback()
  }

  return () => {
    if (closed) return
    closed = true
    closeAll()
    debouncedChange.cancel()
  }
}