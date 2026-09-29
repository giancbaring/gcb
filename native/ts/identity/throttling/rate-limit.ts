/**
 * rate-limit.ts — implementation of the `rate-limit` composition.
 * Contract: core/identity/throttling/rate-limit.yaml
 *
 * Delegates the check and the record to a caller-supplied store. The
 * store must perform both atomically. Never throws.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Timestamp, Duration } from '../../primitives/timestamp'
import {
  RATE_LIMIT_FAILURE,
  type RateLimitFailure,
} from '../../primitives/rate-limit-failure'

export type Clock = () => Timestamp

export interface RateLimitPolicy {
  readonly limit: number
  readonly window: Duration
}

export interface RateLimitStore {
  checkAndRecord(
    key: string,
    policy: RateLimitPolicy,
    now: Timestamp,
  ): Promise<{ allowed: boolean }> | { allowed: boolean }
}

export async function rateLimit(
  key: string,
  policy: RateLimitPolicy,
  store: RateLimitStore,
  clock: Clock,
): Promise<Result<void, RateLimitFailure>> {
  const now = clock()

  let outcome: { allowed: boolean }

  try {
    outcome = await store.checkAndRecord(key, policy, now)
  } catch {
    return err(RATE_LIMIT_FAILURE.INTERNAL)
  }

  if (!outcome.allowed) {
    return err(RATE_LIMIT_FAILURE.RATE_LIMITED)
  }

  return ok(undefined)
}
