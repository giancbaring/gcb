/**
 * auth-event.test.ts — tests for the `auth-event` primitive.
 */

import { describe, it, expect } from 'vitest'
import { isOk, isErr } from './result'
import { unsafeIdentifier } from './identifier'
import { makeSubject } from './subject'
import { fromMillis } from './timestamp'
import { OUTCOME } from './outcome'
import { AUTH_ACTION, makeAuthEvent, isAuthAction, allAuthActions } from './auth-event'

function validInput() {
  return {
    action: AUTH_ACTION.LOGIN,
    subject: makeSubject(unsafeIdentifier('GMS001'), 'human'),
    outcome: OUTCOME.SUCCESS,
    occurredAt: fromMillis(1_700_000_000_000),
    detail: { channel: 'web' },
  }
}

describe('auth-event — construction', () => {
  it('accepts a well-formed input', () => {
    const r = makeAuthEvent(validInput())
    expect(isOk(r)).toBe(true)
    if (r.ok) {
      expect(r.value.action).toBe(AUTH_ACTION.LOGIN)
      expect(r.value.outcome).toBe(OUTCOME.SUCCESS)
    }
  })

  it('rejects an unknown action', () => {
    const r = makeAuthEvent({ ...validInput(), action: 'teleport' })
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error).toContain('teleport')
  })

  it('rejects a missing subject', () => {
    const r = makeAuthEvent({ ...validInput(), subject: null })
    expect(isErr(r)).toBe(true)
  })

  it('rejects an unknown outcome', () => {
    const r = makeAuthEvent({ ...validInput(), outcome: 'MAYBE' })
    expect(isErr(r)).toBe(true)
  })

  it('rejects a non-numeric occurredAt', () => {
    const r = makeAuthEvent({ ...validInput(), occurredAt: 'now' })
    expect(isErr(r)).toBe(true)
  })

  it('rejects a detail map with non-string values', () => {
    const r = makeAuthEvent({ ...validInput(), detail: { count: 42 } })
    expect(isErr(r)).toBe(true)
  })

  it('accepts a missing detail map', () => {
    const input = validInput()
    const r = makeAuthEvent({
      action: input.action,
      subject: input.subject,
      outcome: input.outcome,
      occurredAt: input.occurredAt,
    })
    expect(isOk(r)).toBe(true)
    if (r.ok) expect(r.value.detail).toEqual({})
  })
})

describe('auth-event — immutability', () => {
  it('the event itself is frozen', () => {
    const r = makeAuthEvent(validInput())
    expect(isOk(r) && Object.isFrozen(r.value)).toBe(true)
  })

  it('the detail map is frozen', () => {
    const r = makeAuthEvent(validInput())
    expect(isOk(r) && Object.isFrozen(r.value.detail)).toBe(true)
  })

  it('mutating the source detail does not affect the frozen copy', () => {
    const source: Record<string, string> = { channel: 'web' }
    const r = makeAuthEvent({ ...validInput(), detail: source })
    source.channel = 'cli'
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.detail.channel).toBe('web')
  })
})

describe('auth-event — action set', () => {
  it('accepts every declared action', () => {
    for (const action of allAuthActions()) {
      const r = makeAuthEvent({ ...validInput(), action })
      expect(isOk(r)).toBe(true)
    }
  })

  it('contains exactly six actions', () => {
    expect(allAuthActions().length).toBe(6)
  })

  it('allAuthActions returns a frozen array', () => {
    expect(Object.isFrozen(allAuthActions())).toBe(true)
  })

  it('isAuthAction rejects unknown strings', () => {
    expect(isAuthAction('login')).toBe(true)
    expect(isAuthAction('role-change')).toBe(true)
    expect(isAuthAction('LOGIN')).toBe(false)
    expect(isAuthAction('')).toBe(false)
    expect(isAuthAction(42)).toBe(false)
  })
})
