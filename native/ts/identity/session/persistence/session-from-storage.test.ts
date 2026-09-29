/**
 * session-from-storage.test.ts — tests for `session-from-storage`.
 */

import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { unsafeIdentifier } from '../../../primitives/identifier'
import { fromMillis, duration, add } from '../../../primitives/timestamp'
import { SESSION_STATE } from '../../../primitives/session'
import {
  sessionFromStorage,
  type SessionStorageRecord,
} from './session-from-storage'

const sessionId = unsafeIdentifier('session-abc')
const createdAt = fromMillis(1_700_000_000_000)
const expiresAt = add(createdAt, duration(3_600_000))

function storageShapedPrincipal() {
  return {
    subject: {
      identifier: 'GMS001',
      kind: 'human',
      attributes: { role: 'OFFICER' },
    },
    sessionId: 'session-abc',
    authority: ['user:read', 'meeting:create'],
    issuedAt: 1_700_000_000_000,
  }
}

function wellFormed(): SessionStorageRecord {
  return {
    id: sessionId,
    principal: storageShapedPrincipal(),
    createdAt,
    expiresAt,
    state: SESSION_STATE.ACTIVE,
  }
}

describe('session-from-storage — happy path', () => {
  it('accepts a well-formed storage record', () => {
    const r = sessionFromStorage(wellFormed())
    expect(r.ok).toBe(true)
  })

  it('the session carries the record fields', () => {
    const r = sessionFromStorage(wellFormed())
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.id).toBe(sessionId)
    expect(r.value.createdAt).toBe(createdAt)
    expect(r.value.expiresAt).toBe(expiresAt)
    expect(r.value.state).toBe(SESSION_STATE.ACTIVE)
  })

  it('the principal carries the subject and sessionId', () => {
    const r = sessionFromStorage(wellFormed())
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.principal.subject.identifier).toBe('GMS001')
    expect(r.value.principal.subject.kind).toBe('human')
    expect(r.value.principal.sessionId).toBe(sessionId)
    expect(r.value.principal.issuedAt).toBe(createdAt)
  })

  it('the authority reflects the recorded tokens', () => {
    const r = sessionFromStorage(wellFormed())
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.principal.authority.has('user:read')).toBe(true)
    expect(r.value.principal.authority.has('meeting:create')).toBe(true)
    expect(r.value.principal.authority.size).toBe(2)
  })

  it('the reconstructed session is frozen', () => {
    const r = sessionFromStorage(wellFormed())
    expect(r.ok && Object.isFrozen(r.value)).toBe(true)
  })

  it('a stored revoked session reconstructs as revoked', () => {
    const r = sessionFromStorage({ ...wellFormed(), state: SESSION_STATE.REVOKED })
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.state).toBe(SESSION_STATE.REVOKED)
  })

  it('a stored expired session reconstructs as expired', () => {
    const r = sessionFromStorage({ ...wellFormed(), state: SESSION_STATE.EXPIRED })
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.state).toBe(SESSION_STATE.EXPIRED)
  })
})

describe('session-from-storage — field validation', () => {
  it('rejects a missing id', () => {
    const r = sessionFromStorage({ ...wellFormed(), id: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('id')
  })

  it('rejects an empty id', () => {
    const r = sessionFromStorage({ ...wellFormed(), id: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('id')
  })

  it('rejects a malformed principal', () => {
    const r = sessionFromStorage({ ...wellFormed(), principal: { not: 'a principal' } })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('principal')
  })

  it('rejects a string createdAt', () => {
    const r = sessionFromStorage({ ...wellFormed(), createdAt: '1700000000000' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('createdAt')
  })

  it('rejects a string expiresAt', () => {
    const r = sessionFromStorage({ ...wellFormed(), expiresAt: '1700000000000' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('expiresAt')
  })

  it('rejects an unknown state', () => {
    const r = sessionFromStorage({ ...wellFormed(), state: 'zombie' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('state')
  })

  it('rejects a record whose expiresAt is not after createdAt', () => {
    const r = sessionFromStorage({ ...wellFormed(), expiresAt: createdAt })
    expect(r.ok).toBe(false)
  })
})

describe('session-from-storage — no active upgrade', () => {
  it('a revoked stored session is never reconstructed as active', () => {
    const r = sessionFromStorage({ ...wellFormed(), state: SESSION_STATE.REVOKED })
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.state).not.toBe(SESSION_STATE.ACTIVE)
  })

  it('an expired stored session is never reconstructed as active', () => {
    const r = sessionFromStorage({ ...wellFormed(), state: SESSION_STATE.EXPIRED })
    if (!r.ok) throw new Error('expected ok')
    expect(r.value.state).not.toBe(SESSION_STATE.ACTIVE)
  })
})

describe('session-from-storage — no authentication dependency', () => {
  it('the module does not import from the authentication flow', async () => {
    const source = await readFile(
      'native/ts/identity/session/persistence/session-from-storage.ts',
      'utf8',
    )
    const importLines = source
      .split('\n')
      .filter((line) => line.trimStart().startsWith('import'))

    expect(importLines.some((line) => line.includes('principalFromAssertion'))).toBe(false)
    expect(importLines.some((line) => line.includes('/authentication/'))).toBe(false)
  })
})

describe('session-from-storage — never throws', () => {
  it('does not throw on any input', () => {
    expect(() => sessionFromStorage(wellFormed())).not.toThrow()
    expect(() =>
      sessionFromStorage({
        id: undefined,
        principal: undefined,
        createdAt: undefined,
        expiresAt: undefined,
        state: undefined,
      }),
    ).not.toThrow()
    expect(() => sessionFromStorage(null as never)).not.toThrow()
  })
})
