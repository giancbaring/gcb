/**
 * authorize.test.ts — tests for the `authorize` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { fromMillis } from '../../primitives/timestamp'
import { principalFromAssertion, type Principal } from '../primitives/principal'
import { AUTHZ_FAILURE } from '../primitives/authz-failure'
import { authorize } from './authorize'

function principalWith(authority: string[]): Principal {
  return principalFromAssertion({
    subject: makeSubject(unsafeIdentifier('GMS001'), 'human'),
    sessionId: unsafeIdentifier('session-abc'),
    authority,
    issuedAt: fromMillis(1_700_000_000_000),
  })
}

describe('authorize — permitted', () => {
  it('returns Ok carrying the same principal', () => {
    const p = principalWith(['user:create'])
    const r = authorize(p, 'user:create')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(p)
  })

  it('the returned principal is the exact input object', () => {
    const p = principalWith(['user:create', 'user:read'])
    const r = authorize(p, 'user:read')
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(p)
  })
})

describe('authorize — denied', () => {
  it('returns Err FORBIDDEN when the action token is absent', () => {
    const p = principalWith(['user:read'])
    const r = authorize(p, 'user:create')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.FORBIDDEN)
  })

  it('empty authority denies every action', () => {
    const p = principalWith([])
    const r = authorize(p, 'anything')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.FORBIDDEN)
  })

  it('prefix does not match — exact tokens only', () => {
    const p = principalWith(['admin'])
    const r = authorize(p, 'admin:read')
    if (r.ok) throw new Error('expected err')
    expect(r.error).toBe(AUTHZ_FAILURE.FORBIDDEN)
  })

  it('wildcards do not expand', () => {
    const p = principalWith(['admin:*'])
    const r = authorize(p, 'admin:read')
    if (r.ok) throw new Error('expected err')
    expect(r.error).toBe(AUTHZ_FAILURE.FORBIDDEN)
  })
})

describe('authorize — missing principal', () => {
  it('returns Err NO_PRINCIPAL when principal is null', () => {
    const r = authorize(null, 'user:create')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.NO_PRINCIPAL)
  })

  it('returns Err NO_PRINCIPAL when principal is undefined', () => {
    const r = authorize(undefined, 'user:create')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.NO_PRINCIPAL)
  })

  it('NO_PRINCIPAL is not FORBIDDEN', () => {
    const r = authorize(null, 'user:create')
    if (r.ok) throw new Error('expected err')
    expect(r.error).not.toBe(AUTHZ_FAILURE.FORBIDDEN)
  })
})

describe('authorize — malformed action', () => {
  it('returns Err UNKNOWN_ACTION for an empty string', () => {
    const p = principalWith(['user:create'])
    const r = authorize(p, '')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.UNKNOWN_ACTION)
  })

  it('returns Err UNKNOWN_ACTION for a non-string action', () => {
    const p = principalWith(['user:create'])
    const r = authorize(p, 42 as never)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.UNKNOWN_ACTION)
  })

  it('UNKNOWN_ACTION is not FORBIDDEN', () => {
    const p = principalWith(['user:create'])
    const r = authorize(p, '')
    if (r.ok) throw new Error('expected err')
    expect(r.error).not.toBe(AUTHZ_FAILURE.FORBIDDEN)
  })
})

describe('authorize — no mutation', () => {
  it('the principal is unchanged after a decision', () => {
    const p = principalWith(['user:create'])
    const sizeBefore = p.authority.size
    authorize(p, 'user:create')
    authorize(p, 'user:delete')
    expect(p.authority.size).toBe(sizeBefore)
  })

  it('the principal remains frozen', () => {
    const p = principalWith(['a'])
    authorize(p, 'a')
    expect(Object.isFrozen(p)).toBe(true)
  })
})

describe('authorize — never throws', () => {
  it('does not throw on any input combination', () => {
    const p = principalWith(['user:create'])
    expect(() => authorize(p, 'user:create')).not.toThrow()
    expect(() => authorize(p, 'user:delete')).not.toThrow()
    expect(() => authorize(null, 'user:create')).not.toThrow()
    expect(() => authorize(p, '')).not.toThrow()
    expect(() => authorize(undefined, '')).not.toThrow()
  })
})
