/**
 * outcome.ts — implementation of the `outcome` primitive.
 * Contract: core/primitives/outcome.yaml
 *
 * A closed classification of how an action resolved. Distinct from
 * Result: Result carries the operation's payload; Outcome classifies
 * the disposition for audit and reasoning.
 */

export const OUTCOME = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  DENIED: 'DENIED',
  ERROR: 'ERROR',
} as const

export type Outcome = (typeof OUTCOME)[keyof typeof OUTCOME]

const ALL: readonly Outcome[] = Object.freeze([
  OUTCOME.SUCCESS,
  OUTCOME.FAILURE,
  OUTCOME.DENIED,
  OUTCOME.ERROR,
])

export function isOutcome(value: unknown): value is Outcome {
  return typeof value === 'string' && (ALL as readonly string[]).includes(value)
}

export function allOutcomes(): readonly Outcome[] {
  return ALL
}
