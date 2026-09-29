/**
 * attempt-login.ts — implementation of the `attempt-login` composition.
 * Contract: core/identity/authentication/attempt-login.yaml
 *
 * The secure login attempt: rate limit, authenticate, create session,
 * record every attempt. Never throws.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Identifier } from '../../primitives/identifier'
import type { Credential } from '../../primitives/credential'
import type { Session } from '../../primitives/session'
import type { Duration, Timestamp } from '../../primitives/timestamp'
import { AUTH_FAILURE, type AuthFailure } from '../../primitives/auth-failure'
import type { RateLimitFailure } from '../../primitives/rate-limit-failure'
import { OUTCOME } from '../../primitives/outcome'
import { AUTH_ACTION } from '../../primitives/auth-event'
import { makeActor, ACTOR_VIA } from '../../primitives/actor'
import { makeSubject, type Subject } from '../../primitives/subject'
import type { Comparator } from './verification/compare-secret'
import type { IdGenerator, Clock } from './assertion/issue-assertion'
import { authenticate, type AuthenticationContext } from './authenticate'
import { createSession } from '../session/establishment/create-session'
import {
  rateLimit,
  type RateLimitPolicy,
  type RateLimitStore,
} from '../throttling/rate-limit'
import type { AuthEventSink } from '../observability/record-auth-event'

export type AttemptLoginFailure =
  | { readonly kind: 'rate-limited'; readonly failure: RateLimitFailure }
  | { readonly kind: 'auth'; readonly failure: AuthFailure }

async function emit(
  eventSink: AuthEventSink,
  subject: Subject,
  outcome: (typeof OUTCOME)[keyof typeof OUTCOME],
  occurredAt: Timestamp,
  detail: Record<string, string>,
): Promise<boolean> {
  try {
    const actor = makeActor({ subject, via: ACTOR_VIA.DIRECT })
    if (!actor.ok) return false

    const { makeAuthEvent } = await import('../../primitives/auth-event')
    const event = makeAuthEvent({
      action: AUTH_ACTION.LOGIN,
      subject,
      outcome,
      occurredAt,
      detail,
    })
    if (!event.ok) return false

    await eventSink.append(event.value)
    return true
  } catch {
    return false
  }
}

export async function attemptLogin(
  identifier: Identifier,
  credential: Credential,
  context: AuthenticationContext,
  comparator: Comparator,
  sessionIdGenerator: IdGenerator,
  sessionLifetime: Duration,
  rateLimitKey: string,
  rateLimitPolicy: RateLimitPolicy,
  rateLimitStore: RateLimitStore,
  eventSink: AuthEventSink,
  clock: Clock,
): Promise<Result<Session, AttemptLoginFailure>> {
  const limitResult = await rateLimit(
    rateLimitKey,
    rateLimitPolicy,
    rateLimitStore,
    clock,
  )

  if (!limitResult.ok) {
    const claimed = makeSubject(identifier, 'human')
    await emit(
      eventSink,
      claimed,
      OUTCOME.DENIED,
      clock(),
      {
        reason: 'rate-limited',
        rateLimitFailure: limitResult.error,
      },
    )
    return err({ kind: 'rate-limited', failure: limitResult.error })
  }

  const authResult = await authenticate(
    identifier,
    credential,
    context,
    comparator,
    sessionIdGenerator,
    clock,
  )

  if (!authResult.ok) {
    // Try to attribute the failure to a subject so the audit event has
    // a subject. If the identifier is unknown, we cannot.
    try {
      const resolved = await context.resolve(identifier)
      if (resolved) {
        const audited = await emit(
          eventSink,
          resolved.subject,
          OUTCOME.FAILURE,
          clock(),
          { reason: authResult.error },
        )
        if (!audited) {
          return err({ kind: 'auth', failure: AUTH_FAILURE.INTERNAL })
        }
      }
    } catch {
      // Resolution failure during audit does not change the outcome.
    }

    return err({ kind: 'auth', failure: authResult.error })
  }

  const sessionResult = createSession(authResult.value, sessionLifetime, clock)
  if (!sessionResult.ok) {
    return err({ kind: 'auth', failure: sessionResult.error })
  }

  const audited = await emit(
    eventSink,
    authResult.value.subject,
    OUTCOME.SUCCESS,
    clock(),
    {},
  )
  if (!audited) {
    return err({ kind: 'auth', failure: AUTH_FAILURE.INTERNAL })
  }

  return ok(sessionResult.value)
}
