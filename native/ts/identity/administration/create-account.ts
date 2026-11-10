/**
 * create-account.ts — implementation of the `create-account` composition.
 * Contract: core/identity/administration/create-account.yaml
 *
 * Provision a new account. Requires the acting principal to carry
 * "user:create". Hashes the initial credential, then asks a sink to
 * persist subject + secret + authority together. Never throws.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Principal } from '../primitives/principal'
import type { Subject } from '../../primitives/subject'
import type { Credential } from '../primitives/credential'
import type { Secret } from '../../primitives/secret'
import type { Timestamp } from '../../primitives/timestamp'
import { AUTHZ_FAILURE, type AuthzFailure } from '../primitives/authz-failure'
import { authorize } from '../authorization/authorize'
import { hashCredential, type Hasher } from '../credentials/hash-credential'

export const CREATE_ACCOUNT_ACTION = 'user:create'

export type Clock = () => Timestamp

/**
 * An AccountSink persists a new account: the subject, the hashed secret,
 * and the initial authority. It should perform the write atomically —
 * a partial account is not a valid account. May throw; createAccount
 * catches that and returns INTERNAL.
 */
export interface AccountSink {
  create(
    subject: Subject,
    secret: Secret,
    authority: readonly string[],
  ): Promise<void> | void
}

export async function createAccount(
  actorPrincipal: Principal | null | undefined,
  targetSubject: Subject,
  initialCredential: Credential,
  initialAuthority: readonly string[],
  accountSink: AccountSink,
  hasher: Hasher,
  _clock: Clock,
): Promise<Result<Subject, AuthzFailure>> {
  const decision = authorize(actorPrincipal, CREATE_ACCOUNT_ACTION)
  if (!decision.ok) {
    return decision
  }

  const hashed = hashCredential(initialCredential, hasher)
  if (!hashed.ok) {
    return err(AUTHZ_FAILURE.INTERNAL)
  }

  const frozenAuthority = Object.freeze([...initialAuthority])

  try {
    await accountSink.create(targetSubject, hashed.value, frozenAuthority)
  } catch {
    return err(AUTHZ_FAILURE.INTERNAL)
  }

  return ok(targetSubject)
}
