import { createConsoleHistorian } from './console'
import { noopHistorian } from './noop'
import type { Historian } from './types'

export const DEVLOG_ENABLED: boolean = false
export const historian: Historian = DEVLOG_ENABLED ? createConsoleHistorian() : noopHistorian

export { createConsoleHistorian } from './console'
export { noopHistorian } from './noop'
export type { DevlogEvent, DevlogEventKind, Historian } from './types'