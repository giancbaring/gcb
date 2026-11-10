/**
 * assertion-freshness.ts — implementation of the `assertion-freshness`
 * function. Contract: core/identity/authentication/assertion/assertion-freshness.yaml
 *
 * Verify that an Assertion's issuedAt is within max_age of the current
 * instant. Refuses future-dated assertions and stale ones alike.
 * Never throws.
 */

import { ok, err, type Result } from '../../../primitives/result'
import type { Assertion } from '../../primitives/assertion'
import type { Duration, Timestamp } from '../../../primitives/timestamp'
import { diff } from '../../../primitives/timestamp'
import { AUTH_FAILURE, type AuthFailure } from '../../primitives/auth-failure'

export type Clock = () => Timestamp

export function assertionFreshness(
  assertion: Assertion,
  maxAge: Duration,
  clock: Clock,
): Result<Assertion, AuthFailure> {
  if (maxAge <= 0) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  const now = clock()
  const age = diff(now, assertion.issuedAt)

  if (age < 0) {
    return err(AUTH_FAILURE.EXPIRED)
  }

  if (age >= maxAge) {
    return err(AUTH_FAILURE.EXPIRED)
  }

  return ok(assertion)
}
