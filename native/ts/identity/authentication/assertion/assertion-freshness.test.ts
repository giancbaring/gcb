/**
 * assertion-freshness.test.ts — tests for the `assertion-freshness` function.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../../primitives/identifier'
import { makeSubject } from '../../../primitives/subject'
import { fromMillis, duration, type Timestamp } from '../../../primitives/timestamp'
import { AUTH_FAILURE } from '../../../primitives/auth-failure'
import type { Assertion } from '../../../primitives/assertion'
import { assertionFreshness } from './assertion-freshness'

const t0 = fromMillis(1_700_000_000_000)
const fiveMinutes = duration(5 * 60 * 1000)

function assertionAt(issuedAt: Timestamp): Assertion {
  return Object.freeze({
    subject: makeSubject(unsafeIdentifier('GMS001'), 'human'),
    sessionId: unsafeIdentifier('session-abc'),
    authority: Object.freeze(['OFFICER']),
    issuedAt,
  })
}

const clockAt = (t: Timestamp) => () => t

describe('assertion-freshness — fresh', () => {
  it('returns Ok for an assertion issued at the present moment', () => {
    const a = assertionAt(t0)
    const r = assertionFreshness(a, fiveMinutes, clockAt(t0))
    expect(r.ok).toBe(true)
  })

  it('returns Ok for an assertion issued one millisecond ago', () => {
    const a = assertionAt(t0)
    const now = fromMillis(t0 + 1)
    const r = assertionFreshness(a, fiveMinutes, clockAt(now))
    expect(r.ok).toBe(true)
  })

  it('the returned assertion is the exact input object', () => {
    const a = assertionAt(t0)
    const r = assertionFreshness(a, fiveMinutes, clockAt(t0))
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(a)
  })
})

describe('assertion-freshness — boundary', () => {
  it('returns Err EXPIRED at exactly max_age', () => {
    const a = assertionAt(t0)
    const now = fromMillis(t0 + 5 * 60 * 1000)
    const r = assertionFreshness(a, fiveMinutes, clockAt(now))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('returns Ok one millisecond before max_age', () => {
    const a = assertionAt(t0)
    const now = fromMillis(t0 + 5 * 60 * 1000 - 1)
    const r = assertionFreshness(a, fiveMinutes, clockAt(now))
    expect(r.ok).toBe(true)
  })

  it('returns Err EXPIRED one millisecond past max_age', () => {
    const a = assertionAt(t0)
    const now = fromMillis(t0 + 5 * 60 * 1000 + 1)
    const r = assertionFreshness(a, fiveMinutes, clockAt(now))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })
})

describe('assertion-freshness — future-dated', () => {
  it('returns Err EXPIRED when the assertion is issued in the future', () => {
    const a = assertionAt(t0)
    const now = fromMillis(t0 - 1)
    const r = assertionFreshness(a, fiveMinutes, clockAt(now))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('returns Err EXPIRED for a far-future assertion', () => {
    const a = assertionAt(t0)
    const now = fromMillis(t0 - 60 * 60 * 1000)
    const r = assertionFreshness(a, fiveMinutes, clockAt(now))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })
})

describe('assertion-freshness — window validation', () => {
  it('returns Err INTERNAL for a zero max_age', () => {
    const a = assertionAt(t0)
    const r = assertionFreshness(a, duration(0), clockAt(t0))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('returns Err INTERNAL for a negative max_age', () => {
    const a = assertionAt(t0)
    const r = assertionFreshness(a, duration(-1), clockAt(t0))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('assertion-freshness — clock', () => {
  it('uses the supplied clock, not the system clock', () => {
    const a = assertionAt(t0)
    const ancient = () => fromMillis(0)
    const r = assertionFreshness(a, fiveMinutes, ancient)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('invokes the clock exactly once', () => {
    let calls = 0
    const counting = () => {
      calls += 1
      return t0
    }
    assertionFreshness(assertionAt(t0), fiveMinutes, counting)
    expect(calls).toBe(1)
  })
})

describe('assertion-freshness — never throws', () => {
  it('does not throw on any input', () => {
    expect(() => assertionFreshness(assertionAt(t0), fiveMinutes, clockAt(t0))).not.toThrow()
    expect(() => assertionFreshness(assertionAt(t0), duration(0), clockAt(t0))).not.toThrow()
    expect(() => assertionFreshness(assertionAt(t0), fiveMinutes, () => fromMillis(0))).not.toThrow()
  })
})
