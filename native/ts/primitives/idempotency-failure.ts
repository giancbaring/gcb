/**
 * idempotency-failure.ts — implementation of the `idempotency-failure`
 * primitive. Contract: core/primitives/idempotency-failure.yaml
 */

export const IDEMPOTENCY_FAILURE = {
  IN_PROGRESS: 'IN_PROGRESS',
  STORE_FAULT: 'STORE_FAULT',
  INTERNAL: 'INTERNAL',
} as const

export type IdempotencyFailure =
  (typeof IDEMPOTENCY_FAILURE)[keyof typeof IDEMPOTENCY_FAILURE]

const ALL: readonly IdempotencyFailure[] = Object.freeze([
  IDEMPOTENCY_FAILURE.IN_PROGRESS,
  IDEMPOTENCY_FAILURE.STORE_FAULT,
  IDEMPOTENCY_FAILURE.INTERNAL,
])

export function isIdempotencyFailure(value: unknown): value is IdempotencyFailure {
  return typeof value === 'string' && (ALL as readonly string[]).includes(value)
}

export function allIdempotencyFailures(): readonly IdempotencyFailure[] {
  return ALL
}

export function toAuditCode(failure: IdempotencyFailure): string {
  return `IDEMPOTENCY_${failure}`
}
