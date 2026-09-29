/**
 * authenticate.test.ts — tests for the `authenticate` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { Credential } from '../../primitives/credential'
import { Secret } from '../../primitives/secret'
import { fromMillis } from '../../primitives/timestamp'
import { AUTH_FAILURE } from '../../primitives/auth-failure'
import type { Comparator } from './verification/compare-secret'
import type { IdGenerator, Clock } from './assertion/issue-assertion'
import { authenticate, type AuthenticationContext } from './authenticate'

const id = unsafeIdentifier('GMS001')
const other = unsafeIdentifier('GMS002')
const subject = makeSubject(id, 'human')
const secret = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })
const credential = Credential.fromRaw('hunter2')

const fixedTime = fromMillis(1_700_000_000_000)
const fixedSessionId = unsafeIdentifier('session-abc')

const stableIdGen: IdGenerator = () => fixedSessionId
const stableClock: Clock = () => fixedTime
const acceptAll: Comparator = () => true
const rejectAll: Comparator = () => false

function contextFor(
  payload: { subject: typeof subject; secret: typeof secret; authority: string[] } | null,
): AuthenticationContext {
  return {
    resolve: async () => payload,
  }
}

const validPayload = { subject, secret, authority: ['OFFICER'] }

describe('authenticate — happy path', () => {
  it('returns Ok carrying an Assertion', async () => {
    const r = await authenticate(
      id,
      credential,
      contextFor(validPayload),
      acceptAll,
      stableIdGen,
      stableClock,
    )
    expect(r.ok).toBe(true)
  })

  it('the Assertion subject equals the resolved subject', async () => {
    const r = await authenticate(
      id,
      credential,
      contextFor(validPayload),
      acceptAll,
      stableIdGen,
      stableClock,
    )
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.subject).toBe(subject)
  })

  it('the Assertion authority equals the context-supplied authority', async () => {
    const r = await authenticate(
      id,
      credential,
      contextFor({ ...validPayload, authority: ['OFFICER', 'ADVISER'] }),
      acceptAll,
      stableIdGen,
      stableClock,
    )
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.authority).toEqual(['OFFICER', 'ADVISER'])
  })

  it('the Assertion carries the supplied session id and time', async () => {
    const r = await authenticate(
      id,
      credential,
      contextFor(validPayload),
      acceptAll,
      stableIdGen,
      stableClock,
    )
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.sessionId).toBe(fixedSessionId)
    expect(r.value.issuedAt).toBe(fixedTime)
  })
})

describe('authenticate — resolution failures', () => {
  it('returns Err UNKNOWN_SUBJECT when the context resolves nothing', async () => {
    const r = await authenticate(
      id,
      credential,
      contextFor(null),
      acceptAll,
      stableIdGen,
      stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.UNKNOWN_SUBJECT)
  })

  it('returns Err INTERNAL when the resolver throws', async () => {
    const ctx: AuthenticationContext = {
      resolve: async () => {
        throw new Error('database down')
      },
    }
    const r = await authenticate(id, credential, ctx, acceptAll, stableIdGen, stableClock)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('returns Err INTERNAL when the resolved subject id mismatches', async () => {
    const wrong = makeSubject(other, 'human')
    const r = await authenticate(
      id,
      credential,
      contextFor({ subject: wrong, secret, authority: [] }),
      acceptAll,
      stableIdGen,
      stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('authenticate — verification failures', () => {
  it('returns Err MISMATCH when the comparator rejects', async () => {
    const r = await authenticate(
      id,
      credential,
      contextFor(validPayload),
      rejectAll,
      stableIdGen,
      stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.MISMATCH)
  })

  it('returns Err INTERNAL when the comparator throws', async () => {
    const throwing: Comparator = () => {
      throw new Error('boom')
    }
    const r = await authenticate(
      id,
      credential,
      contextFor(validPayload),
      throwing,
      stableIdGen,
      stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('does not issue an assertion when verification fails', async () => {
    let idGeneratorCalled = false
    const spyGen: IdGenerator = () => {
      idGeneratorCalled = true
      return fixedSessionId
    }
    await authenticate(
      id,
      credential,
      contextFor(validPayload),
      rejectAll,
      spyGen,
      stableClock,
    )
    expect(idGeneratorCalled).toBe(false)
  })
})

describe('authenticate — assertion issuance failures', () => {
  it('returns Err INTERNAL when the id generator throws', async () => {
    const failing: IdGenerator = () => {
      throw new Error('entropy exhausted')
    }
    const r = await authenticate(
      id,
      credential,
      contextFor(validPayload),
      acceptAll,
      failing,
      stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('authenticate — no leakage', () => {
  it('the credential never appears in a success result', async () => {
    const r = await authenticate(
      id,
      credential,
      contextFor(validPayload),
      acceptAll,
      stableIdGen,
      stableClock,
    )
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })

  it('the credential never appears in a failure result', async () => {
    const r = await authenticate(
      id,
      credential,
      contextFor(validPayload),
      rejectAll,
      stableIdGen,
      stableClock,
    )
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })

  it('the secret hash never appears in a failure result', async () => {
    const r = await authenticate(
      id,
      credential,
      contextFor(validPayload),
      rejectAll,
      stableIdGen,
      stableClock,
    )
    expect(JSON.stringify(r)).not.toContain('deadbeef')
  })
})

describe('authenticate — never throws', () => {
  it('does not throw on any input combination', async () => {
    await expect(
      authenticate(id, credential, contextFor(null), acceptAll, stableIdGen, stableClock),
    ).resolves.toBeDefined()

    await expect(
      authenticate(id, credential, contextFor(validPayload), rejectAll, stableIdGen, stableClock),
    ).resolves.toBeDefined()

    const badCtx: AuthenticationContext = {
      resolve: async () => {
        throw new Error('x')
      },
    }
    await expect(
      authenticate(id, credential, badCtx, acceptAll, stableIdGen, stableClock),
    ).resolves.toBeDefined()
  })
})
