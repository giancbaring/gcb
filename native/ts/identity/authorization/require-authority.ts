/**
 * require-authority.ts — implementation of the `require-authority` function.
 * Contract: core/identity/authorization/require-authority.yaml
 *
 * A guard that runs a supplied action only when a principal carries the
 * required authority token. The action never runs on the deny path.
 * Never throws.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Principal } from '../../primitives/principal'
import { AUTHZ_FAILURE, type AuthzFailure } from '../../primitives/authz-failure'
import { authorize } from './authorize'

export function requireAuthority<T>(
  principal: Principal | null | undefined,
  actionToken: string,
  action: () => T,
): Result<T, AuthzFailure>
export function requireAuthority<T>(
  principal: Principal | null | undefined,
  actionToken: string,
  action: () => Promise<T>,
): Promise<Result<T, AuthzFailure>>
export function requireAuthority<T>(
  principal: Principal | null | undefined,
  actionToken: string,
  action: () => T | Promise<T>,
): Result<T, AuthzFailure> | Promise<Result<T, AuthzFailure>> {
  const decision = authorize(principal, actionToken)

  if (!decision.ok) {
    return decision
  }

  let outcome: T | Promise<T>
  try {
    outcome = action()
  } catch {
    return err(AUTHZ_FAILURE.INTERNAL)
  }

  if (outcome instanceof Promise) {
    return outcome.then(
      (value) => ok(value),
      () => err(AUTHZ_FAILURE.INTERNAL),
    )
  }

  return ok(outcome)
}
