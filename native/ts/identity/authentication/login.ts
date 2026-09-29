/**
 * login.ts — implementation of the `login` composition.
 * Contract: core/identity/authentication/login.yaml
 *
 * End-to-end login. Authenticates a credential and establishes a Session
 * from the resulting Assertion. Adds no invariants of its own.
 */

import type { Result } from '../../primitives/result'
import type { Identifier } from '../../primitives/identifier'
import type { Credential } from '../../primitives/credential'
import type { Session } from '../../primitives/session'
import type { Duration } from '../../primitives/timestamp'
import type { AuthFailure } from '../../primitives/auth-failure'
import type { Comparator } from './verification/compare-secret'
import type { IdGenerator, Clock } from './assertion/issue-assertion'
import { authenticate, type AuthenticationContext } from './authenticate'
import { createSession } from '../session/establishment/create-session'

export async function login(
  identifier: Identifier,
  credential: Credential,
  context: AuthenticationContext,
  comparator: Comparator,
  sessionIdGenerator: IdGenerator,
  sessionLifetime: Duration,
  clock: Clock,
): Promise<Result<Session, AuthFailure>> {
  const authentication = await authenticate(
    identifier,
    credential,
    context,
    comparator,
    sessionIdGenerator,
    clock,
  )

  if (!authentication.ok) {
    return authentication
  }

  return createSession(authentication.value, sessionLifetime, clock)
}
