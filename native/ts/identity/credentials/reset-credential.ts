/**
 * reset-credential.ts — implementation of the `reset-credential`
 * composition. Contract: core/identity/credentials/reset-credential.yaml
 *
 * Replace a credential using a one-time reset token. Consumption
 * precedes hashing. Never throws.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Credential } from '../../primitives/credential'
import type { Secret } from '../../primitives/secret'
import type { Subject } from '../../primitives/subject'
import type { Timestamp } from '../../primitives/timestamp'
import type { KeyedResetToken } from '../../primitives/reset-token'
import { AUTH_FAILURE, type AuthFailure } from '../../primitives/auth-failure'
import { AUTH_ACTION, makeAuthEvent } from '../../primitives/auth-event'
import { OUTCOME } from '../../primitives/outcome'
import { makeActor, ACTOR_VIA } from '../../primitives/actor'
import { hashCredential, type Hasher } from './hash-credential'
import type { AuthEventSink } from '../observability/record-auth-event'

export const RESET_PURPOSE = 'password-reset'

export type Clock = () => Timestamp

export type ConsumeOutcome =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'consumed'; readonly subject: Subject }

/**
 * A ResetTokenStore atomically consumes a token and returns the subject
 * it was issued for. Consumption is one operation — a token is either
 * spent by this call or not. May throw; the composition catches that
 * and returns INTERNAL.
 */
export interface ResetTokenStore {
  consume(token: KeyedResetToken): Promise<ConsumeOutcome> | ConsumeOutcome
}

export interface CredentialSink {
  write(subject: Subject, secret: Secret): Promise<void> | void
}

async function emit(
  eventSink: AuthEventSink,
  subject: Subject,
  outcome: (typeof OUTCOME)[keyof typeof OUTCOME],
  occurredAt: Timestamp,
): Promise<boolean> {
  try {
    const actor = makeActor({ subject, via: ACTOR_VIA.DIRECT })
    if (!actor.ok) return false

    const event = makeAuthEvent({
      action: AUTH_ACTION.CREDENTIAL_CHANGE,
      subject,
      outcome,
      occurredAt,
      detail: {},
    })
    if (!event.ok) return false

    await eventSink.append(event.value)
    return true
  } catch {
    return false
  }
}

export async function resetCredential(
  token: KeyedResetToken,
  newCredential: Credential,
  tokenStore: ResetTokenStore,
  credentialSink: CredentialSink,
  eventSink: AuthEventSink,
  hasher: Hasher,
  clock: Clock,
): Promise<Result<void, AuthFailure>> {
  if (token.purpose !== RESET_PURPOSE) {
    return err(AUTH_FAILURE.MISMATCH)
  }

  let consumeResult: ConsumeOutcome
  try {
    consumeResult = await tokenStore.consume(token)
  } catch {
    return err(AUTH_FAILURE.INTERNAL)
  }

  if (consumeResult.kind === 'unknown') {
    return err(AUTH_FAILURE.UNKNOWN_SUBJECT)
  }

  if (consumeResult.kind === 'expired') {
    return err(AUTH_FAILURE.EXPIRED)
  }

  const subject = consumeResult.subject

  const hashed = hashCredential(newCredential, hasher)
  if (!hashed.ok) {
    const audited = await emit(eventSink, subject, OUTCOME.ERROR, clock())
    if (!audited) {
      return err(AUTH_FAILURE.INTERNAL)
    }
    return err(AUTH_FAILURE.INTERNAL)
  }

  try {
    await credentialSink.write(subject, hashed.value)
  } catch {
    const audited = await emit(eventSink, subject, OUTCOME.ERROR, clock())
    if (!audited) {
      return err(AUTH_FAILURE.INTERNAL)
    }
    return err(AUTH_FAILURE.INTERNAL)
  }

  const audited = await emit(eventSink, subject, OUTCOME.SUCCESS, clock())
  if (!audited) {
    return err(AUTH_FAILURE.INTERNAL)
  }

  return ok(undefined)
}
