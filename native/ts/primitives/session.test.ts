/**
 * session.test.ts — tests for the `session` primitive.
 */

import { describe, it, expect } from 'vitest'
import { isOk, isErr } from './result'
import { unsafeIdentifier } from './identifier'
import { makeSubject } from './subject'
import { fromMillis, duration, add } from './timestamp'
import { principalFromAssertion, type Assertion } from './principal'
import { makeSession, isUsable, isExpired, revoke, expire, SESSION_STATE } from './session'

function makeAssertion(): Assertion {
  return {
    subject: makeSubject(unsafeIdentifier('GMS001'), 'human'),
    sessionId: unsafeIdentifier('session-abc'),
    authority: ['OFFICER'],
    issuedAt: fromMillis(1_700_000_000_000),
  }
}

function validInput() {
  const principal = principalFromAssertion(makeAssertion())
  const createdAt = fromMillis(1_700_000_000_000)
  const expiresAt = add(createdAt, duration(3_600_000))
  return {
    id: unsafeIdentifier('session-abc'),
    principal,
    createdAt,
    expiresAt,
  }
}

describe('session — construction', () => {
  it('accepts valid input and defaults state to active', () => {
    const r = makeSession(validInput())
    expect(isOk(r)).toBe(true)
    if (r.ok) expect(r.value.state).toBe(SESSION_STATE.ACTIVE)
  })

  it('rejects expiresAt equal to createdAt', () => {
    const input = validInput()
    const r = makeSession({ ...input, expiresAt: input.createdAt })
    expect(isErr(r)).toBe(true)
  })

  it('rejects expiresAt before createdAt', () => {
    const input = validInput()
    const r = makeSession({ ...input, expiresAt: fromMillis(0) })
    expect(isErr(r)).toBe(true)
  })

  it('rejects a missing id', () => {
    const input = validInput()
    const r = makeSession({ ...input, id: '' as never })
    expect(isErr(r)).toBe(true)
  })

  it('rejects an unknown state', () => {
    const input = validInput()
    const r = makeSession({ ...input, state: 'zombie' as never })
    expect(isErr(r)).toBe(true)
  })

  it('accepts an explicit revoked state for reconstruction', () => {
    const input = validInput()
    const r = makeSession({ ...input, state: SESSION_STATE.REVOKED })
    expect(isOk(r)).toBe(true)
    if (r.ok) expect(r.value.state).toBe(SESSION_STATE.REVOKED)
  })

  it('the session itself is frozen', () => {
    const r = makeSession(validInput())
    expect(isOk(r) && Object.isFrozen(r.value)).toBe(true)
  })
})

describe('session — usability', () => {
  const input = validInput()

  it('an active session before expiry is usable', () => {
    const r = makeSession(input)
    if (!r.ok) throw new Error('expected ok')
    const midpoint = add(input.createdAt, duration(1_800_000))
    expect(isUsable(r.value, midpoint)).toBe(true)
    expect(isExpired(r.value, midpoint)).toBe(false)
  })

  it('an active session at or past expiry is not usable', () => {
    const r = makeSession(input)
    if (!r.ok) throw new Error('expected ok')
    expect(isUsable(r.value, input.expiresAt)).toBe(false)
    expect(isExpired(r.value, input.expiresAt)).toBe(true)
  })

  it('a revoked session is never usable, regardless of time', () => {
    const r = makeSession({ ...input, state: SESSION_STATE.REVOKED })
    if (!r.ok) throw new Error('expected ok')
    const midpoint = add(input.createdAt, duration(1_800_000))
    expect(isUsable(r.value, midpoint)).toBe(false)
    expect(isExpired(r.value, midpoint)).toBe(true)
  })

  it('an expired session is never usable, regardless of time', () => {
    const r = makeSession({ ...input, state: SESSION_STATE.EXPIRED })
    if (!r.ok) throw new Error('expected ok')
    const midpoint = add(input.createdAt, duration(1_800_000))
    expect(isUsable(r.value, midpoint)).toBe(false)
  })
})

describe('session — transitions', () => {
  it('revoke returns a new session, original unchanged', () => {
    const r = makeSession(validInput())
    if (!r.ok) throw new Error('expected ok')
    const revoked = revoke(r.value)
    expect(revoked.state).toBe(SESSION_STATE.REVOKED)
    expect(r.value.state).toBe(SESSION_STATE.ACTIVE)
    expect(revoked).not.toBe(r.value)
  })

  it('expire returns a new session, original unchanged', () => {
    const r = makeSession(validInput())
    if (!r.ok) throw new Error('expected ok')
    const expired = expire(r.value)
    expect(expired.state).toBe(SESSION_STATE.EXPIRED)
    expect(r.value.state).toBe(SESSION_STATE.ACTIVE)
  })

  it('revoke is idempotent', () => {
    const r = makeSession(validInput())
    if (!r.ok) throw new Error('expected ok')
    const once = revoke(r.value)
    const twice = revoke(once)
    expect(twice.state).toBe(SESSION_STATE.REVOKED)
  })
})
