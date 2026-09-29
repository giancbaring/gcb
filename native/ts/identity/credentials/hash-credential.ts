/**
 * hash-credential.ts — implementation of the `hash-credential` function.
 * Contract: core/identity/credentials/hash-credential.yaml
 *
 * Transforms a Credential into a Secret via a caller-supplied hasher.
 * This is the counterpart to compare-secret. Never throws.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Credential } from '../../primitives/credential'
import { Secret, type SecretStorage } from '../../primitives/secret'
import { AUTH_FAILURE, type AuthFailure } from '../../primitives/auth-failure'

/**
 * A Hasher receives the raw credential and returns a storage record.
 * It is responsible for salting, choosing an algorithm, and encoding.
 * May throw; hashCredential catches that and returns INTERNAL.
 */
export type Hasher = (presented: string) => SecretStorage

export function hashCredential(
  credential: Credential,
  hasher: Hasher,
): Result<Secret, AuthFailure> {
  let storage: SecretStorage

  try {
    storage = hasher(credential.reveal())
  } catch {
    return err(AUTH_FAILURE.INTERNAL)
  }

  try {
    return ok(Secret.fromStorage(storage))
  } catch {
    return err(AUTH_FAILURE.INTERNAL)
  }
}
