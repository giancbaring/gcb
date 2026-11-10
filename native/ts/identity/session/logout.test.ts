/**
 * logout.test.ts — tests for the `logout` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { fromMillis, duration, add } from '../../primitives/timestamp'
import { principalFromAssertion } from '../primitives/principal'
import { makeSession, SESSION_STATE, type Session } from '../primitives/session'
import { logout } from './logout'

const subject = makeSubject(unsafeIdentifier('GMS001'), 'human')
const sessionId = unsafeIdentifier('session-abc')
const createdAt = fromMillis(1_700_000_000_000)
const expiresAt = add(createdAt, duration(3_600_000))

const principal = principalFromAssertion({
  subject,
  sessionId,
  authority: ['OFFICER'],
  issuedAt: createdAt,
})

function makeActive(): Session {
  const r = makeSession({ id: sessionId, principal, createdAt, expiresAt })
  if (!r.ok) throw new Error('expected ok')
  return r.value
}

describe('logout — state transition', () => {
  it('returns a session in state revoked', () => {
    const s = makeActive()
    const out = logout(s)
    expect(out.state).toBe(SESSION_STATE.REVOKED)
  })

  it('the input session is unchanged', () => {
    const s = makeActive()
    logout(s)
    expect(s.state).toBe(SESSION_STATE.ACTIVE)
  })

  it('the returned session is a distinct object', () => {
    const s = makeActive()
    const out = logout(s)
    expect(out).not.toBe(s)
  })

  it('the returned session is frozen', () => {
    const out = logout(makeActive())
    expect(Object.isFrozen(out)).toBe(true)
  })
})

describe('logout — field preservation', () => {
  it('preserves id, principal, createdAt, expiresAt', () => {
    const s = makeActive()
    const out = logout(s)
    expect(out.id).toBe(s.id)
    expect(out.principal).toBe(s.principal)
    expect(out.createdAt).toBe(s.createdAt)
    expect(out.expiresAt).toBe(s.expiresAt)
  })
})

describe('logout — idempotence', () => {
  it('revoking an already-revoked session returns a revoked session', () => {
    const once = logout(makeActive())
    const twice = logout(once)
    expect(twice.state).toBe(SESSION_STATE.REVOKED)
  })

  it('repeated logout produces equivalent sessions', () => {
    const s = makeActive()
    const a = logout(s)
    const b = logout(s)
    expect(a.state).toBe(b.state)
    expect(a.id).toBe(b.id)
  })
})

describe('logout — no throw', () => {
  it('never throws for any session state', () => {
    const active = makeActive()
    const revoked = logout(active)
    expect(() => logout(active)).not.toThrow()
    expect(() => logout(revoked)).not.toThrow()
  })
})
