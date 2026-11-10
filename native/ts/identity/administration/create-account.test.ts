/**
 * create-account.test.ts — tests for the `create-account` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { fromMillis } from '../../primitives/timestamp'
import { Credential } from '../primitives/credential'
import { Secret } from '../../primitives/secret'
import { principalFromAssertion, type Principal } from '../primitives/principal'
import { AUTHZ_FAILURE } from '../primitives/authz-failure'
import type { Hasher } from '../credentials/hash-credential'
import {
  createAccount,
  CREATE_ACCOUNT_ACTION,
  type AccountSink,
} from './create-account'

const fixedTime = fromMillis(1_700_000_000_000)
const fixedClock = () => fixedTime

function adminPrincipal(): Principal {
  return principalFromAssertion({
    subject: makeSubject(unsafeIdentifier('GMS001'), 'human', { role: 'ADMIN' }),
    sessionId: unsafeIdentifier('session-admin'),
    authority: [CREATE_ACCOUNT_ACTION, 'user:read'],
    issuedAt: fixedTime,
  })
}

function officerPrincipal(): Principal {
  return principalFromAssertion({
    subject: makeSubject(unsafeIdentifier('GMS002'), 'human', { role: 'OFFICER' }),
    sessionId: unsafeIdentifier('session-officer'),
    authority: ['user:read'],
    issuedAt: fixedTime,
  })
}

function targetSubject() {
  return makeSubject(unsafeIdentifier('GMS042'), 'human', { role: 'STAFF' })
}

const initialCredential = Credential.fromRaw('initial-password')

/**
 * A hasher that produces opaque output. Real hashers do not embed the
 * input; this fake does not either, so tests can assert the credential
 * never appears in the result.
 */
const stableHasher: Hasher = () => ({
  algorithm: 'argon2id',
  hash: 'a3f1c9d7e2b8456f1c0d8e3a7b2f9c4d5e6a1b0c8d7e9f2a3b4c5d6e7f8a9b0c',
})

function accountSinkCollector() {
  const writes: Array<{
    subject: ReturnType<typeof targetSubject>
    secret: Secret
    authority: readonly string[]
  }> = []
  const sink: AccountSink = {
    create: (subject, secret, authority) => {
      writes.push({ subject, secret, authority })
    },
  }
  return { sink, writes }
}

describe('create-account — permitted', () => {
  it('returns Ok carrying the target subject', async () => {
    const { sink } = accountSinkCollector()
    const target = targetSubject()
    const r = await createAccount(
      adminPrincipal(),
      target,
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(target)
  })

  it('the account sink is called exactly once', async () => {
    const { sink, writes } = accountSinkCollector()
    await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(writes.length).toBe(1)
  })

  it('the sink receives the subject, hashed secret, and authority', async () => {
    const { sink, writes } = accountSinkCollector()
    const target = targetSubject()
    await createAccount(
      adminPrincipal(),
      target,
      initialCredential,
      ['OFFICER', 'ADVISER'],
      sink,
      stableHasher,
      fixedClock,
    )
    const write = writes[0]
    if (write === undefined) throw new Error('expected account sink write')
    expect(write.subject).toBe(target)
    expect(write.secret.reveal().algorithm).toBe('argon2id')
    expect(write.authority).toEqual(['OFFICER', 'ADVISER'])
  })

  it('the authority list reaches the sink frozen', async () => {
    const { sink, writes } = accountSinkCollector()
    await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    const write = writes[0]
    if (write === undefined) throw new Error('expected account sink write')
    expect(Object.isFrozen(write.authority)).toBe(true)
  })

  it('the credential never reaches the sink in plaintext', async () => {
    const { sink, writes } = accountSinkCollector()
    await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    const write = writes[0]
    if (write === undefined) throw new Error('expected account sink write')
    const serialized = JSON.stringify(write.secret.reveal())
    expect(serialized).not.toContain('initial-password')
  })

  it('the hasher receives the raw credential exactly once', async () => {
    const { sink } = accountSinkCollector()
    const seen: string[] = []
    const spyHasher: Hasher = (raw) => {
      seen.push(raw)
      return { algorithm: 'sha256', hash: 'opaque-bytes' }
    }
    await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      spyHasher,
      fixedClock,
    )
    expect(seen).toEqual(['initial-password'])
  })
})

