/**
 * require-authority.test.ts — tests for the `require-authority` function.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { fromMillis } from '../../primitives/timestamp'
import { principalFromAssertion, type Principal } from '../primitives/principal'
import { AUTHZ_FAILURE } from '../primitives/authz-failure'
import { requireAuthority } from './require-authority'

function principalWith(authority: string[]): Principal {
  return principalFromAssertion({
    subject: makeSubject(unsafeIdentifier('GMS001'), 'human'),
    sessionId: unsafeIdentifier('session-abc'),
    authority,
    issuedAt: fromMillis(1_700_000_000_000),
  })
}

describe('require-authority — permitted, sync action', () => {
  it('returns Ok carrying the action return value', () => {
    const p = principalWith(['user:create'])
    const r = requireAuthority(p, 'user:create', () => 42)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(42)
  })

  it('runs the action exactly once', () => {
    let calls = 0
    const p = principalWith(['user:create'])
    requireAuthority(p, 'user:create', () => {
      calls += 1
      return 'done'
    })
    expect(calls).toBe(1)
  })

  it('passes through the exact return value', () => {
    const p = principalWith(['user:create'])
    const payload = { id: 'GMS001', ok: true }
    const r = requireAuthority(p, 'user:create', () => payload)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(payload)
  })
})

describe('require-authority — permitted, async action', () => {
  it('returns a Promise resolving to Ok', async () => {
    const p = principalWith(['user:create'])
    const r = await requireAuthority(p, 'user:create', async () => 'done')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('done')
  })

  it('the async action is invoked exactly once', async () => {
    let calls = 0
    const p = principalWith(['user:create'])
    await requireAuthority(p, 'user:create', async () => {
      calls += 1
      return null
    })
    expect(calls).toBe(1)
  })
})

describe('require-authority — denied', () => {
  it('returns Err FORBIDDEN when the token is absent', () => {
    const p = principalWith(['user:read'])
    const r = requireAuthority(p, 'user:create', () => 'never')
    if (r.ok) throw new Error('expected err')
    expect(r.error).toBe(AUTHZ_FAILURE.FORBIDDEN)
  })

  it('does not invoke the action when denied', () => {
    let called = false
    const p = principalWith([])
    requireAuthority(p, 'user:create', () => {
      called = true
      return 'never'
    })
    expect(called).toBe(false)
  })

  it('does not invoke an async action when denied', () => {
    let called = false
    const p = principalWith([])
    requireAuthority(p, 'user:create', async () => {
      called = true
      return 'never'
    })
    expect(called).toBe(false)
  })

  it('empty authority denies every action', () => {
    const p = principalWith([])
    const r = requireAuthority(p, 'anything', () => 'never')
    if (r.ok) throw new Error('expected err')
    expect(r.error).toBe(AUTHZ_FAILURE.FORBIDDEN)
  })
})

describe('require-authority — missing principal', () => {
  it('returns Err NO_PRINCIPAL when the principal is null', () => {
    const r = requireAuthority(null, 'user:create', () => 'never')
    if (r.ok) throw new Error('expected err')
    expect(r.error).toBe(AUTHZ_FAILURE.NO_PRINCIPAL)
  })

  it('returns Err NO_PRINCIPAL when the principal is undefined', () => {
    const r = requireAuthority(undefined, 'user:create', () => 'never')
    if (r.ok) throw new Error('expected err')
    expect(r.error).toBe(AUTHZ_FAILURE.NO_PRINCIPAL)
  })

  it('does not invoke the action when the principal is missing', () => {
    let called = false
    requireAuthority(null, 'user:create', () => {
      called = true
      return 'never'
    })
    expect(called).toBe(false)
  })
})

describe('require-authority — malformed token', () => {
  it('returns Err UNKNOWN_ACTION for an empty token', () => {
    const p = principalWith(['user:create'])
    const r = requireAuthority(p, '', () => 'never')
    if (r.ok) throw new Error('expected err')
    expect(r.error).toBe(AUTHZ_FAILURE.UNKNOWN_ACTION)
  })

  it('does not invoke the action when the token is malformed', () => {
    let called = false
    const p = principalWith(['user:create'])
    requireAuthority(p, '', () => {
      called = true
      return 'never'
    })
    expect(called).toBe(false)
  })
})

describe('require-authority — action exceptions', () => {
  it('returns Err INTERNAL when a sync action throws', () => {
    const p = principalWith(['user:create'])
    const r = requireAuthority(p, 'user:create', () => {
      throw new Error('boom')
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.INTERNAL)
  })

  it('returns Err INTERNAL when an async action rejects', async () => {
    const p = principalWith(['user:create'])
    const r = await requireAuthority(p, 'user:create', async () => {
      throw new Error('async boom')
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.INTERNAL)
  })

  it('does not propagate the action error text', () => {
    const p = principalWith(['user:create'])
    const r = requireAuthority(p, 'user:create', () => {
      throw new Error('secret path /keys/visible')
    })
    if (r.ok) throw new Error('expected err')
    expect(JSON.stringify(r)).not.toContain('secret')
  })
})

describe('require-authority — never throws', () => {
  it('does not throw on any input', () => {
    const p = principalWith(['user:create'])
    expect(() => requireAuthority(p, 'user:create', () => 1)).not.toThrow()
    expect(() => requireAuthority(p, 'user:delete', () => 1)).not.toThrow()
    expect(() => requireAuthority(null, 'user:create', () => 1)).not.toThrow()
    expect(() => requireAuthority(p, '', () => 1)).not.toThrow()
    expect(() =>
      requireAuthority(p, 'user:create', () => {
        throw new Error('x')
      }),
    ).not.toThrow()
  })
})
