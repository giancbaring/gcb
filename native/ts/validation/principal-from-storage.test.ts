/**
 * principal-from-storage.test.ts — tests for `principal-from-storage`.
 *
 * The contract does not promise which methods the Authority facade
 * exposes. Tests assert only the fields the Principal contract declares
 * and the behaviour the function contract guarantees.
 */

import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { unsafeIdentifier } from '../primitives/identifier'
import { makeSubject } from '../primitives/subject'
import { fromMillis } from '../primitives/timestamp'
import {
  principalFromStorage,
  type PrincipalStorageRecord,
} from './principal-from-storage'

const subject = makeSubject(unsafeIdentifier('GMS001'), 'human', { role: 'OFFICER' })
const sessionId = unsafeIdentifier('session-abc')
const issuedAt = fromMillis(1_700_000_000_000)

function wellFormed(): PrincipalStorageRecord {
  return {
    subject,
    sessionId,
    authority: ['user:read', 'meeting:create'],
    issuedAt,
  }
}

describe('principal-from-storage — happy path', () => {
  it('accepts a well-formed record', () => {
    const r = principalFromStorage(wellFormed())
    expect(r.ok).toBe(true)
  })

  it('the principal carries the record fields', () => {
    const r = principalFromStorage(wellFormed())
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.subject.identifier).toBe('GMS001')
    expect(r.value.sessionId).toBe(sessionId)
    expect(r.value.issuedAt).toBe(issuedAt)
  })

  it('the authority facade reports the recorded tokens', () => {
    const r = principalFromStorage(wellFormed())
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.authority.has('user:read')).toBe(true)
    expect(r.value.authority.has('meeting:create')).toBe(true)
    expect(r.value.authority.has('admin')).toBe(false)
    expect(r.value.authority.size).toBe(2)
  })

  it('the principal is frozen', () => {
    const r = principalFromStorage(wellFormed())
    expect(r.ok && Object.isFrozen(r.value)).toBe(true)
  })

  it('empty authority is permitted', () => {
    const r = principalFromStorage({ ...wellFormed(), authority: [] })
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.authority.size).toBe(0)
  })
})

describe('principal-from-storage — field validation', () => {
  it('rejects a missing sessionId', () => {
    const r = principalFromStorage({ ...wellFormed(), sessionId: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('sessionId')
  })

  it('rejects an empty sessionId', () => {
    const r = principalFromStorage({ ...wellFormed(), sessionId: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('sessionId')
  })

  it('rejects a non-numeric issuedAt', () => {
    const r = principalFromStorage({ ...wellFormed(), issuedAt: 'yesterday' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('issuedAt')
  })

  it('rejects a non-array authority', () => {
    const r = principalFromStorage({ ...wellFormed(), authority: 'user:read' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('authority')
  })

  it('rejects authority with non-string entries', () => {
    const r = principalFromStorage({ ...wellFormed(), authority: ['user:read', 42] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('authority')
  })

  it('rejects a null subject', () => {
    const r = principalFromStorage({ ...wellFormed(), subject: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('subject')
  })

  it('rejects a non-object subject', () => {
    const r = principalFromStorage({ ...wellFormed(), subject: 'string' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('subject')
  })
})

describe('principal-from-storage — no authentication dependency', () => {
  it('the module does not import from the authentication flow', async () => {
    const source = await readFile(
      'native/ts/validation/principal-from-storage.ts',
      'utf8',
    )
    // Match actual import statements, not the word in comments.
    const importLines = source
      .split('\n')
      .filter((line) => line.trimStart().startsWith('import'))

    expect(importLines.some((line) => line.includes('principalFromAssertion'))).toBe(false)
    expect(importLines.some((line) => line.includes('../identity/authentication'))).toBe(false)
    expect(importLines.some((line) => line.includes('/authentication/'))).toBe(false)
  })
})

describe('principal-from-storage — never throws', () => {
  it('does not throw on any input', () => {
    expect(() => principalFromStorage(wellFormed())).not.toThrow()
    expect(() =>
      principalFromStorage({
        subject: undefined,
        sessionId: undefined,
        authority: undefined,
        issuedAt: undefined,
      }),
    ).not.toThrow()
    expect(() =>
      principalFromStorage(null as never),
    ).not.toThrow()
  })
})
