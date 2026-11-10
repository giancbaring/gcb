/**
 * issue-assertion.test.ts — tests for the `issue-assertion` function.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../../primitives/identifier'
import { makeSubject } from '../../../primitives/subject'
import { fromMillis } from '../../../primitives/timestamp'
import { AUTH_FAILURE } from '../../primitives/auth-failure'
import { issueAssertion, type IdGenerator, type Clock } from './issue-assertion'

const subject = makeSubject(unsafeIdentifier('GMS001'), 'human')
const fixedId = unsafeIdentifier('session-abc')
const fixedTime = fromMillis(1_700_000_000_000)

const stableIdGen: IdGenerator = () => fixedId
const stableClock: Clock = () => fixedTime

describe('issue-assertion — happy path', () => {
  it('returns Ok carrying an Assertion with matching fields', () => {
    const r = issueAssertion(subject, ['OFFICER'], stableIdGen, stableClock)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.subject).toBe(subject)
      expect(r.value.sessionId).toBe(fixedId)
      expect(r.value.issuedAt).toBe(fixedTime)
      expect(r.value.authority).toEqual(['OFFICER'])
    }
  })

  it('accepts an empty authority list', () => {
    const r = issueAssertion(subject, [], stableIdGen, stableClock)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.authority.length).toBe(0)
  })

  it('accepts multiple authority tokens', () => {
    const r = issueAssertion(subject, ['OFFICER', 'ADVISER'], stableIdGen, stableClock)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.authority).toEqual(['OFFICER', 'ADVISER'])
  })

  it('the Assertion is frozen', () => {
    const r = issueAssertion(subject, ['ADMIN'], stableIdGen, stableClock)
    expect(r.ok && Object.isFrozen(r.value)).toBe(true)
  })
})

describe('issue-assertion — clock', () => {
  it('uses the supplied clock, never the system clock', () => {
    const sentinel = fromMillis(42)
    const customClock: Clock = () => sentinel
    const r = issueAssertion(subject, ['STAFF'], stableIdGen, customClock)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.issuedAt).toBe(sentinel)
  })
})

describe('issue-assertion — id generator', () => {
  it('uses the supplied generator, never an internal one', () => {
    const sentinel = unsafeIdentifier('custom-session-id')
    const customGen: IdGenerator = () => sentinel
    const r = issueAssertion(subject, ['STAFF'], customGen, stableClock)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.sessionId).toBe(sentinel)
  })

  it('returns Err INTERNAL when the generator throws', () => {
    const failing: IdGenerator = () => {
      throw new Error('entropy exhausted')
    }
    const r = issueAssertion(subject, ['STAFF'], failing, stableClock)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('does not propagate the generator error text', () => {
    const leaky: IdGenerator = () => {
      throw new Error('internal path /secrets/entropy')
    }
    const r = issueAssertion(subject, ['STAFF'], leaky, stableClock)
    if (!r.ok) expect(r.error).not.toContain('entropy')
  })
})

describe('issue-assertion — no throw', () => {
  it('never throws for any input combination', () => {
    expect(() => issueAssertion(subject, [], stableIdGen, stableClock)).not.toThrow()
    expect(() =>
      issueAssertion(
        subject,
        ['X'],
        () => {
          throw new Error('x')
        },
        stableClock,
      ),
    ).not.toThrow()
  })
})
