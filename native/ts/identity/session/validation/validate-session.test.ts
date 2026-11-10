/**
 * validate-session.test.ts — tests for the `validate-session` function.
 */

import { describe, it, expect } from 'vitest'
import { isOk } from '../../../primitives/result'
import { unsafeIdentifier } from '../../../primitives/identifier'
import { makeSubject } from '../../../primitives/subject'
import { fromMillis, duration, add } from '../../../primitives/timestamp'
import { principalFromAssertion } from '../../primitives/principal'
import { makeSession, revoke, expire } from '../../primitives/session'
import { AUTH_FAILURE } from '../../primitives/auth-failure'
import { validateSession } from './validate-session'

const subject = makeSubject(unsafeIdentifier('GMS001'), 'human')
const sessionId = unsafeIdentifier('session-abc')
const createdAt = fromMillis(1_700_000_000_000)
const hour = duration(3_600_000)
const expiresAt = add(createdAt, hour)

const principal = principalFromAssertion({
  subject,
  sessionId,
  authority: ['OFFICER'],
  issuedAt: createdAt,
})

function makeActiveSession() {
  const r = makeSession({ id: sessionId, principal, createdAt, expiresAt })
  if (!r.ok) throw new Error('expected ok')
  return r.value
}

const midway = () => add(createdAt, duration(1_800_000))
const pastEnd = () => add(expiresAt, duration(1))

describe('validate-session — happy path', () => {
  it('returns Ok carrying the principal of an active session', () => {
    const s = makeActiveSession()
    const r = validateSession(s, midway)
    expect(isOk(r)).toBe(true)
    if (r.ok) expect(r.value).toBe(principal)
  })

  it('the returned principal is the exact object the session carries', () => {
    const s = makeActiveSession()
    const r = validateSession(s, midway)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(s.principal)
  })
})

describe('validate-session — time boundary', () => {
  it('fails when the clock is at exactly expiresAt', () => {
    const s = makeActiveSession()
    const r = validateSession(s, () => expiresAt)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('fails when the clock is one millisecond past expiresAt', () => {
    const s = makeActiveSession()
    const r = validateSession(s, pastEnd)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('succeeds one millisecond before expiresAt', () => {
    const s = makeActiveSession()
    const justBefore = add(expiresAt, duration(-1))
    const r = validateSession(s, () => justBefore)
    expect(isOk(r)).toBe(true)
  })
})

describe('validate-session — non-active states', () => {
  it('rejects a revoked session even before expiry', () => {
    const s = revoke(makeActiveSession())
    const r = validateSession(s, midway)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('rejects an explicitly expired session', () => {
    const s = expire(makeActiveSession())
    const r = validateSession(s, midway)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('the same failure code is returned regardless of the underlying state', () => {
    const active = makeActiveSession()
    const revoked = revoke(active)
    const expired = expire(active)

    const rActivePast = validateSession(active, pastEnd)
    const rRevoked = validateSession(revoked, midway)
    const rExpired = validateSession(expired, midway)

    if (!rActivePast.ok && !rRevoked.ok && !rExpired.ok) {
      expect(rActivePast.error).toBe(rRevoked.error)
      expect(rRevoked.error).toBe(rExpired.error)
    } else {
      throw new Error('expected all three to fail')
    }
  })
})

describe('validate-session — clock', () => {
  it('uses the supplied clock, never the system clock', () => {
    const s = makeActiveSession()
    const ancient = () => fromMillis(0)
    const r = validateSession(s, ancient)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('never throws', () => {
    const s = makeActiveSession()
    expect(() => validateSession(s, midway)).not.toThrow()
    expect(() => validateSession(s, () => expiresAt)).not.toThrow()
    expect(() => validateSession(revoke(s), midway)).not.toThrow()
  })
})
