/**
 * assertion.ts — implementation of the `assertion` primitive.
 * Contract: core/primitives/assertion.yaml
 *
 * An Assertion is a verified claim of identity produced by the
 * authentication flow. It is the required input to Principal and
 * Session construction. Construction is validated — malformed input
 * is rejected rather than throwing.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Subject } from '../../primitives/subject'
import type { Identifier } from '../../primitives/identifier'
import type { Timestamp } from '../../primitives/timestamp'

export interface Assertion {
  readonly subject: Subject
  readonly sessionId: Identifier
  readonly authority: readonly string[]
  readonly issuedAt: Timestamp
}

/** The raw shape a producer must supply before validation. */
export interface AssertionInput {
  readonly subject: unknown
  readonly sessionId: unknown
  readonly authority: unknown
  readonly issuedAt: unknown
}

function isSubjectLike(value: unknown): value is Subject {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.identifier === 'string' && typeof v.kind === 'string'
}

function isIdentifierLike(value: unknown): value is Identifier {
  return typeof value === 'string' && value.length > 0
}

function isTimestampLike(value: unknown): value is Timestamp {
  return typeof value === 'number' && Number.isFinite(value)
}

function isAuthorityList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

/**
 * Construct a validated Assertion. Returns Err rather than throwing —
 * construction failure is an expected outcome, not a programmer error.
 */
export function makeAssertion(input: AssertionInput): Result<Assertion, string> {
  if (!isSubjectLike(input.subject)) {
    return err('assertion: subject is missing or malformed')
  }
  if (!isIdentifierLike(input.sessionId)) {
    return err('assertion: sessionId is missing or empty')
  }
  if (!isTimestampLike(input.issuedAt)) {
    return err('assertion: issuedAt is not a valid instant')
  }
  if (!isAuthorityList(input.authority)) {
    return err('assertion: authority must be an array of strings')
  }

  return ok(
    Object.freeze({
      subject: input.subject,
      sessionId: input.sessionId,
      authority: Object.freeze([...input.authority]),
      issuedAt: input.issuedAt,
    }),
  )
}
