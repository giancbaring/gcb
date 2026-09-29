/**
 * hash-credential.test.ts — tests for the `hash-credential` function.
 */

import { describe, it, expect } from 'vitest'
import { Credential } from '../../primitives/credential'
import { AUTH_FAILURE } from '../../primitives/auth-failure'
import { hashCredential, type Hasher } from './hash-credential'

const cred = Credential.fromRaw('hunter2')

const stableHasher: Hasher = (raw) => ({
  algorithm: 'sha256',
  hash: `hashed:${raw}`,
})

const argonHasher: Hasher = () => ({
  algorithm: 'argon2id',
  hash: 'hashed-bytes',
  parameters: { memory: 19456, iterations: 2, parallelism: 1 },
})

describe('hash-credential — happy path', () => {
  it('returns Ok carrying a Secret', () => {
    const r = hashCredential(cred, stableHasher)
    expect(r.ok).toBe(true)
  })

  it('the Secret carries the hasher algorithm', () => {
    const r = hashCredential(cred, argonHasher)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.reveal().algorithm).toBe('argon2id')
  })

  it('the Secret carries the hasher output', () => {
    const r = hashCredential(cred, stableHasher)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.reveal().hash).toBe('hashed:hunter2')
  })

  it('parameters are preserved', () => {
    const r = hashCredential(cred, argonHasher)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.reveal().parameters).toEqual({
      memory: 19456,
      iterations: 2,
      parallelism: 1,
    })
  })

  it('the hasher receives the raw credential', () => {
    let seen: string | null = null
    const spy: Hasher = (raw) => {
      seen = raw
      return { algorithm: 'sha256', hash: 'x' }
    }
    hashCredential(cred, spy)
    expect(seen).toBe('hunter2')
  })
})

describe('hash-credential — failures are values', () => {
  it('returns Err INTERNAL when the hasher throws', () => {
    const throwing: Hasher = () => {
      throw new Error('entropy exhausted')
    }
    const r = hashCredential(cred, throwing)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('does not propagate the hasher error text', () => {
    const leaky: Hasher = () => {
      throw new Error('secret path /keys/visible')
    }
    const r = hashCredential(cred, leaky)
    if (!r.ok) expect(r.error).not.toContain('path')
  })

  it('returns Err INTERNAL when the hasher returns an invalid storage record', () => {
    const bad: Hasher = () => ({ algorithm: '', hash: '' })
    const r = hashCredential(cred, bad)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('hash-credential — no leakage', () => {
  it('the credential does not appear in a success result', () => {
    const r = hashCredential(cred, stableHasher)
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })

  it('the credential does not appear in a failure result', () => {
    const throwing: Hasher = () => {
      throw new Error('x')
    }
    const r = hashCredential(cred, throwing)
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })
})

describe('hash-credential — never throws', () => {
  it('does not throw on any input', () => {
    expect(() => hashCredential(cred, stableHasher)).not.toThrow()
    expect(() =>
      hashCredential(cred, () => {
        throw new Error('x')
      }),
    ).not.toThrow()
  })
})