describe('create-account — denied', () => {
  it('returns Err FORBIDDEN when the principal lacks user:create', async () => {
    const { sink } = accountSinkCollector()
    const r = await createAccount(
      officerPrincipal(),
      targetSubject(),
      initialCredential,
      ['ADMIN'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.FORBIDDEN)
  })

  it('does not call the account sink on denial', async () => {
    const { sink, writes } = accountSinkCollector()
    await createAccount(
      officerPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(writes.length).toBe(0)
  })

  it('does not call the hasher on denial', async () => {
    const { sink } = accountSinkCollector()
    let called = false
    const spyHasher: Hasher = () => {
      called = true
      return { algorithm: 'sha256', hash: 'x' }
    }
    await createAccount(
      officerPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      spyHasher,
      fixedClock,
    )
    expect(called).toBe(false)
  })
})

describe('create-account — missing principal', () => {
  it('returns Err NO_PRINCIPAL for a null principal', async () => {
    const { sink } = accountSinkCollector()
    const r = await createAccount(
      null,
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.NO_PRINCIPAL)
  })

  it('returns Err NO_PRINCIPAL for an undefined principal', async () => {
    const { sink } = accountSinkCollector()
    const r = await createAccount(
      undefined,
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.NO_PRINCIPAL)
  })

  it('does not call the account sink when the principal is missing', async () => {
    const { sink, writes } = accountSinkCollector()
    await createAccount(
      null,
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(writes.length).toBe(0)
  })
})

describe('create-account — hasher failure', () => {
  it('returns Err INTERNAL when the hasher throws', async () => {
    const { sink } = accountSinkCollector()
    const throwing: Hasher = () => {
      throw new Error('entropy exhausted')
    }
    const r = await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      throwing,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.INTERNAL)
  })

  it('does not call the account sink when the hasher throws', async () => {
    const { sink, writes } = accountSinkCollector()
    const throwing: Hasher = () => {
      throw new Error('boom')
    }
    await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      throwing,
      fixedClock,
    )
    expect(writes.length).toBe(0)
  })

  it('returns Err INTERNAL when the hasher returns an invalid storage record', async () => {
    const { sink } = accountSinkCollector()
    const bad: Hasher = () => ({ algorithm: '', hash: '' })
    const r = await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      bad,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.INTERNAL)
  })
})

describe('create-account — sink failure', () => {
  it('returns Err INTERNAL when the sink throws', async () => {
    const sink: AccountSink = {
      create: () => {
        throw new Error('database down')
      },
    }
    const r = await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.INTERNAL)
  })

  it('returns Err INTERNAL when an async sink rejects', async () => {
    const sink: AccountSink = {
      create: async () => {
        throw new Error('async boom')
      },
    }
    const r = await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
  })

  it('does not propagate the sink error text', async () => {
    const sink: AccountSink = {
      create: () => {
        throw new Error('connection string visible here')
      },
    }
    const r = await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    if (r.ok) throw new Error('expected err')
    expect(JSON.stringify(r)).not.toContain('connection')
  })
})

describe('create-account — no leakage', () => {
  it('the credential does not appear in a failure result', async () => {
    const { sink } = accountSinkCollector()
    const r = await createAccount(
      officerPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(JSON.stringify(r)).not.toContain('initial-password')
  })

  it('the credential does not appear in a success result', async () => {
    const { sink } = accountSinkCollector()
    const r = await createAccount(
      adminPrincipal(),
      targetSubject(),
      initialCredential,
      ['STAFF'],
      sink,
      stableHasher,
      fixedClock,
    )
    expect(JSON.stringify(r)).not.toContain('initial-password')
  })
})

describe('create-account — never throws', () => {
  it('does not throw on any input', async () => {
    const { sink } = accountSinkCollector()
    await expect(
      createAccount(adminPrincipal(), targetSubject(), initialCredential, ['A'], sink, stableHasher, fixedClock),
    ).resolves.toBeDefined()

    await expect(
      createAccount(officerPrincipal(), targetSubject(), initialCredential, ['A'], sink, stableHasher, fixedClock),
    ).resolves.toBeDefined()

    await expect(
      createAccount(null, targetSubject(), initialCredential, ['A'], sink, stableHasher, fixedClock),
    ).resolves.toBeDefined()
  })
})
