/**
 * reset-credential.test.ts — tests for the `reset-credential` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { Credential } from '../../primitives/credential'
import { Secret } from '../../primitives/secret'
import { fromMillis } from '../../primitives/timestamp'
import { AUTH_FAILURE } from '../../primitives/auth-failure'
import { OUTCOME } from '../../primitives/outcome'
import { makeResetToken, type KeyedResetToken } from '../../primitives/reset-token'
import type { AuthEvent } from '../../primitives/auth-event'
import type { Hasher } from './hash-credential'
import type { AuthEventSink } from '../observability/record-auth-event'
import {
  resetCredential,
  RESET_PURPOSE,
  type ConsumeOutcome,
  type CredentialSink,
  type ResetTokenStore,
} from './reset-credential'

const fixedTime = fromMillis(1_700_000_000_000)
const fixedClock = () => fixedTime

const subject = makeSubject(unsafeIdentifier('GMS001'), 'human')
const newCredential = Credential.fromRaw('new-password')

const stableHasher: Hasher = () => ({
  algorithm: 'argon2id',
  hash: 'a3f1c9d7e2b8456f1c0d8e3a7b2f9c4d5e6a1b0c7d7e9f2a3b4c5d6e7f8a9b0c',
})

function validToken(purpose = RESET_PURPOSE): KeyedResetToken {
  const r = makeResetToken({ purpose, validate: (raw) => raw.length > 0 }, 'a'.repeat(64))
  if (!r.ok) throw new Error('expected token')
  return r.value
}

function storeReturning(outcome: ConsumeOutcome): ResetTokenStore {
  return { consume: () => outcome }
}

function storeCollector() {
  const consumed: KeyedResetToken[] = []
  const store: ResetTokenStore = {
    consume: (t) => {
      consumed.push(t)
      return { kind: 'consumed', subject }
    },
  }
  return { store, consumed }
}

function credentialSinkCollector() {
  const writes: Array<{ subject: typeof subject; secret: Secret }> = []
  const sink: CredentialSink = {
    write: (s, sec) => {
      writes.push({ subject: s, secret: sec })
    },
  }
  return { sink, writes }
}

function eventCollector() {
  const events: AuthEvent[] = []
  const sink: AuthEventSink = {
    append: (e) => {
      events.push(e)
    },
  }
  return { sink, events }
}

describe('reset-credential — happy path', () => {
  it('returns Ok carrying void', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    const r = await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeUndefined()
  })

  it('the credential sink is called exactly once', async () => {
    const { sink, writes } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      sink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(writes.length).toBe(1)
  })

  it('the sink receives the resolved subject and the hashed secret', async () => {
    const { sink, writes } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      sink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(writes[0].subject).toBe(subject)
    expect(writes[0].secret.reveal().algorithm).toBe('argon2id')
  })

  it('the credential never reaches the sink in plaintext', async () => {
    const { sink, writes } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      sink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(JSON.stringify(writes[0].secret.reveal())).not.toContain('new-password')
  })

  it('a SUCCESS auth event is recorded', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink, events } = eventCollector()
    await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(events.length).toBe(1)
    expect(events[0].outcome).toBe(OUTCOME.SUCCESS)
  })
})

describe('reset-credential — purpose check', () => {
  it('returns Err MISMATCH when the token purpose does not match', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    const { store, consumed } = storeCollector()
    const r = await resetCredential(
      validToken('email-change'),
      newCredential,
      store,
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.MISMATCH)
    expect(consumed.length).toBe(0)
  })

  it('the store is not consulted when the purpose does not match', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    let called = false
    const store: ResetTokenStore = {
      consume: () => {
        called = true
        return { kind: 'consumed', subject }
      },
    }
    await resetCredential(
      validToken('email-change'),
      newCredential,
      store,
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(called).toBe(false)
  })
})

describe('reset-credential — token failures', () => {
  it('returns Err UNKNOWN_SUBJECT when the token is unknown', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    const r = await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'unknown' }),
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.UNKNOWN_SUBJECT)
  })

  it('returns Err EXPIRED when the token has expired', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    const r = await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'expired' }),
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.EXPIRED)
  })

  it('does not call the credential sink on token failure', async () => {
    const { sink, writes } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'unknown' }),
      sink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(writes.length).toBe(0)
  })

  it('does not call the hasher on token failure', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    let called = false
    const spyHasher: Hasher = () => {
      called = true
      return { algorithm: 'sha256', hash: 'x' }
    }
    await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'expired' }),
      credSink,
      eventSink,
      spyHasher,
      fixedClock,
    )
    expect(called).toBe(false)
  })

  it('returns Err INTERNAL when the store throws', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    const store: ResetTokenStore = {
      consume: () => {
        throw new Error('database down')
      },
    }
    const r = await resetCredential(
      validToken(),
      newCredential,
      store,
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('reset-credential — hasher failure after consumption', () => {
  it('returns Err INTERNAL when the hasher throws', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    const throwing: Hasher = () => {
      throw new Error('entropy exhausted')
    }
    const r = await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      credSink,
      eventSink,
      throwing,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('records an ERROR auth event when the hasher throws', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink, events } = eventCollector()
    const throwing: Hasher = () => {
      throw new Error('boom')
    }
    await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      credSink,
      eventSink,
      throwing,
      fixedClock,
    )
    expect(events.length).toBe(1)
    expect(events[0].outcome).toBe(OUTCOME.ERROR)
  })
})

describe('reset-credential — sink failure', () => {
  it('returns Err INTERNAL when the sink throws', async () => {
    const { sink: eventSink } = eventCollector()
    const sink: CredentialSink = {
      write: () => {
        throw new Error('database down')
      },
    }
    const r = await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      sink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('records an ERROR auth event when the sink throws', async () => {
    const { sink: eventSink, events } = eventCollector()
    const sink: CredentialSink = {
      write: () => {
        throw new Error('boom')
      },
    }
    await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      sink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(events.length).toBe(1)
    expect(events[0].outcome).toBe(OUTCOME.ERROR)
  })

  it('returns Err INTERNAL when the audit sink throws', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const failingEventSink: AuthEventSink = {
      append: () => {
        throw new Error('audit unreachable')
      },
    }
    const r = await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      credSink,
      failingEventSink,
      stableHasher,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('reset-credential — no leakage', () => {
  it('the credential does not appear in a failure result', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    const r = await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'unknown' }),
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(JSON.stringify(r)).not.toContain('new-password')
  })

  it('the credential does not appear in a success result', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    const r = await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'consumed', subject }),
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(JSON.stringify(r)).not.toContain('new-password')
  })

  it('the token does not appear in a failure result', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    const r = await resetCredential(
      validToken(),
      newCredential,
      storeReturning({ kind: 'expired' }),
      credSink,
      eventSink,
      stableHasher,
      fixedClock,
    )
    expect(JSON.stringify(r)).not.toContain('a'.repeat(64))
  })
})

describe('reset-credential — never throws', () => {
  it('does not throw on any input', async () => {
    const { sink: credSink } = credentialSinkCollector()
    const { sink: eventSink } = eventCollector()
    await expect(
      resetCredential(validToken(), newCredential, storeReturning({ kind: 'unknown' }), credSink, eventSink, stableHasher, fixedClock),
    ).resolves.toBeDefined()
    await expect(
      resetCredential(validToken(), newCredential, storeReturning({ kind: 'expired' }), credSink, eventSink, stableHasher, fixedClock),
    ).resolves.toBeDefined()
    await expect(
      resetCredential(validToken(), newCredential, storeReturning({ kind: 'consumed', subject }), credSink, eventSink, stableHasher, fixedClock),
    ).resolves.toBeDefined()
  })
})
