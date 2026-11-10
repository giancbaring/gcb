/**
 * create-session.ts — implementation of the `create-session` function.
 * Contract: core/identity/session/establishment/create-session.yaml
 *
 * Transitions a verified Assertion into a Session. This is the only
 * function permitted to perform that transition. It does not verify
 * anything — the Assertion has already been verified upstream.
 */

import { ok, err, type Result } from '../../../primitives/result'
import type { Assertion } from '../../primitives/assertion'
import type { Duration, Timestamp } from '../../../primitives/timestamp'
import { add } from '../../../primitives/timestamp'
import { principalFromAssertion } from '../../primitives/principal'
import { makeSession, SESSION_STATE, type Session } from '../../primitives/session'
import { AUTH_FAILURE, type AuthFailure } from '../../primitives/auth-failure'

export type Clock = () => Timestamp

export function createSession(
  assertion: Assertion,
  lifetime: Duration,
  clock: Clock,
): Result<Session, AuthFailure> {
  if (lifetime <= 0) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  const createdAt = clock()
  const expiresAt = add(createdAt, lifetime)

  const principal = principalFromAssertion(assertion)

  const result = makeSession({
    id: assertion.sessionId,
    principal,
    createdAt,
    expiresAt,
    state: SESSION_STATE.ACTIVE,
  })

  if (!result.ok) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  return ok(result.value)
}
