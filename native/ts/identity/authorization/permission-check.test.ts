/**
 * permission-check.test.ts — tests for the `permission-check` function.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { fromMillis } from '../../primitives/timestamp'
import { principalFromAssertion, type Principal } from '../../primitives/principal'
import { AUTH_FAILURE } from '../../primitives/auth-failure'
import { permissionCheck } from './permission-check'

function principalWith(authority: string[]): Principal {
  return principalFromAssertion({
    subject: makeSubject(unsafeIdentifier('GMS001'), 'human'),
    sessionId: unsafeIdentifier('session-abc'),
    authority,
    issuedAt: fromMillis(1_700_000_000_000),
  })
}

describe('permission-check — permitted', () => {
  it('returns Ok(true) when the principal carries the token', () => {
    const p = principalWith(['user:create', 'user:read'])
    const r = permissionCheck(p, 'user:create')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(true)
  })

  it('is exact-match — a longer token still permits if present', () => {
    const p = principalWith(['user:create:special'])
    const r = permissionCheck(p, 'user:create:special')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(true)
  })

  it('duplicate tokens in authority are harmless', () => {
    const p = principalWith(['user:create', 'user:create'])
    const r = permissionCheck(p, 'user:create')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(true)
  })
})

describe('permission-check — denied', () => {
  it('returns Ok(false) when the token is absent', () => {
    const p = principalWith(['user:read'])
    const r = permissionCheck(p, 'user:create')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(false)
  })

  it('denial is not Err — the check itself succeeds', () => {
    const p = principalWith([])
    const r = permissionCheck(p, 'anything')
    expect(r.ok).toBe(true)
  })

  it('empty authority always denies', () => {
    const p = principalWith([])
    const r = permissionCheck(p, 'user:create')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(false)
  })

  it('prefix matching does not occur', () => {
    const p = principalWith(['admin'])
    const r = permissionCheck(p, 'admin:read')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(false)
  })

  it('wildcard tokens do not expand', () => {
    const p = principalWith(['admin:*'])
    const r = permissionCheck(p, 'admin:read')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(false)
  })
})

describe('permission-check — malformed input', () => {
  it('returns Err INTERNAL for an empty required token', () => {
    const p = principalWith(['user:create'])
    const r = permissionCheck(p, '')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('returns Err INTERNAL for a non-string required token', () => {
    const p = principalWith(['user:create'])
    const r = permissionCheck(p, 42 as never)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('permission-check — purity', () => {
  it('does not mutate the principal', () => {
    const p = principalWith(['user:create'])
    const sizeBefore = p.authority.size
    permissionCheck(p, 'user:create')
    expect(p.authority.size).toBe(sizeBefore)
  })

  it('never throws', () => {
    const p = principalWith(['a'])
    expect(() => permissionCheck(p, 'a')).not.toThrow()
    expect(() => permissionCheck(p, '')).not.toThrow()
  })
})
