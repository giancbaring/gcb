/**
 * record-auth-event.ts - implementation of the `record-auth-event`
 * composition. Contract: core/identity/observability/record-auth-event.yaml
 *
 * Builds one immutable AuthEvent and appends it through a caller-supplied
 * sink. Expected failures are returned as AuthFailure values.
 */

import { ok, err, type Result } from '../../primitives/result'
import {
  makeAuthEvent,
  type AuthAction,
  type AuthEvent,
} from '../../primitives/auth-event'
import { AUTH_FAILURE, type AuthFailure } from '../../primitives/auth-failure'
import type { Actor } from '../../primitives/actor'
import type { Outcome } from '../../primitives/outcome'
import type { Timestamp } from '../../primitives/timestamp'

export interface AuthEventSink {
  append(event: AuthEvent): Promise<void> | void
}

export type Clock = () => Timestamp

export interface RecordAuthEventInput {
  readonly action: AuthAction
  readonly actor: Actor
  readonly outcome: Outcome
  readonly detail?: Record<string, string>
}

export async function recordAuthEvent(
  input: RecordAuthEventInput,
  sink: AuthEventSink,
  clock: Clock,
): Promise<Result<AuthEvent, AuthFailure>> {
  try {
    const eventResult = makeAuthEvent({
      action: input.action,
      subject: input.actor.subject,
      outcome: input.outcome,
      occurredAt: clock(),
      detail: input.detail,
    })

    if (!eventResult.ok) {
      return err(AUTH_FAILURE.INTERNAL)
    }

    await sink.append(eventResult.value)
    return ok(eventResult.value)
  } catch {
    return err(AUTH_FAILURE.INTERNAL)
  }
}
