/**
 * validate-session.ts — implementation of the `validate-session` function.
 * Contract: core/identity/session/validation/validate-session.yaml
 *
 * Returns the Principal carried by a Session when the session is usable.
 * A session is usable when it is active AND the current instant is
 * strictly before expiresAt. Never throws.
 */

import { ok, err, type Result } from '../../../primitives/result'
import type { Session } from '../../../primitives/session'
import { isUsable } from '../../../primitives/session'
import type { Principal } from '../../../primitives/principal'
import type { Timestamp } from '../../../primitives/timestamp'
import { AUTH_FAILURE, type AuthFailure } from '../../../primitives/auth-failure'

export type Clock = () => Timestamp

export function validateSession(
  session: Session,
  clock: Clock,
): Result<Principal, AuthFailure> {
  const now = clock()

  if (!isUsable(session, now)) {
    return err(AUTH_FAILURE.EXPIRED)
  }

  return ok(session.principal)
}
