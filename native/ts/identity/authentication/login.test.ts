/**
 * login.test.ts — tests for the `login` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { Credential } from '../../primitives/credential'
import { Secret } from '../../primitives/secret'
import { fromMillis, duration, toMillis } from '../../primitives/timestamp'
import { SESSION_STATE } from '../../primitives/session'
import { AUTH_FAILURE } from '../../primitives/auth-failure'
import type { Comparator } from './verification/compare-secret'
import type { IdGenerator, Clock } from './assertion/issue-assertion'
import { login } from './login'
import type { AuthenticationContext } from './authenticate'

const id = unsafeIdentifier('GMS001')
const subject = makeSubject(id, 'human')
const secret = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })
const credential = Credential.fromRaw('hunter2')

const fixedTime = fromMillis(1_700_000_000_000)
const fixedSessionId = unsafeIdentifier('session-abc')
const hour = duration(3_600_000)

const stableIdGen: IdGenerator = () => fixedSessionId
const stableClock: Clock = () => fixedTime
const acceptAll: Comparator = () => true
const rejectAll: Comparator = () => false

function contextFor(
  payload: { subject: typeof subject; secret: typeof secret; authority: string[] } | null,
): AuthenticationContext {
  return { resolve: async () => payload }
}

const validPayload = { subject, secret, authority: ['OFFICER'] }

describe('login — happy path', () => {
  it('returns Ok carrying an active Session', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, stableClock,
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.state).toBe(SESSION_STATE.ACTIVE)
  })

  it('the Session principal carries the authenticated subject', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, stableClock,
    )
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.principal.subject).toBe(subject)
    expect(r.value.principal.sessionId).toBe(fixedSessionId)
  })

  it('the Session expires exactly one lifetime after creation', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, stableClock,
    )
    if (!r.ok) throw new Error('expected ok')
    expect(toMillis(r.value.expiresAt)).toBe(
      toMillis(r.value.createdAt) + toMillis(hour),
    )
  })

  it('the Session is frozen', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, stableClock,
    )
    expect(r.ok && Object.isFrozen(r.value)).toBe(true)
  })
})

describe('login — authentication failures prevent session', () => {
  it('returns Err UNKNOWN_SUBJECT when the identifier is unknown', async () => {
    const r = await login(
      id, credential, contextFor(null), acceptAll,
      stableIdGen, hour, stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.UNKNOWN_SUBJECT)
  })

  it('returns Err MISMATCH when the credential does not match', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), rejectAll,
      stableIdGen, hour, stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.MISMATCH)
  })

  it('does not create a session when authentication fails', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), rejectAll,
      stableIdGen, hour, stableClock,
    )
    expect(r.ok).toBe(false)
  })
})

describe('login — session lifetime validation', () => {
  it('returns Err INTERNAL when lifetime is zero', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, duration(0), stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })

  it('returns Err INTERNAL when lifetime is negative', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, duration(-1), stableClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
  })
})

describe('login — no leakage', () => {
  it('the credential never appears in a success result', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), acceptAll,
      stableIdGen, hour, stableClock,
    )
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })

  it('the credential never appears in a failure result', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), rejectAll,
      stableIdGen, hour, stableClock,
    )
    expect(JSON.stringify(r)).not.toContain('hunter2')
  })

  it('the secret hash never appears in a failure result', async () => {
    const r = await login(
      id, credential, contextFor(validPayload), rejectAll,
      stableIdGen, hour, stableClock,
    )
    expect(JSON.stringify(r)).not.toContain('deadbeef')
  })
})

describe('login — never throws', () => {
  it('does not throw on any input combination', async () => {
    await expect(
      login(id, credential, contextFor(null), acceptAll, stableIdGen, hour, stableClock),
    ).resolves.toBeDefined()
    await expect(
      login(id, credential, contextFor(validPayload), rejectAll, stableIdGen, hour, stableClock),
    ).resolves.toBeDefined()
    await expect(
      login(id, credential, contextFor(validPayload), acceptAll, stableIdGen, duration(0), stableClock),
    ).resolves.toBeDefined()
  })
})
