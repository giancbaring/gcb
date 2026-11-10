/**
 * session-to-storage.ts — implementation of the `session-to-storage`
 * function. Contract: core/identity/session/persistence/session-to-storage.yaml
 *
 * Flatten a Session into a serializable, frozen record. Round-trippable
 * through session-from-storage. Never throws.
 */

import type { Session } from '../../primitives/session'
import type { Identifier } from '../../../primitives/identifier'
import type { Timestamp } from '../../../primitives/timestamp'

export interface StoredPrincipal {
  readonly subject: {
    readonly identifier: string
    readonly kind: string
    readonly attributes: Readonly<Record<string, string>>
  }
  readonly sessionId: string
  readonly authority: readonly string[]
  readonly issuedAt: number
}

export interface SessionStorageRecord {
  readonly id: string
  readonly principal: StoredPrincipal
  readonly createdAt: number
  readonly expiresAt: number
  readonly state: string
}

export function sessionToStorage(session: Session): SessionStorageRecord {
  const storedPrincipal: StoredPrincipal = Object.freeze({
    subject: Object.freeze({
      identifier: String(session.principal.subject.identifier),
      kind: String(session.principal.subject.kind),
      attributes: Object.freeze({ ...session.principal.subject.attributes }),
    }),
    sessionId: String(session.principal.sessionId),
    authority: Object.freeze(session.principal.authority.toArray()),
    issuedAt: Number(session.principal.issuedAt),
  })

  return Object.freeze({
    id: String(session.id),
    principal: storedPrincipal,
    createdAt: Number(session.createdAt),
    expiresAt: Number(session.expiresAt),
    state: String(session.state),
  })
}

/**
 * Casting helper for storage adapters that expect branded types back.
 * Kept separate so the record itself remains free of brands.
 */
export function brandsFromRecord(record: SessionStorageRecord): {
  readonly id: Identifier
  readonly createdAt: Timestamp
  readonly expiresAt: Timestamp
} {
  return {
    id: record.id as Identifier,
    createdAt: record.createdAt as Timestamp,
    expiresAt: record.expiresAt as Timestamp,
  }
}
