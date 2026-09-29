/**
 * create-session.test.ts — tests for the `create-session` function.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../../primitives/identifier'
import { makeSubject } from '../../../primitives/subject'
import { fromMillis, duration, toMillis } from '../../../primitives/timestamp'
import { SESSION_STATE } from '../../../primitives/session'
import { AUTH_FAILURE } from '../../../primitives/auth-failure'
import type { Assertion } from '../../../primitives/assertion'
import { createSession } from './create-session'

const subject = makeSubject(unsafeIdentifier('GMS001'), 'human')
const sessionId = unsafeIdentifier('session-abc')
const issuedAt = fromMillis(1_700_000_000_000)

const assertion: Assertion = Object.freeze({
  subject,
  sessionId,
  authority: Object.freeze(['OFFICER']),
  issuedAt,
})

const hour = duration(3_600_000)
const fixedClock = () => fromMillis(1_700_000_000_000)

describe('create-session — happy path', () => {
  it('returns Ok carrying an active Session', () => {
    const r = createSession(assertion, hour, fixedClock)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.state).toBe(SESSION_STATE.ACTIVE)
      expect(r.value.id).toBe(sessionId)
    }
  })

  it('expiresAt equals createdAt + lifetime exactly', () => {
    const r = createSession(assertion, hour, fixedClock)
    if (!r.ok) throw new Error('expected ok')
    expect(toMillis(r.value.expiresAt)).toBe(
      toMillis(r.value.createdAt) + toMillis(hour),
    )
  })

  it('the Session principal carries the assertion subject and session id', () => {
    const r = createSession(assertion, hour, fixedClock)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.principal.subject).toBe(subject)
    expect(r.value.principal.sessionId).toBe(sessionId)
  })

  it('the Session is frozen', () => {
    const r = createSession(assertion, hour, fixedClock)
    expect(r.ok && Object.isFrozen(r.value)).toBe(true)
  })
})

describe('create-session — lifetime validation', () => {
  it('rejects a zero-length lifetime', () => {
    const r = createSession(assertion, duration(0), fixedClock)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('rejects a negative lifetime', () => {
    const r = createSession(assertion, duration(-1), fixedClock)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('accepts a one-millisecond lifetime', () => {
    const r = createSession(assertion, duration(1), fixedClock)
    expect(r.ok).toBe(true)
  })
})

describe('create-session — clock', () => {
  it('uses the supplied clock, not the system clock', () => {
    const sentinel = fromMillis(1)
    const customClock = () => sentinel
    const r = createSession(assertion, hour, customClock)
    if (!r.ok) throw new Error('expected ok')
    expect(toMillis(r.value.createdAt)).toBe(1)
    expect(toMillis(r.value.expiresAt)).toBe(1 + toMillis(hour))
  })
})

describe('create-session — no throw', () => {
  it('never throws for any input', () => {
    expect(() => createSession(assertion, hour, fixedClock)).not.toThrow()
    expect(() => createSession(assertion, duration(0), fixedClock)).not.toThrow()
    expect(() => createSession(assertion, duration(-1), fixedClock)).not.toThrow()
  })
})
