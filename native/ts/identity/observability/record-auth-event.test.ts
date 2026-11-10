/**
 * record-auth-event.test.ts - tests for the `record-auth-event` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { makeActor, ACTOR_VIA } from '../primitives/actor'
import { AUTH_ACTION } from '../primitives/auth-event'
import { OUTCOME } from '../../primitives/outcome'
import { AUTH_FAILURE } from '../primitives/auth-failure'
import { fromMillis } from '../../primitives/timestamp'
import {
  recordAuthEvent,
  type RecordAuthEventInput,
  type AuthEventSink,
} from './record-auth-event'

const subject = makeSubject(unsafeIdentifier('GMS001'), 'human')
const actorResult = makeActor({ subject, via: ACTOR_VIA.DIRECT })
if (!actorResult.ok) throw new Error('expected actor')
const actor = actorResult.value
const occurredAt = fromMillis(1_700_000_000_000)

function input(overrides: Partial<RecordAuthEventInput> = {}): RecordAuthEventInput {
  return {
    action: AUTH_ACTION.LOGIN,
    actor,
    outcome: OUTCOME.SUCCESS,
    detail: { method: 'password' },
    ...overrides,
  }
}

function sinkFor(events: unknown[] = []): AuthEventSink {
  return {
    append: (event) => {
      events.push(event)
    },
  }
}

describe('record-auth-event - happy path', () => {
  it('returns Ok carrying the constructed event', async () => {
    const r = await recordAuthEvent(input(), sinkFor(), () => occurredAt)
    expect(r.ok).toBe(true)
  })

  it('calls the sink exactly once', async () => {
    const events: unknown[] = []
    await recordAuthEvent(input(), sinkFor(events), () => occurredAt)
    expect(events).toHaveLength(1)
  })

  it('preserves subject, action, outcome, and occurredAt', async () => {
    const r = await recordAuthEvent(input(), sinkFor(), () => occurredAt)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.subject).toBe(subject)
    expect(r.value.action).toBe(AUTH_ACTION.LOGIN)
    expect(r.value.outcome).toBe(OUTCOME.SUCCESS)
    expect(r.value.occurredAt).toBe(occurredAt)
  })

  it('freezes the event and detail', async () => {
    const r = await recordAuthEvent(input(), sinkFor(), () => occurredAt)
    if (!r.ok) throw new Error('expected ok')
    expect(Object.isFrozen(r.value)).toBe(true)
    expect(Object.isFrozen(r.value.detail)).toBe(true)
  })

  it('passes detail values through unchanged', async () => {
    const detail = { method: 'password', source: 'web' }
    const r = await recordAuthEvent(input({ detail }), sinkFor(), () => occurredAt)
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.detail).toEqual(detail)
  })
})

describe('record-auth-event - failures', () => {
  it('returns Err INTERNAL when the sink throws', async () => {
    const sink: AuthEventSink = {
      append: () => {
        throw new Error('database password leaked')
      },
    }
    const r = await recordAuthEvent(input(), sink, () => occurredAt)
    expect(r).toEqual({ ok: false, error: AUTH_FAILURE.INTERNAL })
  })

  it('returns Err INTERNAL when the sink rejects asynchronously', async () => {
    const sink: AuthEventSink = {
      append: async () => {
        throw new Error('storage unavailable')
      },
    }
    const r = await recordAuthEvent(input(), sink, () => occurredAt)
    expect(r).toEqual({ ok: false, error: AUTH_FAILURE.INTERNAL })
  })

  it('does not propagate sink error text', async () => {
    const sink: AuthEventSink = {
      append: () => Promise.reject(new Error('secret sink detail')),
    }
    const r = await recordAuthEvent(input(), sink, () => occurredAt)
    if (r.ok) throw new Error('expected err')
    expect(r.error).toBe(AUTH_FAILURE.INTERNAL)
    expect(String(r.error)).not.toContain('secret sink detail')
  })

  it('does not throw for null input', async () => {
    await expect(
      recordAuthEvent(null as never, sinkFor(), () => occurredAt),
    ).resolves.toEqual({ ok: false, error: AUTH_FAILURE.INTERNAL })
  })

  it('returns Err INTERNAL when the clock throws', async () => {
    const r = await recordAuthEvent(input(), sinkFor(), () => {
      throw new Error('clock unavailable')
    })
    expect(r).toEqual({ ok: false, error: AUTH_FAILURE.INTERNAL })
  })
})
