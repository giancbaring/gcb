/**
 * compare-secret.ts — implementation of the `compare-secret` function.
 * Contract: core/identity/authentication/verification/compare-secret.yaml
 *
 * The atomic verification step. Compares a Credential against a Secret
 * using a caller-supplied comparator. Returns a Result — never throws,
 * never includes the credential or secret in its output.
 */

import { ok, err, type Result } from '../../../primitives/result'
import type { Credential } from '../../primitives/credential'
import type { Secret } from '../../../primitives/secret'
import { AUTH_FAILURE, type AuthFailure } from '../../primitives/auth-failure'

/**
 * A Comparator receives the raw credential bytes and the stored secret
 * record. It MUST be constant-time with respect to the raw bytes. It
 * returns a bare boolean — no partial-match leaks.
 */
export type Comparator = (
  presented: string,
  stored: ReturnType<Secret['reveal']>,
) => boolean

export function compareSecret(
  presented: Credential,
  stored: Secret,
  comparator: Comparator,
): Result<boolean, AuthFailure> {
  try {
    const matches = comparator(presented.reveal(), stored.reveal())
    return matches ? ok(true) : err(AUTH_FAILURE.MISMATCH)
  } catch {
    return err(AUTH_FAILURE.INTERNAL)
  }
}
