/**
 * authenticate.ts — implementation of the `authenticate` composition.
 * Contract: core/identity/authentication/authenticate.yaml
 *
 * The end-to-end authentication use case. Composes resolution,
 * verification, and assertion issuance. Adds no invariants of its own —
 * every guarantee it provides is inherited from the primitives and
 * functions it calls.
 */

import { err, type Result } from '../../primitives/result'
import type { Identifier } from '../../primitives/identifier'
import type { Credential } from '../primitives/credential'
import type { Secret } from '../../primitives/secret'
import type { Subject } from '../../primitives/subject'
import type { Assertion } from '../primitives/assertion'
import { AUTH_FAILURE, type AuthFailure } from '../primitives/auth-failure'
import { compareSecret, type Comparator } from './verification/compare-secret'
import {
  issueAssertion,
  type IdGenerator,
  type Clock,
} from './assertion/issue-assertion'

/**
 * An AuthenticationContext supplies, for an identifier, everything the
 * composition needs to verify a credential and issue an assertion.
 * Returns null when the identifier is unknown. May throw — the
 * composition catches that and maps it to INTERNAL.
 */
export interface AuthenticationContext {
  resolve(identifier: Identifier): Promise<{
    subject: Subject
    secret: Secret
    authority: readonly string[]
  } | null>
}

export async function authenticate(
  identifier: Identifier,
  credential: Credential,
  context: AuthenticationContext,
  comparator: Comparator,
  sessionIdGenerator: IdGenerator,
  clock: Clock,
): Promise<Result<Assertion, AuthFailure>> {
  let resolved: { subject: Subject; secret: Secret; authority: readonly string[] } | null

  try {
    resolved = await context.resolve(identifier)
  } catch {
    return err(AUTH_FAILURE.INTERNAL)
  }

  if (resolved === null) {
    return err(AUTH_FAILURE.UNKNOWN_SUBJECT)
  }

  if (resolved.subject.identifier !== identifier) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  const comparison = compareSecret(credential, resolved.secret, comparator)
  if (!comparison.ok) {
    return comparison
  }

  return issueAssertion(
    resolved.subject,
    resolved.authority,
    sessionIdGenerator,
    clock,
  )
}
