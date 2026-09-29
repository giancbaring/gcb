/**
 * change-role.test.ts — tests for the `change-role` composition.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../primitives/identifier'
import { makeSubject } from '../../primitives/subject'
import { fromMillis } from '../../primitives/timestamp'
import { principalFromAssertion, type Principal } from '../../primitives/principal'
import { AUTHZ_FAILURE } from '../../primitives/authz-failure'
import { OUTCOME } from '../../primitives/outcome'
import type { AuthEvent } from '../../primitives/auth-event'
import type { AuthEventSink } from '../observability/record-auth-event'
import { changeRole, ROLE_CHANGE_ACTION, type RoleSink } from './change-role'

const fixedTime = fromMillis(1_700_000_000_000)
const fixedClock = () => fixedTime

function adminPrincipal(): Principal {
  return principalFromAssertion({
    subject: makeSubject(unsafeIdentifier('GMS001'), 'human', { role: 'ADMIN' }),
    sessionId: unsafeIdentifier('session-admin'),
    authority: [ROLE_CHANGE_ACTION, 'user:read'],
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

function roleSinkCollector() {
  const writes: Array<{ subject: ReturnType<typeof targetSubject>; authority: readonly string[] }> = []
  const sink: RoleSink = {
    apply: (s, a) => {
      writes.push({ subject: s, authority: a })
    },
  }
  return { sink, writes }
}

function eventSinkCollector() {
  const events: AuthEvent[] = []
  const sink: AuthEventSink = {
    append: (e) => {
      events.push(e)
    },
  }
  return { sink, events }
}

describe('change-role — permitted', () => {
  it('returns Ok carrying void', async () => {
    const { sink: roleSink } = roleSinkCollector()
    const { sink: eventSink } = eventSinkCollector()
    const r = await changeRole(
      adminPrincipal(),
      targetSubject(),
      ['OFFICER'],
      roleSink,
      eventSink,
      fixedClock,
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBeUndefined()
  })

  it('the role sink is called exactly once', async () => {
    const { sink, writes } = roleSinkCollector()
    const { sink: eventSink } = eventSinkCollector()
    await changeRole(
      adminPrincipal(),
      targetSubject(),
      ['OFFICER'],
      sink,
      eventSink,
      fixedClock,
    )
    expect(writes.length).toBe(1)
  })

  it('the role sink receives the target subject and the new authority', async () => {
    const { sink, writes } = roleSinkCollector()
    const { sink: eventSink } = eventSinkCollector()
    const target = targetSubject()
    await changeRole(
      adminPrincipal(),
      target,
      ['OFFICER', 'ADVISER'],
      sink,
      eventSink,
      fixedClock,
    )
    expect(writes[0].subject).toBe(target)
    expect(writes[0].authority).toEqual(['OFFICER', 'ADVISER'])
  })

  it('the new authority list reaches the sink frozen', async () => {
    const { sink, writes } = roleSinkCollector()
    const { sink: eventSink } = eventSinkCollector()
    await changeRole(
      adminPrincipal(),
      targetSubject(),
      ['OFFICER'],
      sink,
      eventSink,
      fixedClock,
    )
    expect(Object.isFrozen(writes[0].authority)).toBe(true)
  })

  it('a SUCCESS auth event is appended', async () => {
    const { sink: roleSink } = roleSinkCollector()
    const { sink: eventSink, events } = eventSinkCollector()
    await changeRole(
      adminPrincipal(),
      targetSubject(),
      ['OFFICER'],
      roleSink,
      eventSink,
      fixedClock,
    )
    expect(events.length).toBe(1)
    expect(events[0].outcome).toBe(OUTCOME.SUCCESS)
  })
})

describe('change-role — denied', () => {
  it('returns Err FORBIDDEN when the principal lacks role:change', async () => {
    const { sink: roleSink } = roleSinkCollector()
    const { sink: eventSink } = eventSinkCollector()
    const r = await changeRole(
      officerPrincipal(),
      targetSubject(),
      ['ADMIN'],
      roleSink,
      eventSink,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.FORBIDDEN)
  })

  it('does not call the role sink on denial', async () => {
    const { sink, writes } = roleSinkCollector()
    const { sink: eventSink } = eventSinkCollector()
    await changeRole(
      officerPrincipal(),
      targetSubject(),
      ['ADMIN'],
      sink,
      eventSink,
      fixedClock,
    )
    expect(writes.length).toBe(0)
  })

  it('a DENIED auth event is appended', async () => {
    const { sink: roleSink } = roleSinkCollector()
    const { sink: eventSink, events } = eventSinkCollector()
    await changeRole(
      officerPrincipal(),
      targetSubject(),
      ['ADMIN'],
      roleSink,
      eventSink,
      fixedClock,
    )
    expect(events.length).toBe(1)
    expect(events[0].outcome).toBe(OUTCOME.DENIED)
  })
})

describe('change-role — missing principal', () => {
  it('returns Err NO_PRINCIPAL when the principal is null', async () => {
    const { sink: roleSink } = roleSinkCollector()
    const { sink: eventSink } = eventSinkCollector()
    const r = await changeRole(
      null,
      targetSubject(),
      ['OFFICER'],
      roleSink,
      eventSink,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.NO_PRINCIPAL)
  })

  it('records nothing when the principal is missing', async () => {
    const { sink: roleSink } = roleSinkCollector()
    const { sink: eventSink, events } = eventSinkCollector()
    await changeRole(
      null,
      targetSubject(),
      ['OFFICER'],
      roleSink,
      eventSink,
      fixedClock,
    )
    expect(events.length).toBe(0)
  })
})

describe('change-role — sink failure', () => {
  it('returns Err INTERNAL when the role sink throws', async () => {
    const failingSink: RoleSink = {
      apply: () => {
        throw new Error('database down')
      },
    }
    const { sink: eventSink } = eventSinkCollector()
    const r = await changeRole(
      adminPrincipal(),
      targetSubject(),
      ['OFFICER'],
      failingSink,
      eventSink,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.INTERNAL)
  })

  it('an ERROR auth event is appended when the role sink throws', async () => {
    const failingSink: RoleSink = {
      apply: () => {
        throw new Error('database down')
      },
    }
    const { sink: eventSink, events } = eventSinkCollector()
    await changeRole(
      adminPrincipal(),
      targetSubject(),
      ['OFFICER'],
      failingSink,
      eventSink,
      fixedClock,
    )
    expect(events.length).toBe(1)
    expect(events[0].outcome).toBe(OUTCOME.ERROR)
  })

  it('does not propagate the role sink error text', async () => {
    const failingSink: RoleSink = {
      apply: () => {
        throw new Error('connection string visible')
      },
    }
    const { sink: eventSink } = eventSinkCollector()
    const r = await changeRole(
      adminPrincipal(),
      targetSubject(),
      ['OFFICER'],
      failingSink,
      eventSink,
      fixedClock,
    )
    if (r.ok) throw new Error('expected err')
    expect(JSON.stringify(r)).not.toContain('connection')
  })
})

describe('change-role — audit sink failure', () => {
  it('returns Err INTERNAL when the audit sink throws', async () => {
    const { sink: roleSink } = roleSinkCollector()
    const failingEventSink: AuthEventSink = {
      append: () => {
        throw new Error('audit unreachable')
      },
    }
    const r = await changeRole(
      adminPrincipal(),
      targetSubject(),
      ['OFFICER'],
      roleSink,
      failingEventSink,
      fixedClock,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe(AUTHZ_FAILURE.INTERNAL)
  })
})

describe('change-role — never throws', () => {
  it('does not throw on any input', async () => {
    const { sink: roleSink } = roleSinkCollector()
    const { sink: eventSink } = eventSinkCollector()

    await expect(
      changeRole(adminPrincipal(), targetSubject(), ['A'], roleSink, eventSink, fixedClock),
    ).resolves.toBeDefined()

    await expect(
      changeRole(officerPrincipal(), targetSubject(), ['ADMIN'], roleSink, eventSink, fixedClock),
    ).resolves.toBeDefined()

    await expect(
      changeRole(null, targetSubject(), ['A'], roleSink, eventSink, fixedClock),
    ).resolves.toBeDefined()
  })
})
