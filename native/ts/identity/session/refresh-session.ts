/**
 * refresh-session.ts — implementation of the `refresh-session`
 * composition. Contract: core/identity/session/refresh-session.yaml
 *
 * Extends an active session without re-authenticating. Verifies the
 * current session, then produces a new one with the same principal and
 * a fresh expiry. The old session is not mutated.
 */

import { err, type Result } from '../../primitives/result'
import { isUsable, type Session } from '../primitives/session'
import type { Duration, Timestamp } from '../../primitives/timestamp'
import type { AuthFailure } from '../primitives/auth-failure'
import { AUTH_FAILURE } from '../primitives/auth-failure'
import { makeSession, SESSION_STATE } from '../primitives/session'
import { ok } from '../../primitives/result'
import { add } from '../../primitives/timestamp'

export type Clock = () => Timestamp

export function refreshSession(
  session: Session,
  lifetime: Duration,
  clock: Clock,
): Result<Session, AuthFailure> {
  const now = clock()

  if (!isUsable(session, now)) {
    return err(AUTH_FAILURE.EXPIRED)
  }

  if (lifetime <= 0) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  const createdAt = now
  const expiresAt = add(createdAt, lifetime)

  const rebuilt = makeSession({
    id: session.id,
    principal: session.principal,
    createdAt,
    expiresAt,
    state: SESSION_STATE.ACTIVE,
  })

  if (!rebuilt.ok) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  return ok(rebuilt.value)
}
