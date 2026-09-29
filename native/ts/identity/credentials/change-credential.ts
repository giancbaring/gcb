/**
 * change-credential.ts — implementation of the `change-credential`
 * composition. Contract: core/identity/credentials/change-credential.yaml
 *
 * Verify the old credential, then hash and persist the new one. The
 * sink receives exactly one write. Never throws.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Identifier } from '../../primitives/identifier'
import type { Credential } from '../../primitives/credential'
import type { Secret } from '../../primitives/secret'
import type { Subject } from '../../primitives/subject'
import { AUTH_FAILURE, type AuthFailure } from '../../primitives/auth-failure'
import { compareSecret, type Comparator } from '../authentication/verification/compare-secret'
import { hashCredential, type Hasher } from './hash-credential'

/**
 * A ChangeContext supplies the current subject and secret for an
 * identifier. Returns null when the identifier is unknown. May throw.
 */
export interface ChangeContext {
  resolve(identifier: Identifier): Promise<{ subject: Subject; secret: Secret } | null>
}

/**
 * A SecretSink persists a new Secret for a subject. Append-only is not
 * required — a credential change replaces the prior secret. May throw.
 */
export interface SecretSink {
  write(subject: Subject, secret: Secret): Promise<void> | void
}

export async function changeCredential(
  identifier: Identifier,
  oldCredential: Credential,
  newCredential: Credential,
  context: ChangeContext,
  comparator: Comparator,
  hasher: Hasher,
  sink: SecretSink,
): Promise<Result<void, AuthFailure>> {
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

  const verification = compareSecret(oldCredential, resolved.secret, comparator)
  if (!verification.ok) {
    return verification
  }

  const hashed = hashCredential(newCredential, hasher)
  if (!hashed.ok) {
    return hashed
  }

  try {
    await sink.write(resolved.subject, hashed.value)
  } catch {
    return err(AUTH_FAILURE.INTERNAL)
  }

  return ok(undefined)
}
