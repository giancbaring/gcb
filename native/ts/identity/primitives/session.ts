/**
 * session.ts — implementation of the `session` primitive.
 * Contract: core/primitives/session.yaml
 *
 * A Session is an active authentication context that persists between
 * requests. It carries a Principal, timestamps for issuance and expiry,
 * and a closed lifecycle state.
 *
 * Immutability: sessions are frozen. State transitions produce a new
 * Session — the old one is not mutated.
 *
 * Usability window: a session is usable only when it is active AND the
 * reader's clock falls within [createdAt, expiresAt). A clock before
 * createdAt is a reader standing before the session was created; the
 * session does not exist for them.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Identifier } from '../../primitives/identifier'
import type { Principal } from './principal'
import type { Timestamp } from '../../primitives/timestamp'

export const SESSION_STATE = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const

export type SessionState = (typeof SESSION_STATE)[keyof typeof SESSION_STATE]

const ALL_STATES: readonly SessionState[] = Object.freeze([
  SESSION_STATE.ACTIVE,
  SESSION_STATE.EXPIRED,
  SESSION_STATE.REVOKED,
])

export interface Session {
  readonly id: Identifier
  readonly principal: Principal
  readonly createdAt: Timestamp
  readonly expiresAt: Timestamp
  readonly state: SessionState
}

export interface SessionInput {
  readonly id: Identifier
  readonly principal: Principal
  readonly createdAt: Timestamp
  readonly expiresAt: Timestamp
  readonly state?: SessionState
}

export function isSessionState(value: unknown): value is SessionState {
  return typeof value === 'string' && (ALL_STATES as readonly string[]).includes(value)
}

export function makeSession(input: SessionInput): Result<Session, string> {
  if (!input.id || typeof input.id !== 'string') {
    return err('session: id is required')
  }
  if (!input.principal) {
    return err('session: principal is required')
  }
  if (typeof input.createdAt !== 'number' || !Number.isFinite(input.createdAt)) {
    return err('session: createdAt is not a valid instant')
  }
  if (typeof input.expiresAt !== 'number' || !Number.isFinite(input.expiresAt)) {
    return err('session: expiresAt is not a valid instant')
  }
  if (input.expiresAt <= input.createdAt) {
    return err('session: expiresAt must be strictly after createdAt')
  }

  const state = input.state ?? SESSION_STATE.ACTIVE
  if (!isSessionState(state)) {
    return err(`session: unknown state '${String(state)}'`)
  }

  return ok(
    Object.freeze({
      id: input.id,
      principal: input.principal,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      state,
    }),
  )
}

/**
 * Is this session usable at the given instant? A session is usable only
 * if it is 'active' AND now falls in [createdAt, expiresAt). 'now' is
 * explicit — the primitive never reads a clock.
 */
export function isUsable(session: Session, now: Timestamp): boolean {
  return (
    session.state === SESSION_STATE.ACTIVE &&
    now >= session.createdAt &&
    now < session.expiresAt
  )
}

export function isExpired(session: Session, now: Timestamp): boolean {
  return !isUsable(session, now)
}

export function revoke(session: Session): Session {
  return Object.freeze({ ...session, state: SESSION_STATE.REVOKED })
}

export function expire(session: Session): Session {
  return Object.freeze({ ...session, state: SESSION_STATE.EXPIRED })
}
