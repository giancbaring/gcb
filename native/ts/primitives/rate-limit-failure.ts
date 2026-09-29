/**
 * rate-limit-failure.ts — implementation of the `rate-limit-failure`
 * primitive. Contract: core/primitives/rate-limit-failure.yaml
 *
 * A closed enumeration of rate limit failure modes. Throttling is
 * neither a policy denial nor a credential failure — it is its own
 * concern.
 */

export const RATE_LIMIT_FAILURE = {
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
} as const

export type RateLimitFailure =
  (typeof RATE_LIMIT_FAILURE)[keyof typeof RATE_LIMIT_FAILURE]

const ALL: readonly RateLimitFailure[] = Object.freeze([
  RATE_LIMIT_FAILURE.RATE_LIMITED,
  RATE_LIMIT_FAILURE.INTERNAL,
])

export function isRateLimitFailure(value: unknown): value is RateLimitFailure {
  return typeof value === 'string' && (ALL as readonly string[]).includes(value)
}

export function allRateLimitFailures(): readonly RateLimitFailure[] {
  return ALL
}

/** Full internal text for audit logging. Never shown to a caller. */
export function toAuditCode(failure: RateLimitFailure): string {
  return `RATELIMIT_${failure}`
}
