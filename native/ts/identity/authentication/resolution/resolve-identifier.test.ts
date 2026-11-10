/**
 * resolve-identifier.test.ts — tests for the `resolve-identifier` function.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../../primitives/identifier'
import { makeSubject } from '../../../primitives/subject'
import { AUTH_FAILURE } from '../../primitives/auth-failure'
import { resolveIdentifier, type Resolver } from './resolve-identifier'

const id = unsafeIdentifier('GMS001')
const other = unsafeIdentifier('GMS002')
const subject = makeSubject(id, 'human')

describe('resolve-identifier — happy path', () => {
  it('returns Ok carrying the resolved Subject', async () => {
    const resolver: Resolver = async () => subject
    const r = await resolveIdentifier(id, resolver)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(subject)
  })
})

describe('resolve-identifier — failures are values', () => {
  it('returns Err UNKNOWN_SUBJECT when resolver returns null', async () => {
    const resolver: Resolver = async () => null
    const r = await resolveIdentifier(id, resolver)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.UNKNOWN_SUBJECT)
  })

  it('returns Err INTERNAL when resolver throws', async () => {
    const resolver: Resolver = async () => {
      throw new Error('database down')
    }
    const r = await resolveIdentifier(id, resolver)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('does not propagate the resolver error text', async () => {
    const resolver: Resolver = async () => {
      throw new Error('connection string visible here')
    }
    const r = await resolveIdentifier(id, resolver)
    if (!r.ok) expect(r.error).not.toContain('connection')
  })
})

describe('resolve-identifier — identifier substitution', () => {
  it('returns Err INTERNAL when resolver returns a different identifier', async () => {
    const mismatched = makeSubject(other, 'human')
    const resolver: Resolver = async () => mismatched
    const r = await resolveIdentifier(id, resolver)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('resolve-identifier — purity', () => {
  it('passes the exact identifier through to the resolver', async () => {
    let observed: string | null = null
    const resolver: Resolver = async (i) => {
      observed = i
      return subject
    }
    await resolveIdentifier(id, resolver)
    expect(observed).toBe('GMS001')
  })
})
