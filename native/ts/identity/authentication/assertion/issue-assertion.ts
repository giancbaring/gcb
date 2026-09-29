/**
 * issue-assertion.ts — implementation of the `issue-assertion` function.
 * Contract: core/identity/authentication/assertion/issue-assertion.yaml
 *
 * The terminal step of authentication. Produces the Assertion that
 * downstream systems consume. The session id and clock are supplied by
 * the caller so that tests can control both and so that the function
 * does not depend on hidden ambient state.
 */

import { ok, err, type Result } from '../../../primitives/result'
import type { Subject } from '../../../primitives/subject'
import type { Identifier } from '../../../primitives/identifier'
import type { Timestamp } from '../../../primitives/timestamp'
import { makeAssertion, type Assertion } from '../../../primitives/assertion'
import { AUTH_FAILURE, type AuthFailure } from '../../../primitives/auth-failure'

/** Supplied by the caller to produce session identifiers. */
export type IdGenerator = () => Identifier

/** Supplied by the caller so that the clock is never ambient. */
export type Clock = () => Timestamp

export function issueAssertion(
  subject: Subject,
  authority: readonly string[],
  sessionIdGenerator: IdGenerator,
  clock: Clock,
): Result<Assertion, AuthFailure> {
  let sessionId: Identifier
  try {
    sessionId = sessionIdGenerator()
  } catch {
    return err(AUTH_FAILURE.INTERNAL)
  }

  const issuedAt = clock()

  const result = makeAssertion({
    subject,
    sessionId,
    authority,
    issuedAt,
  })

  if (!result.ok) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  return ok(result.value)
}
