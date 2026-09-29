/**
 * assertion.test.ts — tests for the `assertion` primitive.
 */

import { describe, it, expect } from 'vitest'
import { isOk, isErr } from './result'
import { unsafeIdentifier } from './identifier'
import { makeSubject } from './subject'
import { fromMillis } from './timestamp'
import { makeAssertion } from './assertion'

const validInput = () => ({
  subject: makeSubject(unsafeIdentifier('GMS001'), 'human'),
  sessionId: unsafeIdentifier('session-abc'),
  authority: ['OFFICER'],
  issuedAt: fromMillis(1_700_000_000_000),
})

describe('assertion — construction', () => {
  it('accepts a well-formed input', () => {
    const r = makeAssertion(validInput())
    expect(isOk(r)).toBe(true)
    if (r.ok) {
      expect(r.value.sessionId).toBe('session-abc')
      expect(r.value.authority).toEqual(['OFFICER'])
    }
  })

  it('rejects a missing subject', () => {
    const r = makeAssertion({ ...validInput(), subject: null })
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error).toContain('subject')
  })

  it('rejects an empty sessionId', () => {
    const r = makeAssertion({ ...validInput(), sessionId: '' })
    expect(isErr(r)).toBe(true)
  })

  it('rejects a non-numeric issuedAt', () => {
    const r = makeAssertion({ ...validInput(), issuedAt: 'yesterday' })
    expect(isErr(r)).toBe(true)
  })

  it('rejects non-string authority entries', () => {
    const r = makeAssertion({ ...validInput(), authority: ['OFFICER', 42] })
    expect(isErr(r)).toBe(true)
  })

  it('rejects non-array authority', () => {
    const r = makeAssertion({ ...validInput(), authority: 'OFFICER' })
    expect(isErr(r)).toBe(true)
  })

  it('accepts empty authority', () => {
    const r = makeAssertion({ ...validInput(), authority: [] })
    expect(isOk(r)).toBe(true)
  })
})

describe('assertion — immutability', () => {
  it('the assertion itself is frozen', () => {
    const r = makeAssertion(validInput())
    expect(isOk(r) && Object.isFrozen(r.value)).toBe(true)
  })

  it('the authority array is frozen', () => {
    const r = makeAssertion(validInput())
    expect(isOk(r) && Object.isFrozen(r.value.authority)).toBe(true)
  })

  it('attempting to push to authority throws', () => {
    const r = makeAssertion(validInput())
    if (!r.ok) throw new Error('expected ok')
    expect(() => {
      (r.value.authority as string[]).push('ADMIN')
    }).toThrow()
  })
})

describe('assertion — equivalence', () => {
  it('two assertions from identical input carry equivalent fields', () => {
    const a = makeAssertion(validInput())
    const b = makeAssertion(validInput())
    if (!a.ok || !b.ok) throw new Error('expected both ok')
    expect(a.value.sessionId).toBe(b.value.sessionId)
    expect(a.value.authority).toEqual(b.value.authority)
    expect(a.value.issuedAt).toBe(b.value.issuedAt)
  })
})
