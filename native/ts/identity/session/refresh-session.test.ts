/**
 * refresh-session.test.ts — tests for the `refresh-session` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { fromMillis, duration, add, toMillis } from '../../primitives/timestamp'
import { principalFromAssertion } from '../primitives/principal'
import {
  makeSession,
  revoke,
  expire,
  SESSION_STATE,
  type Session,
} from '../primitives/session'
import { AUTH_FAILURE } from '../primitives/auth-failure'
import { refreshSession } from './refresh-session'

const subject = makeSubject(unsafeIdentifier('GMS001'), 'human')
const sessionId = unsafeIdentifier('session-abc')
const t0 = fromMillis(1_700_000_000_000)
const hour = duration(3_600_000)
const halfHour = duration(1_800_000)

const principal = principalFromAssertion({
  subject,
  sessionId,
  authority: ['OFFICER'],
  issuedAt: t0,
})

function activeSession(): Session {
  const r = makeSession({
    id: sessionId,
    principal,
    createdAt: t0,
    expiresAt: add(t0, hour),
  })
  if (!r.ok) throw new Error('expected ok')
  return r.value
}

const midway = () => add(t0, halfHour)

describe('refresh-session — happy path', () => {
  it('returns Ok carrying a new active session', () => {
    const s = activeSession()
    const r = refreshSession(s, hour, midway)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.state).toBe(SESSION_STATE.ACTIVE)
  })

  it('the new session principal is the exact input principal', () => {
    const s = activeSession()
    const r = refreshSession(s, hour, midway)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.principal).toBe(principal)
  })

  it('the new session id equals the input session id', () => {
    const s = activeSession()
    const r = refreshSession(s, hour, midway)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.id).toBe(s.id)
  })

  it('the new session createdAt equals the supplied clock value', () => {
    const s = activeSession()
    const t1 = midway()
    const r = refreshSession(s, hour, () => t1)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.createdAt).toBe(t1)
  })

  it('the new expiresAt is exactly createdAt + lifetime', () => {
    const s = activeSession()
    const t1 = midway()
    const r = refreshSession(s, hour, () => t1)
    if (!r.ok) throw new Error('expected ok')
    expect(toMillis(r.value.expiresAt)).toBe(toMillis(add(t1, hour)))
  })

  it('the new session is frozen', () => {
    const s = activeSession()
    const r = refreshSession(s, hour, midway)
    expect(r.ok && Object.isFrozen(r.value)).toBe(true)
  })
})

describe('refresh-session — non-usable input', () => {
  it('returns Err EXPIRED for a revoked session', () => {
    const s = revoke(activeSession())
    const r = refreshSession(s, hour, midway)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('returns Err EXPIRED for an explicitly expired session', () => {
    const s = expire(activeSession())
    const r = refreshSession(s, hour, midway)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('returns Err EXPIRED when the clock is at or past expiresAt', () => {
    const s = activeSession()
    const pastEnd = add(s.expiresAt, duration(1))
    const r = refreshSession(s, hour, () => pastEnd)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('returns Err EXPIRED when the clock is before createdAt', () => {
    const s = activeSession()
    const ancient = () => fromMillis(0)
    const r = refreshSession(s, hour, ancient)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })
})

describe('refresh-session — lifetime validation', () => {
  it('returns Err INTERNAL for a zero lifetime', () => {
    const s = activeSession()
    const r = refreshSession(s, duration(0), midway)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('returns Err INTERNAL for a negative lifetime', () => {
    const s = activeSession()
    const r = refreshSession(s, duration(-1), midway)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('refresh-session — no mutation', () => {
  it('the input session is unchanged after refresh', () => {
    const s = activeSession()
    const createdAtBefore = s.createdAt
    const expiresAtBefore = s.expiresAt
    const stateBefore = s.state

    refreshSession(s, hour, midway)

    expect(s.createdAt).toBe(createdAtBefore)
    expect(s.expiresAt).toBe(expiresAtBefore)
    expect(s.state).toBe(stateBefore)
  })

  it('the returned session is a distinct object', () => {
    const s = activeSession()
    const r = refreshSession(s, hour, midway)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).not.toBe(s)
  })
})

describe('refresh-session — clock', () => {
  it('invokes the clock exactly once', () => {
    let calls = 0
    const s = activeSession()
    const t1 = midway()
    const counting = () => {
      calls += 1
      return t1
    }
    refreshSession(s, hour, counting)
    expect(calls).toBe(1)
  })
})

describe('refresh-session — never throws', () => {
  it('does not throw on any input', () => {
    const s = activeSession()
    expect(() => refreshSession(s, hour, midway)).not.toThrow()
    expect(() => refreshSession(s, duration(0), midway)).not.toThrow()
    expect(() => refreshSession(revoke(s), hour, midway)).not.toThrow()
  })
})
