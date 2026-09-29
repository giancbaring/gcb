/**
 * permission-check.ts — implementation of the `permission-check` function.
 * Contract: core/identity/authorization/permission-check.yaml
 *
 * Decides whether a Principal carries the authority required for a
 * named action. Denial is Ok(false), not an error. Err is reserved for
 * system faults.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Principal } from '../../primitives/principal'
import { AUTH_FAILURE, type AuthFailure } from '../../primitives/auth-failure'

export function permissionCheck(
  principal: Principal,
  required: string,
): Result<boolean, AuthFailure> {
  if (
    typeof required !== 'string' ||
    required.length === 0 ||
    !principal ||
    !principal.authority
  ) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  return ok(principal.authority.has(required))
}
