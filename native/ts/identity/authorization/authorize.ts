/**
 * authorize.ts — implementation of the `authorize` composition.
 * Contract: core/identity/authorization/authorize.yaml
 *
 * Gate an action on a Principal's authority. Denial is Err FORBIDDEN,
 * not Ok(false) — a refusal is a terminal outcome, not a branch.
 * Never throws.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Principal } from '../primitives/principal'
import { AUTHZ_FAILURE, type AuthzFailure } from '../primitives/authz-failure'
import { permissionCheck } from './permission-check'

export function authorize(
  principal: Principal | null | undefined,
  action: string,
): Result<Principal, AuthzFailure> {
  if (!principal) {
    return err(AUTHZ_FAILURE.NO_PRINCIPAL)
  }

  if (typeof action !== 'string' || action.length === 0) {
    return err(AUTHZ_FAILURE.UNKNOWN_ACTION)
  }

  const check = permissionCheck(principal, action)
  if (!check.ok) {
    return err(AUTHZ_FAILURE.INTERNAL)
  }

  if (!check.value) {
    return err(AUTHZ_FAILURE.FORBIDDEN)
  }

  return ok(principal)
}
