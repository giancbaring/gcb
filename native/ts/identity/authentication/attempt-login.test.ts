/**
 * attempt-login.test.ts — tests for the `attempt-login` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { Credential } from '../primitives/credential'
import { Secret } from '../../primitives/secret'
import { fromMillis, duration } from '../../primitives/timestamp'
import { SESSION_STATE } from '../primitives/session'
import { AUTH_FAILURE } from '../primitives/auth-failure'
import { RATE_LIMIT_FAILURE } from '../primitives/rate-limit-failure'
import { OUTCOME } from '../../primitives/outcome'
import type { AuthEvent } from '../primitives/auth-event'
import type { Comparator } from './verification/compare-secret'
import type { IdGenerator, Clock } from './assertion/issue-assertion'
import type { AuthenticationContext } from './authenticate'
import type { RateLimitStore } from '../throttling/rate-limit'
import type { AuthEventSink } from '../observability/record-auth-event'
import { attemptLogin } from './attempt-login'

const id = unsafeIdentifier('GMS001')
const subject = makeSubject(id, 'human')
const secret = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })
const credential = Credential.fromRaw('hunter2')
const fixedSessionId = unsafeIdentifier('session-abc')
const fixedTime = fromMillis(1_700_000_000_000)
const hour = duration(3_600_000)

const stableIdGen: IdGenerator = () => fixedSessionId
const stableClock: Clock = () => fixedTime
const acceptAll: Comparator = () => true
const rejectAll: Comparator = () => false

const policy = { limit: 5, window: duration(15 * 60 * 1000) }

function contextFor(
  payload: { subject: typeof subject; secret: typeof secret; authority: string[] } | null,
): AuthenticationContext {
  return { resolve: async () => payload }
}

const validPayload = { subject, secret, authority: ['OFFICER'] }

function allowStore(): RateLimitStore {
  return { checkAndRecord: () => ({ allowed: true }) }
}

function denyStore(): RateLimitStore {
  return { checkAndRecord: () => ({ allowed: false }) }
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

describe('attempt-login — happy path', () => {
  it('returns Ok carrying an active Session', async () => {
    const { sink } = eventCollector()
    const r = await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.state).toBe(SESSION_STATE.ACTIVE)
  })

  it('records exactly one SUCCESS auth event', async () => {
    const { sink, events } = eventCollector()
    await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    expect(events.length).toBe(1)
    const event = events[0]
    if (event === undefined) throw new Error('expected auth event')
    expect(event.outcome).toBe(OUTCOME.SUCCESS)
  })
})

describe('attempt-login — rate limited', () => {
  it('returns Err kind=rate-limited', async () => {
    const { sink } = eventCollector()
    const r = await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, denyStore(), sink, stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.kind).toBe('rate-limited')
  })

  it('the rate-limited failure carries RATE_LIMITED', async () => {
    const { sink } = eventCollector()
    const r = await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, denyStore(), sink, stableClock,
    )
    if (r.ok) throw new Error('expected err')
    if (r.error.kind === 'rate-limited') {
      expect(r.error.failure).toBe(RATE_LIMIT_FAILURE.RATE_LIMITED)
    }
  })

  it('does not attempt authentication when rate limited', async () => {
    const { sink } = eventCollector()
    let comparatorCalls = 0
    const spy: Comparator = () => {
      comparatorCalls += 1
      return true
    }
    await attemptLogin(
      id, credential, contextFor(validPayload), spy,
      stableIdGen, hour, 'k', policy, denyStore(), sink, stableClock,
    )
    expect(comparatorCalls).toBe(0)
  })

  it('records a DENIED auth event when rate limited', async () => {
    const { sink, events } = eventCollector()
    await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, denyStore(), sink, stableClock,
    )
    expect(events.length).toBe(1)
    const event = events[0]
    if (!event) throw new Error('expected rate-limit event')
    expect(event.outcome).toBe(OUTCOME.DENIED)
    expect(event.detail.reason).toBe('rate-limited')
  })

  it('records the input identifier as a synthetic human subject', async () => {
    const { sink, events } = eventCollector()
    await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, denyStore(), sink, stableClock,
    )
    const event = events[0]
    if (!event) throw new Error('expected rate-limit event')
    expect(event.subject.identifier).toBe(id)
    expect(event.subject.kind).toBe('human')
  })

  it('still returns Err kind=rate-limited after emitting', async () => {
    const { sink } = eventCollector()
    const r = await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, denyStore(), sink, stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.kind).toBe('rate-limited')
  })
})

describe('attempt-login — authentication failures', () => {
  it('returns Err kind=auth with UNKNOWN_SUBJECT for an unknown identifier', async () => {
    const { sink } = eventCollector()
    const r = await attemptLogin(
      id, credential, contextFor(null), acceptAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    if (r.ok) throw new Error('expected err')
    expect(r.error.kind).toBe('auth')
    if (r.error.kind === 'auth') expect(r.error.failure).toBe(AUTH_FAILURE.UNKNOWN_SUBJECT)
  })

  it('returns Err kind=auth with MISMATCH for a wrong credential', async () => {
    const { sink } = eventCollector()
    const r = await attemptLogin(
      id, credential, contextFor(validPayload), rejectAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    if (r.ok) throw new Error('expected err')
    if (r.error.kind === 'auth') expect(r.error.failure).toBe(AUTH_FAILURE.MISMATCH)
  })

  it('records a FAILURE auth event when the credential mismatches', async () => {
    const { sink, events } = eventCollector()
    await attemptLogin(
      id, credential, contextFor(validPayload), rejectAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    expect(events.length).toBe(1)
    const event = events[0]
    if (event === undefined) throw new Error('expected auth event')
    expect(event.outcome).toBe(OUTCOME.FAILURE)
  })

  it('the recorded failure event carries the subject, not the credential', async () => {
    const { sink, events } = eventCollector()
    await attemptLogin(
      id, credential, contextFor(validPayload), rejectAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    const event = events[0]
    if (event === undefined) throw new Error('expected auth event')
    expect(event.subject).toBe(subject)
    expect(JSON.stringify(event)).not.toContain('hunter2')
  })

  it('records no event for an unresolvable identifier', async () => {
    const { sink, events } = eventCollector()
    await attemptLogin(
      id, credential, contextFor(null), acceptAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    expect(events.length).toBe(0)
  })
})

describe('attempt-login — rate limit budget', () => {
  it('consults the rate limit store exactly once', async () => {
    let calls = 0
    const store: RateLimitStore = {
      checkAndRecord: () => {
        calls += 1
        return { allowed: true }
      },
    }
    const { sink } = eventCollector()
    await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, store, sink, stableClock,
    )
    expect(calls).toBe(1)
  })

  it('passes the rate limit key through unchanged', async () => {
    let seen: string | null = null
    const store: RateLimitStore = {
      checkAndRecord: (k) => {
        seen = k
        return { allowed: true }
      },
    }
    const { sink } = eventCollector()
    await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'login:GMS001', policy, store, sink, stableClock,
    )
    expect(seen).toBe('login:GMS001')
  })
})

describe('attempt-login — no leakage', () => {
  it('the credential does not appear in a success result', async () => {
    const { sink } = eventCollector()
    const r = await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })

  it('the credential does not appear in a failure result', async () => {
    const { sink } = eventCollector()
    const r = await attemptLogin(
      id, credential, contextFor(validPayload), rejectAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })

  it('the secret hash never appears in any result', async () => {
    const { sink } = eventCollector()
    const r = await attemptLogin(
      id, credential, contextFor(validPayload), rejectAll,
      stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock,
    )
    expect(JSON.stringify(r)).not.toContain('deadbeef')
  })
})

describe('attempt-login — audit sink failure', () => {
  it('returns Err INTERNAL when the audit sink throws', async () => {
    const failingSink: AuthEventSink = {
      append: () => {
        throw new Error('audit unreachable')
      },
    }
    const r = await attemptLogin(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, 'k', policy, allowStore(), failingSink, stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toEqual({ kind: 'auth', failure: AUTH_FAILURE.INTERNAL })
    }
  })
})

describe('attempt-login — never throws', () => {
  it('does not throw on any input', async () => {
    const { sink } = eventCollector()
    await expect(
      attemptLogin(id, credential, contextFor(null), acceptAll, stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock),
    ).resolves.toBeDefined()
    await expect(
      attemptLogin(id, credential, contextFor(validPayload), rejectAll, stableIdGen, hour, 'k', policy, allowStore(), sink, stableClock),
    ).resolves.toBeDefined()
    await expect(
      attemptLogin(id, credential, contextFor(validPayload), acceptAll, stableIdGen, hour, 'k', policy, denyStore(), sink, stableClock),
    ).resolves.toBeDefined()
  })
})
