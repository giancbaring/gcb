/**
 * subject.test.ts — tests for the `subject` primitive.
 * Cases derived from the `tests:` block of subject.yaml.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from './identifier'
import { makeSubject, subjectsEqual, isSubjectKind } from './subject'

describe('subject — construction', () => {
  it('constructs a human subject from a valid identifier', () => {
    const id = unsafeIdentifier('GMS001')
    const s = makeSubject(id, 'human')
    expect(s.identifier).toBe(id)
    expect(s.kind).toBe('human')
    expect(s.attributes).toEqual({})
  })

  it('rejects an unknown kind at runtime', () => {
    const id = unsafeIdentifier('GMS001')
    // Deliberate type escape to prove the runtime guard works.
    expect(() => makeSubject(id, 'alien' as never)).toThrow(/unknown subject kind/)
  })

  it('accepts attributes and freezes them', () => {
    const id = unsafeIdentifier('GMS001')
    const s = makeSubject(id, 'human', { department: 'SSLG' })
    expect(s.attributes.department).toBe('SSLG')
    expect(Object.isFrozen(s.attributes)).toBe(true)
  })

  it('freezes the subject itself', () => {
    const s = makeSubject(unsafeIdentifier('GMS001'), 'human')
    expect(Object.isFrozen(s)).toBe(true)
  })
})

describe('subject — equality', () => {
  it('same identifier and kind are structurally equal', () => {
    const a = makeSubject(unsafeIdentifier('GMS001'), 'human')
    const b = makeSubject(unsafeIdentifier('GMS001'), 'human')
    expect(subjectsEqual(a, b)).toBe(true)
  })

  it('same identifier, different kind are not equal', () => {
    const a = makeSubject(unsafeIdentifier('GMS001'), 'human')
    const b = makeSubject(unsafeIdentifier('GMS001'), 'service')
    expect(subjectsEqual(a, b)).toBe(false)
  })

  it('attributes do not affect equality', () => {
    const a = makeSubject(unsafeIdentifier('GMS001'), 'human', { x: '1' })
    const b = makeSubject(unsafeIdentifier('GMS001'), 'human', { x: '2' })
    expect(subjectsEqual(a, b)).toBe(true)
  })
})

describe('subject — kind guard', () => {
  it('accepts all four declared kinds', () => {
    expect(isSubjectKind('human')).toBe(true)
    expect(isSubjectKind('service')).toBe(true)
    expect(isSubjectKind('device')).toBe(true)
    expect(isSubjectKind('system')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isSubjectKind('admin')).toBe(false)
    expect(isSubjectKind('')).toBe(false)
    expect(isSubjectKind(42)).toBe(false)
    expect(isSubjectKind(null)).toBe(false)
  })
})
