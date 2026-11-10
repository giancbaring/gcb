/**
 * compare-secret.test.ts — tests for the `compare-secret` function.
 */

import { describe, it, expect } from 'vitest'
import { Credential } from '../../primitives/credential'
import { Secret } from '../../../primitives/secret'
import { AUTH_FAILURE } from '../../primitives/auth-failure'
import { compareSecret, type Comparator } from './compare-secret'

const cred = Credential.fromRaw('hunter2')
const secret = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })

const alwaysTrue: Comparator = () => true
const alwaysFalse: Comparator = () => false
const throws: Comparator = () => {
  throw new Error('boom')
}

describe('compare-secret — happy path', () => {
  it('returns Ok(true) when the comparator reports a match', () => {
    const r = compareSecret(cred, secret, alwaysTrue)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(true)
  })
})

describe('compare-secret — failures are values', () => {
  it('returns Err MISMATCH when the comparator reports no match', () => {
    const r = compareSecret(cred, secret, alwaysFalse)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.MISMATCH)
  })

  it('returns Err INTERNAL when the comparator throws', () => {
    const r = compareSecret(cred, secret, throws)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('does not propagate the comparator error text', () => {
    const leak: Comparator = () => {
      throw new Error('secret hash was deadbeef')
    }
    const r = compareSecret(cred, secret, leak)
    if (!r.ok) expect(r.error).not.toContain('deadbeef')
  })
})

describe('compare-secret — no leakage', () => {
  it('does not expose the credential in a Result', () => {
    const r = compareSecret(cred, secret, alwaysTrue)
    const serialized = JSON.stringify(r)
    expect(serialized).not.toContain('hunter2')
  })

  it('does not expose the secret hash in a Result', () => {
    const r = compareSecret(cred, secret, alwaysFalse)
    const serialized = JSON.stringify(r)
    expect(serialized).not.toContain('deadbeef')
  })

  it('passes the raw credential and secret to the comparator', () => {
    let seenCred: string | null = null
    let seenSecret: string | null = null
    const spy: Comparator = (p, s) => {
      seenCred = p
      seenSecret = s.hash
      return true
    }
    compareSecret(cred, secret, spy)
    expect(seenCred).toBe('hunter2')
    expect(seenSecret).toBe('deadbeef')
  })
})
