import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConsoleHistorian } from './console'
import { DEVLOG_ENABLED, historian, noopHistorian } from './index'

declare const console: { log(line: string): void }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('console historian', () => {
  it('emits ordered JSON events with monotonic sequence and a shared correlation id', () => {
    const lines: string[] = []
    const logger = createConsoleHistorian({
      correlation: 'flow-correlation',
      sink: line => lines.push(line),
    })

    logger.enter('login', { identifier: 'user-1' })
    logger.step('login', 'authenticate')
    logger.note('login', { stage: 'verified' })
    logger.fail('login', { code: 'MISMATCH' })
    logger.exit('login', { ok: false })

    const events = lines.map(line => JSON.parse(line))
    expect(events.map(event => event.kind)).toEqual([
      'flow.enter', 'step', 'note', 'failure', 'flow.exit',
    ])
    expect(events.map(event => event.seq)).toEqual([1, 2, 3, 4, 5])
    expect(events.map(event => event.correlation)).toEqual(Array(5).fill('flow-correlation'))
    expect(lines).toHaveLength(5)
    expect(lines.every(line => typeof line === 'string')).toBe(true)
  })

  it('writes a string line to console.log by default', () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    createConsoleHistorian().enter('login')

    expect(consoleLog).toHaveBeenCalledOnce()
    expect(typeof consoleLog.mock.calls[0]?.[0]).toBe('string')
  })

  it('does not throw when detail is circular', () => {
    const lines: string[] = []
    const detail: Record<string, unknown> = {}
    detail.self = detail
    const logger = createConsoleHistorian({ sink: line => lines.push(line) })

    expect(() => logger.note('login', detail)).not.toThrow()
    expect(lines).toEqual(['{"kind":"failure","detail":"event serialization failed"}'])
  })
})

describe('noop historian', () => {
  it('returns undefined from every method', () => {
    expect(noopHistorian.enter('login')).toBeUndefined()
    expect(noopHistorian.step('login', 'authenticate')).toBeUndefined()
    expect(noopHistorian.note('login', {})).toBeUndefined()
    expect(noopHistorian.fail('login', {})).toBeUndefined()
    expect(noopHistorian.exit('login')).toBeUndefined()
  })

  it('is the active historian while development logging is disabled', () => {
    expect(DEVLOG_ENABLED).toBe(false)
    expect(historian).toBe(noopHistorian)
  })
})