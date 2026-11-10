/**
 * session-from-storage.ts — implementation of the `session-from-storage`
 * function. Contract: core/identity/session/persistence/session-from-storage.yaml
 *
 * Reconstructs a Session by composing principal-from-storage. Does not
 * import from the authentication module. Guards against a null or
 * undefined record before reading any field.
 */

import { ok, err, type Result } from '../../../primitives/result'
import type { Identifier } from '../../../primitives/identifier'
import type { Timestamp } from '../../../primitives/timestamp'
import {
  makeSession,
  isSessionState,
  type Session,
  type SessionState,
} from '../../primitives/session'
import { principalFromStorage } from '../../../validation/principal-from-storage'

export interface SessionStorageRecord {
  readonly id: unknown
  readonly principal: unknown
  readonly createdAt: unknown
  readonly expiresAt: unknown
  readonly state: unknown
}

function isTimestampLike(value: unknown): value is Timestamp {
  return typeof value === 'number' && Number.isFinite(value)
}

function isIdentifierLike(value: unknown): value is Identifier {
  return typeof value === 'string' && value.length > 0
}

export function sessionFromStorage(
  record: SessionStorageRecord,
): Result<Session, string> {
  if (typeof record !== 'object' || record === null) {
    return err('session-from-storage: record is missing or not an object')
  }

  if (!isIdentifierLike(record.id)) {
    return err('session-from-storage: id is missing or not a non-empty string')
  }

  if (typeof record.principal !== 'object' || record.principal === null) {
    return err('session-from-storage: principal is missing or not an object')
  }

  const principalResult = principalFromStorage(
    record.principal as {
      subject: unknown
      sessionId: unknown
      authority: unknown
      issuedAt: unknown
    },
  )
  if (!principalResult.ok) {
    return err(`session-from-storage: ${principalResult.error}`)
  }

  if (!isTimestampLike(record.createdAt)) {
    return err('session-from-storage: createdAt is missing or not a number')
  }

  if (!isTimestampLike(record.expiresAt)) {
    return err('session-from-storage: expiresAt is missing or not a number')
  }

  if (!isSessionState(record.state)) {
    return err(
      `session-from-storage: state is missing or unknown ('${String(record.state)}')`,
    )
  }

  const state: SessionState = record.state

  const built = makeSession({
    id: record.id,
    principal: principalResult.value,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    state,
  })

  if (!built.ok) {
    return err(`session-from-storage: ${built.error}`)
  }

  return ok(built.value)
}
