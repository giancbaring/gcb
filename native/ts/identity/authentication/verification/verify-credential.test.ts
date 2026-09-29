/**
 * verify-credential.test.ts — tests for the `verify-credential` function.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../../primitives/identifier'
import { makeSubject } from '../../../primitives/subject'
import { Credential } from '../../../primitives/credential'
import { Secret } from '../../../primitives/secret'
import { AUTH_FAILURE } from '../../../primitives/auth-failure'
import type { Comparator } from './compare-secret'
import { verifyCredential, type VerificationContext } from './verify-credential'

const id = unsafeIdentifier('GMS001')
const other = unsafeIdentifier('GMS002')
const subject = makeSubject(id, 'human')
const secret = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })
const credential = Credential.fromRaw('hunter2')

const acceptAll: Comparator = () => true
const rejectAll: Comparator = () => false

function contextFor(
  payload: { subject: typeof subject; secret: typeof secret } | null,
): VerificationContext {
  return {
    resolve: async () => payload,
  }
}

describe('verify-credential — happy path', () => {
  it('returns Ok carrying the resolved Subject', async () => {
    const ctx = contextFor({ subject, secret })
    const r = await verifyCredential(id, credential, ctx, acceptAll)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(subject)
  })
})

describe('verify-credential — unknown identifier', () => {
  it('returns Err UNKNOWN_SUBJECT when the context resolves nothing', async () => {
    const ctx = contextFor(null)
    const r = await verifyCredential(id, credential, ctx, acceptAll)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.UNKNOWN_SUBJECT)
  })

  it('does not run the comparator when the identifier is unknown', async () => {
    let called = false
    const spy: Comparator = () => {
      called = true
      return true
    }
    await verifyCredential(id, credential, contextFor(null), spy)
    expect(called).toBe(false)
  })
})

describe('verify-credential — mismatched credential', () => {
  it('returns Err MISMATCH when the comparator rejects', async () => {
    const ctx = contextFor({ subject, secret })
    const r = await verifyCredential(id, credential, ctx, rejectAll)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.MISMATCH)
  })
})

describe('verify-credential — resolver failures', () => {
  it('returns Err INTERNAL when the resolver throws', async () => {
    const ctx: VerificationContext = {
      resolve: async () => {
        throw new Error('database down')
      },
    }
    const r = await verifyCredential(id, credential, ctx, acceptAll)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('does not propagate the resolver error text', async () => {
    const ctx: VerificationContext = {
      resolve: async () => {
        throw new Error('connection string leaked here')
      },
    }
    const r = await verifyCredential(id, credential, ctx, acceptAll)
    if (!r.ok) expect(r.error).not.toContain('leaked')
  })

  it('returns Err INTERNAL when the resolver returns a mismatched subject', async () => {
    const wrong = makeSubject(other, 'human')
    const ctx = contextFor({ subject: wrong, secret })
    const r = await verifyCredential(id, credential, ctx, acceptAll)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('verify-credential — no leakage', () => {
  it('the credential does not appear in a success Result', async () => {
    const ctx = contextFor({ subject, secret })
    const r = await verifyCredential(id, credential, ctx, acceptAll)
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })

  it('the credential does not appear in a failure Result', async () => {
    const ctx = contextFor({ subject, secret })
    const r = await verifyCredential(id, credential, ctx, rejectAll)
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })

  it('the secret hash does not appear in a failure Result', async () => {
    const ctx = contextFor({ subject, secret })
    const r = await verifyCredential(id, credential, ctx, rejectAll)
    expect(JSON.stringify(r)).not.toContain('deadbeef')
  })
})
