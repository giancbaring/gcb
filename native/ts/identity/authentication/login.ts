/**
 * login.ts — implementation of the `login` composition.
 * Contract: core/identity/authentication/login.yaml
 *
 * End-to-end login. Authenticates a credential and establishes a Session
 * from the resulting Assertion. Adds no invariants of its own.
 */

import type { Result } from '../../primitives/result'
import type { Identifier } from '../../primitives/identifier'
import type { Credential } from '../primitives/credential'
import type { Session } from '../primitives/session'
import type { Duration } from '../../primitives/timestamp'
import type { AuthFailure } from '../primitives/auth-failure'
import type { Comparator } from './verification/compare-secret'
import type { IdGenerator, Clock } from './assertion/issue-assertion'
import { authenticate, type AuthenticationContext } from './authenticate'
import { createSession } from '../session/establishment/create-session'
import { DEVLOG_ENABLED, historian } from '../../devlog'
import type { Historian } from '../../devlog'

export async function login(
  identifier: Identifier,
  credential: Credential,
  context: AuthenticationContext,
  comparator: Comparator,
  sessionIdGenerator: IdGenerator,
  sessionLifetime: Duration,
  clock: Clock,
  inputs?: { historian?: Historian },
): Promise<Result<Session, AuthFailure>> {
  const h = DEVLOG_ENABLED ? (inputs?.historian ?? historian) : undefined

  let result: Result<Session, AuthFailure> | undefined
  try {
    if (h) h.enter('login', { identifier })
    const authentication = await authenticate(
      identifier,
      credential,
      context,
      comparator,
      sessionIdGenerator,
      clock,
    )

    if (!authentication.ok) {
      if (h) h.fail('login', { code: authentication.error })
      result = authentication
      return authentication
    }

    result = await createSession(authentication.value, sessionLifetime, clock)
    if (!result.ok && h) h.fail('login', { code: result.error })
    return result
  } finally {
    if (h) h.exit('login', { ok: result?.ok ?? false })
  }
}
