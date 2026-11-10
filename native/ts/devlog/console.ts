import { now } from '../primitives/timestamp'
import type { DevlogEvent, DevlogEventKind, Historian } from './types'

declare const console: { log(line: string): void }

const serializationFallback = '{"kind":"failure","detail":"event serialization failed"}'

export function createConsoleHistorian(
  options?: { correlation?: string; sink?: (line: string) => void },
): Historian {
  let seq = 0
  let correlationCounter = 0
  const sink = options?.sink ?? (line => console.log(line))
  const correlation = options?.correlation ?? (() => {
    correlationCounter += 1
    return `devlog-${Date.now()}-${correlationCounter}`
  })()

  function emit(contract: string, kind: DevlogEventKind, detail?: Record<string, unknown>): void {
    seq += 1
    let line: string
    try {
      const event: DevlogEvent = { seq, at: now(), correlation, contract, kind }
      if (detail !== undefined) event.detail = detail
      line = JSON.stringify(event) ?? serializationFallback
    } catch {
      line = serializationFallback
    }

    try {
      sink(line)
    } catch {
      return
    }
  }

  return {
    enter(contract, detail) {
      emit(contract, 'flow.enter', detail)
    },
    step(contract, name, detail) {
      const stepDetail: Record<string, unknown> = { name }
      if (detail !== undefined) stepDetail.detail = detail
      emit(contract, 'step', stepDetail)
    },
    note(contract, detail) {
      emit(contract, 'note', detail)
    },
    fail(contract, detail) {
      emit(contract, 'failure', detail)
    },
    exit(contract, detail) {
      emit(contract, 'flow.exit', detail)
    },
  }
}