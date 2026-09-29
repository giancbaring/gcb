/**
 * principal.test.ts — tests for the `principal` primitive.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from './identifier'
import { makeSubject } from './subject'
import { fromMillis } from './timestamp'
import type { Assertion } from './assertion'
import {
  principalFromAssertion,
  hasAuthority,
  principalsEqual,
} from './principal'

function makeAssertionLike(overrides: Partial<Assertion> = {}): Assertion {
  return {
    subject: makeSubject(unsafeIdentifier('GMS001'), 'human'),
    sessionId: unsafeIdentifier('session-abc'),
    authority: ['OFFICER'],
    issuedAt: fromMillis(1_700_000_000_000),
    ...overrides,
  }
}

describe('principal — construction', () => {
  it('constructs from a valid Assertion and preserves fields', () => {
    const a = makeAssertionLike()
    const p = principalFromAssertion(a)
    expect(p.subject).toBe(a.subject)
    expect(p.sessionId).toBe(a.sessionId)
    expect(p.issuedAt).toBe(a.issuedAt)
    expect(p.authority.has('OFFICER')).toBe(true)
  })

  it('accepts empty authority', () => {
    const p = principalFromAssertion(makeAssertionLike({ authority: [] }))
    expect(p.authority.size).toBe(0)
  })

  it('principal itself is frozen', () => {
    const p = principalFromAssertion(makeAssertionLike())
    expect(Object.isFrozen(p)).toBe(true)
  })

  it('authority facade is frozen', () => {
    const p = principalFromAssertion(makeAssertionLike({ authority: ['ADMIN'] }))
    expect(Object.isFrozen(p.authority)).toBe(true)
  })

  it('authority has no mutating methods', () => {
    const p = principalFromAssertion(makeAssertionLike({ authority: ['OFFICER'] }))
    const authority = p.authority as unknown as Record<string, unknown>
    expect(authority.add).toBeUndefined()
    expect(authority.delete).toBeUndefined()
    expect(authority.clear).toBeUndefined()
  })

  it('mutating the underlying source does not widen authority', () => {
    const tokens = ['OFFICER']
    const a = makeAssertionLike({ authority: tokens })
    const p = principalFromAssertion(a)
    tokens.push('ADMIN')
    expect(p.authority.has('ADMIN')).toBe(false)
  })
})

describe('principal — authority queries', () => {
  it('hasAuthority is true for a granted token', () => {
    const p = principalFromAssertion(makeAssertionLike({ authority: ['OFFICER', 'ADVISER'] }))
    expect(hasAuthority(p, 'OFFICER')).toBe(true)
    expect(hasAuthority(p, 'ADVISER')).toBe(true)
  })

  it('hasAuthority is false for an ungranted token', () => {
    const p = principalFromAssertion(makeAssertionLike({ authority: ['STAFF'] }))
    expect(hasAuthority(p, 'ADMIN')).toBe(false)
  })

  it('toArray returns a frozen snapshot', () => {
    const p = principalFromAssertion(makeAssertionLike({ authority: ['OFFICER', 'ADVISER'] }))
    const arr = p.authority.toArray()
    expect(arr).toEqual(['OFFICER', 'ADVISER'])
    expect(Object.isFrozen(arr)).toBe(true)
  })
})

describe('principal — equality', () => {
  it('same subject and session are equal', () => {
    const a = makeAssertionLike()
    const b = makeAssertionLike()
    expect(principalsEqual(principalFromAssertion(a), principalFromAssertion(b))).toBe(true)
  })

  it('different session is not equal', () => {
    const a = makeAssertionLike()
    const b = makeAssertionLike({ sessionId: unsafeIdentifier('session-xyz') })
    expect(principalsEqual(principalFromAssertion(a), principalFromAssertion(b))).toBe(false)
  })

  it('different subject is not equal', () => {
    const a = makeAssertionLike()
    const b = makeAssertionLike({
      subject: makeSubject(unsafeIdentifier('GMS002'), 'human'),
    })
    expect(principalsEqual(principalFromAssertion(a), principalFromAssertion(b))).toBe(false)
  })
})
