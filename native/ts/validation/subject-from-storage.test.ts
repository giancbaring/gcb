/**
 * subject-from-storage.test.ts — tests for the `subject-from-storage` function.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../primitives/identifier'
import { subjectsEqual } from '../primitives/subject'
import {
  subjectFromStorage,
  type SubjectStorageRecord,
} from './subject-from-storage'

function wellFormed(): SubjectStorageRecord {
  return {
    identifier: unsafeIdentifier('GMS001'),
    kind: 'human',
    attributes: { role: 'OFFICER', department: 'SSLG' },
  }
}

describe('subject-from-storage — happy path', () => {
  it('accepts a well-formed record', () => {
    const r = subjectFromStorage(wellFormed())
    expect(r.ok).toBe(true)
  })

  it('the reconstructed subject matches the record', () => {
    const r = subjectFromStorage(wellFormed())
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.identifier).toBe('GMS001')
    expect(r.value.kind).toBe('human')
    expect(r.value.attributes).toEqual({ role: 'OFFICER', department: 'SSLG' })
  })

  it('the reconstructed subject is frozen', () => {
    const r = subjectFromStorage(wellFormed())
    expect(r.ok && Object.isFrozen(r.value)).toBe(true)
  })

  it('a record without attributes produces an empty attribute map', () => {
    const r = subjectFromStorage({
      identifier: unsafeIdentifier('GMS001'),
      kind: 'human',
    })
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.attributes).toEqual({})
  })

  it('accepts all four declared kinds', () => {
    for (const kind of ['human', 'service', 'device', 'system']) {
      const r = subjectFromStorage({ identifier: unsafeIdentifier('X'), kind })
      expect(r.ok).toBe(true)
    }
  })
})

describe('subject-from-storage — field validation', () => {
  it('rejects a missing identifier', () => {
    const r = subjectFromStorage({ ...wellFormed(), identifier: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('identifier')
  })

  it('rejects an empty identifier', () => {
    const r = subjectFromStorage({ ...wellFormed(), identifier: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('identifier')
  })

  it('rejects a non-string identifier', () => {
    const r = subjectFromStorage({ ...wellFormed(), identifier: 42 })
    expect(r.ok).toBe(false)
  })

  it('rejects an unknown kind', () => {
    const r = subjectFromStorage({ ...wellFormed(), kind: 'alien' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('kind')
  })

  it('rejects a missing kind', () => {
    const r = subjectFromStorage({ ...wellFormed(), kind: undefined })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('kind')
  })

  it('rejects attributes that are not an object', () => {
    const r = subjectFromStorage({ ...wellFormed(), attributes: 'not-an-object' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('attributes')
  })

  it('rejects attributes with non-string values', () => {
    const r = subjectFromStorage({ ...wellFormed(), attributes: { role: 42 } })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('attributes')
  })
})

describe('subject-from-storage — attribute immutability', () => {
  it('mutating the source attributes does not affect the reconstructed subject', () => {
    const source: Record<string, string> = { role: 'OFFICER' }
    const r = subjectFromStorage({
      identifier: unsafeIdentifier('GMS001'),
      kind: 'human',
      attributes: source,
    })
    source.role = 'ADMIN'
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.attributes.role).toBe('OFFICER')
  })

  it('subjectsEqual is reflexive on the reconstructed subject', () => {
    const r = subjectFromStorage({
      identifier: unsafeIdentifier('GMS001'),
      kind: 'human',
    })
    if (!r.ok) throw new Error('expected ok')
    expect(subjectsEqual(r.value, r.value)).toBe(true)
  })
})

describe('subject-from-storage — never throws', () => {
  it('does not throw on any input', () => {
    expect(() => subjectFromStorage(wellFormed())).not.toThrow()
    expect(() => subjectFromStorage({ identifier: null, kind: null })).not.toThrow()
    expect(() =>
      subjectFromStorage({
        identifier: undefined,
        kind: undefined,
        attributes: undefined,
      }),
    ).not.toThrow()
  })
})
