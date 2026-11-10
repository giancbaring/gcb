/**
 * change-credential.test.ts — tests for the `change-credential` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { Credential } from '../primitives/credential'
import { Secret } from '../../primitives/secret'
import { AUTH_FAILURE } from '../primitives/auth-failure'
import type { Comparator } from '../authentication/verification/compare-secret'
import type { Hasher } from './hash-credential'
import {
  changeCredential,
  type ChangeContext,
  type SecretSink,
} from './change-credential'

const id = unsafeIdentifier('GMS001')
const other = unsafeIdentifier('GMS002')
const subject = makeSubject(id, 'human')
const storedSecret = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })

const oldCred = Credential.fromRaw('old-password')
const newCred = Credential.fromRaw('new-password')

const acceptAll: Comparator = () => true
const rejectAll: Comparator = () => false
const stableHasher: Hasher = (raw) => ({ algorithm: 'sha256', hash: `hashed:${raw}` })

function contextFor(
  payload: { subject: typeof subject; secret: typeof storedSecret } | null,
): ChangeContext {
  return { resolve: async () => payload }
}

const validPayload = { subject, secret: storedSecret }

function collector(): { sink: SecretSink; writes: Array<{ subject: typeof subject; secret: Secret }> } {
  const writes: Array<{ subject: typeof subject; secret: Secret }> = []
  const sink: SecretSink = {
    write: (s, sec) => {
      writes.push({ subject: s, secret: sec })
    },
  }
  return { sink, writes }
}

describe('change-credential — happy path', () => {
  it('returns Ok carrying void', async () => {
    const { sink } = collector()
    const r = await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      acceptAll, stableHasher, sink,
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeUndefined()
  })

  it('the sink is called exactly once', async () => {
    const { sink, writes } = collector()
    await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      acceptAll, stableHasher, sink,
    )
    expect(writes.length).toBe(1)
  })

  it('the sink receives the subject and the hashed new secret', async () => {
    const { sink, writes } = collector()
    await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      acceptAll, stableHasher, sink,
    )
    const write = writes[0]
    if (write === undefined) throw new Error('expected credential sink write')
    expect(write.subject).toBe(subject)
    expect(write.secret.reveal().hash).toBe('hashed:new-password')
  })

  it('the hasher receives the new credential, not the old one', async () => {
    const { sink } = collector()
    const seen: string[] = []
    const spyHasher: Hasher = (raw) => {
      seen.push(raw)
      return { algorithm: 'sha256', hash: 'x' }
    }
    await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      acceptAll, spyHasher, sink,
    )
    expect(seen).toEqual(['new-password'])
  })
})

describe('change-credential — verification gate', () => {
  it('returns Err UNKNOWN_SUBJECT for an unknown identifier', async () => {
    const { sink, writes } = collector()
    const r = await changeCredential(
      id, oldCred, newCred, contextFor(null),
      acceptAll, stableHasher, sink,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.UNKNOWN_SUBJECT)
    expect(writes.length).toBe(0)
  })

  it('returns Err MISMATCH when the old credential is wrong', async () => {
    const { sink, writes } = collector()
    const r = await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      rejectAll, stableHasher, sink,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.MISMATCH)
    expect(writes.length).toBe(0)
  })

  it('does not call the hasher when verification fails', async () => {
    const { sink } = collector()
    let called = false
    const spyHasher: Hasher = () => {
      called = true
      return { algorithm: 'sha256', hash: 'x' }
    }
    await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      rejectAll, spyHasher, sink,
    )
    expect(called).toBe(false)
  })

  it('returns Err INTERNAL when the resolver throws', async () => {
    const { sink } = collector()
    const badCtx: ChangeContext = {
      resolve: async () => {
        throw new Error('database down')
      },
    }
    const r = await changeCredential(
      id, oldCred, newCred, badCtx, acceptAll, stableHasher, sink,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('returns Err INTERNAL when the resolved subject mismatches', async () => {
    const { sink } = collector()
    const wrong = makeSubject(other, 'human')
    const r = await changeCredential(
      id, oldCred, newCred, contextFor({ subject: wrong, secret: storedSecret }),
      acceptAll, stableHasher, sink,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('change-credential — hasher failures', () => {
  it('returns Err INTERNAL when the hasher throws', async () => {
    const { sink, writes } = collector()
    const throwing: Hasher = () => {
      throw new Error('entropy')
    }
    const r = await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      acceptAll, throwing, sink,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
    expect(writes.length).toBe(0)
  })
})

describe('change-credential — sink failures', () => {
  it('returns Err INTERNAL when the sink throws', async () => {
    const sink: SecretSink = {
      write: () => {
        throw new Error('database unreachable')
      },
    }
    const r = await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      acceptAll, stableHasher, sink,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('returns Err INTERNAL when an async sink rejects', async () => {
    const sink: SecretSink = {
      write: async () => {
        throw new Error('async failure')
      },
    }
    const r = await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      acceptAll, stableHasher, sink,
    )
    expect(r.ok).toBe(false)
  })
})

describe('change-credential — no leakage', () => {
  it('the old credential does not appear in a failure result', async () => {
    const { sink } = collector()
    const r = await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      rejectAll, stableHasher, sink,
    )
    expect(JSON.stringify(r)).not.toContain('old-password')
  })

  it('the new credential does not appear in a failure result', async () => {
    const sink: SecretSink = {
      write: () => {
        throw new Error('x')
      },
    }
    const r = await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      acceptAll, stableHasher, sink,
    )
    expect(JSON.stringify(r)).not.toContain('new-password')
  })

  it('neither credential appears in a success result', async () => {
    const { sink } = collector()
    const r = await changeCredential(
      id, oldCred, newCred, contextFor(validPayload),
      acceptAll, stableHasher, sink,
    )
    const s = JSON.stringify(r)
    expect(s).not.toContain('old-password')
    expect(s).not.toContain('new-password')
  })
})

describe('change-credential — never throws', () => {
  it('does not throw on any input combination', async () => {
    const { sink } = collector()
    await expect(
      changeCredential(id, oldCred, newCred, contextFor(null), acceptAll, stableHasher, sink),
    ).resolves.toBeDefined()
    await expect(
      changeCredential(id, oldCred, newCred, contextFor(validPayload), rejectAll, stableHasher, sink),
    ).resolves.toBeDefined()
  })
})
