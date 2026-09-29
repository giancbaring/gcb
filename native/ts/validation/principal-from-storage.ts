/**
 * principal-from-storage.ts — implementation of the
 * `principal-from-storage` function. Contract: core/validation/principal-from-storage.yaml
 *
 * Reconstruct a Principal from a raw storage record. Imports only from
 * primitives — never from the authentication module.
 *
 * Guards against a null or undefined record before delegating to
 * subject-from-storage.
 */

import { ok, err, type Result } from '../primitives/result'
import type { Principal } from '../primitives/principal'
import type { Identifier } from '../primitives/identifier'
import type { Timestamp } from '../primitives/timestamp'
import type { Subject } from '../primitives/subject'
import { subjectFromStorage } from './subject-from-storage'

export interface PrincipalStorageRecord {
  readonly subject: unknown
  readonly sessionId: unknown
  readonly authority: unknown
  readonly issuedAt: unknown
}

function isAuthorityArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((a) => typeof a === 'string')
}

function isTimestampLike(value: unknown): value is Timestamp {
  return typeof value === 'number' && Number.isFinite(value)
}

function isIdentifierLike(value: unknown): value is Identifier {
  return typeof value === 'string' && value.length > 0
}

/**
 * A read-only authority facade. Local to this module so that the
 * reconstruction does not depend on the authentication flow's
 * implementation of the same shape.
 */
function makeAuthority(tokens: readonly string[]): Principal['authority'] {
  const inner = new Set(tokens)
  return Object.freeze({
    has: (token: string): boolean => inner.has(token),
    get size(): number {
      return inner.size
    },
    toArray: (): readonly string[] => Object.freeze([...inner]),
  })
}

export function principalFromStorage(
  record: PrincipalStorageRecord,
): Result<Principal, string> {
  if (typeof record !== 'object' || record === null) {
    return err('principal-from-storage: record is missing or not an object')
  }

  if (typeof record.subject !== 'object' || record.subject === null) {
    return err('principal-from-storage: subject is missing or not an object')
  }

  const subjectResult = subjectFromStorage(
    record.subject as { identifier: unknown; kind: unknown; attributes?: unknown },
  )
  if (!subjectResult.ok) {
    return err(`principal-from-storage: ${subjectResult.error}`)
  }

  if (!isIdentifierLike(record.sessionId)) {
    return err('principal-from-storage: sessionId is missing or not a non-empty string')
  }

  if (!isTimestampLike(record.issuedAt)) {
    return err('principal-from-storage: issuedAt is missing or not a number')
  }

  if (!isAuthorityArray(record.authority)) {
    return err('principal-from-storage: authority must be an array of strings')
  }

  const subject: Subject = subjectResult.value

  return ok(
    Object.freeze({
      subject,
      sessionId: record.sessionId,
      authority: makeAuthority(record.authority),
      issuedAt: record.issuedAt,
    }),
  )
}
