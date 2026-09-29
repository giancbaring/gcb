/**
 * verify-credential.ts — implementation of the `verify-credential` function.
 * Contract: core/identity/authentication/verification/verify-credential.yaml
 *
 * Composes resolution and comparison into a single verification step.
 * Returns the resolved Subject on success. Never throws. Never includes
 * the credential in its output.
 */

import { ok, err, type Result } from '../../../primitives/result'
import type { Identifier } from '../../../primitives/identifier'
import type { Credential } from '../../../primitives/credential'
import type { Secret } from '../../../primitives/secret'
import type { Subject } from '../../../primitives/subject'
import { AUTH_FAILURE, type AuthFailure } from '../../../primitives/auth-failure'
import { compareSecret, type Comparator } from './compare-secret'

/**
 * A VerificationContext supplies, for an Identifier, the Subject it names
 * and the Secret against which the presented Credential must be checked.
 * Returns null when the identifier is unknown. May throw — verifyCredential
 * catches that and returns INTERNAL.
 */
export interface VerificationContext {
  resolve(
    identifier: Identifier,
  ): Promise<{ subject: Subject; secret: Secret } | null>
}

export async function verifyCredential(
  identifier: Identifier,
  credential: Credential,
  context: VerificationContext,
  comparator: Comparator,
): Promise<Result<Subject, AuthFailure>> {
  let resolved: { subject: Subject; secret: Secret } | null

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

  return ok(resolved.subject)
}
