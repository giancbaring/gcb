import type { Timestamp } from '../primitives/timestamp'

export type DevlogEventKind = 'flow.enter' | 'flow.exit' | 'step' | 'note' | 'failure'

export type DevlogEvent = {
  seq: number
  at: Timestamp
  correlation: string
  contract: string
  kind: DevlogEventKind
  detail?: Record<string, unknown>
}

export interface Historian {
  enter(contract: string, detail?: Record<string, unknown>): void
  step(contract: string, name: string, detail?: Record<string, unknown>): void
  note(contract: string, detail: Record<string, unknown>): void
  fail(contract: string, detail: Record<string, unknown>): void
  exit(contract: string, detail?: Record<string, unknown>): void
}