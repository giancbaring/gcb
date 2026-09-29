/**
 * resolve-identifier.ts — implementation of the `resolve-identifier` function.
 * Contract: core/identity/authentication/resolution/resolve-identifier.yaml
 *
 * Resolves an Identifier to the Subject it names. This is the first step
 * of authentication. It never verifies a credential — that is a
 * different function. Failure is always a value, never a throw.
 */

import { ok, err, type Result } from '../../../primitives/result'
import type { Identifier } from '../../../primitives/identifier'
import type { Subject } from '../../../primitives/subject'
import { AUTH_FAILURE, type AuthFailure } from '../../../primitives/auth-failure'

export type Resolver = (identifier: Identifier) => Promise<Subject | null>

export async function resolveIdentifier(
  identifier: Identifier,
  resolver: Resolver,
): Promise<Result<Subject, AuthFailure>> {
  let resolved: Subject | null

  try {
    resolved = await resolver(identifier)
  } catch {
    return err(AUTH_FAILURE.INTERNAL)
  }

  if (resolved === null) {
    return err(AUTH_FAILURE.UNKNOWN_SUBJECT)
  }

  if (resolved.identifier !== identifier) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  return ok(resolved)
}
