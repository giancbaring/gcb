/**
 * session-to-storage.test.ts — tests for the `session-to-storage` function.
 */

import { describe, it, expect } from 'vitest'
import { unsafeIdentifier } from '../../../primitives/identifier'
import { makeSubject } from '../../../primitives/subject'
import { fromMillis, duration, add, toMillis } from '../../../primitives/timestamp'
import { principalFromAssertion } from '../../../primitives/principal'
import { makeSession, SESSION_STATE, type Session } from '../../../primitives/session'
import { sessionToStorage, brandsFromRecord } from './session-to-storage'
import { sessionFromStorage } from './session-from-storage'

const sessionId = unsafeIdentifier('session-abc')
const createdAt = fromMillis(1_700_000_000_000)
const expiresAt = add(createdAt, duration(3_600_000))

const principal = principalFromAssertion({
  subject: makeSubject(unsafeIdentifier('GMS001'), 'human', { role: 'OFFICER' }),
  sessionId,
  authority: ['user:read', 'meeting:create'],
  issuedAt: createdAt,
})

function activeSession(): Session {
  const r = makeSession({
    id: sessionId,
    principal,
    createdAt,
    expiresAt,
    state: SESSION_STATE.ACTIVE,
  })
  if (!r.ok) throw new Error('expected ok')
  return r.value
}

describe('session-to-storage — happy path', () => {
  it('produces a record with the session fields', () => {
    const record = sessionToStorage(activeSession())
    expect(record.id).toBe('session-abc')
    expect(record.createdAt).toBe(toMillis(createdAt))
    expect(record.expiresAt).toBe(toMillis(expiresAt))
    expect(record.state).toBe('active')
  })

  it('the principal carries the sessionId, issuedAt, and authority', () => {
    const record = sessionToStorage(activeSession())
    expect(record.principal.sessionId).toBe('session-abc')
    expect(record.principal.issuedAt).toBe(toMillis(createdAt))
    expect(record.principal.authority).toEqual(['user:read', 'meeting:create'])
  })

  it('the principal subject carries its identifier, kind, and attributes', () => {
    const record = sessionToStorage(activeSession())
    expect(record.principal.subject.identifier).toBe('GMS001')
    expect(record.principal.subject.kind).toBe('human')
    expect(record.principal.subject.attributes).toEqual({ role: 'OFFICER' })
  })

  it('the output contains only primitives and frozen collections', () => {
    const record = sessionToStorage(activeSession())
    expect(typeof record.id).toBe('string')
    expect(typeof record.createdAt).toBe('number')
    expect(Array.isArray(record.principal.authority)).toBe(true)
    expect(typeof record.principal.subject.identifier).toBe('string')
  })
})

describe('session-to-storage — immutability', () => {
  it('the returned record is frozen', () => {
    expect(Object.isFrozen(sessionToStorage(activeSession()))).toBe(true)
  })

  it('the principal is frozen', () => {
    const record = sessionToStorage(activeSession())
    expect(Object.isFrozen(record.principal)).toBe(true)
  })

  it('the subject is frozen', () => {
    const record = sessionToStorage(activeSession())
    expect(Object.isFrozen(record.principal.subject)).toBe(true)
  })

  it('the authority array is frozen', () => {
    const record = sessionToStorage(activeSession())
    expect(Object.isFrozen(record.principal.authority)).toBe(true)
  })

  it('the attributes map is frozen', () => {
    const record = sessionToStorage(activeSession())
    expect(Object.isFrozen(record.principal.subject.attributes)).toBe(true)
  })
})

describe('session-to-storage — no mutation of input', () => {
  it('the input session is unchanged', () => {
    const session = activeSession()
    const idBefore = session.id
    const stateBefore = session.state
    sessionToStorage(session)
    expect(session.id).toBe(idBefore)
    expect(session.state).toBe(stateBefore)
  })
})

describe('session-to-storage — round trip', () => {
  it('reconstructing from the record produces an equivalent session', () => {
    const session = activeSession()
    const record = sessionToStorage(session)
    const rebuilt = sessionFromStorage({
      id: record.id,
      principal: record.principal,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      state: record.state,
    })
    if (!rebuilt.ok) throw new Error('expected ok')
    expect(rebuilt.value.id).toBe(session.id)
    expect(rebuilt.value.createdAt).toBe(session.createdAt)
    expect(rebuilt.value.expiresAt).toBe(session.expiresAt)
    expect(rebuilt.value.state).toBe(session.state)
    expect(rebuilt.value.principal.subject.identifier).toBe(
      session.principal.subject.identifier,
    )
    expect(rebuilt.value.principal.authority.toArray()).toEqual(
      session.principal.authority.toArray(),
    )
  })

  it('the round trip is lossless for JSON serialization', () => {
    const session = activeSession()
    const record = sessionToStorage(session)
    const serialized = JSON.stringify(record)
    const parsed = JSON.parse(serialized)
    const rebuilt = sessionFromStorage({
      id: parsed.id,
      principal: parsed.principal,
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt,
      state: parsed.state,
    })
    if (!rebuilt.ok) throw new Error('expected ok')
    expect(rebuilt.value.id).toBe(session.id)
    expect(rebuilt.value.principal.authority.toArray()).toEqual(
      session.principal.authority.toArray(),
    )
  })
})

describe('session-to-storage — brands helper', () => {
  it('returns branded types from a record', () => {
    const record = sessionToStorage(activeSession())
    const branded = brandsFromRecord(record)
    expect(branded.id).toBe(sessionId)
    expect(branded.createdAt).toBe(createdAt)
    expect(branded.expiresAt).toBe(expiresAt)
  })
})

describe('session-to-storage — never throws', () => {
  it('does not throw on any session', () => {
    expect(() => sessionToStorage(activeSession())).not.toThrow()
  })
})
