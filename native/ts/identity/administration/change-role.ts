/**
 * change-role.ts — implementation of the `change-role` composition.
 * Contract: core/identity/administration/change-role.yaml
 *
 * Grants a new authority set to a subject. Requires the acting principal
 * to carry the fixed token "role:change". Every authorized or refused
 * attempt produces an auth event. Never throws.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Principal } from '../../primitives/principal'
import type { Subject } from '../../primitives/subject'
import type { Timestamp } from '../../primitives/timestamp'
import { AUTHZ_FAILURE, type AuthzFailure } from '../../primitives/authz-failure'
import { OUTCOME } from '../../primitives/outcome'
import { AUTH_ACTION, makeAuthEvent } from '../../primitives/auth-event'
import { makeActor, ACTOR_VIA } from '../../primitives/actor'
import { authorize } from '../authorization/authorize'
import type { AuthEventSink } from '../observability/record-auth-event'

export const ROLE_CHANGE_ACTION = 'role:change'

export type Clock = () => Timestamp

/**
 * A RoleSink applies a new authority set to a subject. It may throw;
 * changeRole catches that and records an ERROR event.
 */
export interface RoleSink {
  apply(subject: Subject, authority: readonly string[]): Promise<void> | void
}

async function emitEvent(
  eventSink: AuthEventSink,
  actorSubject: Subject,
  outcome: (typeof OUTCOME)[keyof typeof OUTCOME],
  occurredAt: Timestamp,
  detail: Record<string, string>,
): Promise<boolean> {
  try {
    const actorResult = makeActor({ subject: actorSubject, via: ACTOR_VIA.DIRECT })
    if (!actorResult.ok) return false

    const eventResult = makeAuthEvent({
      action: AUTH_ACTION.ROLE_CHANGE,
      subject: actorSubject,
      outcome,
      occurredAt,
      detail,
    })
    if (!eventResult.ok) return false

    await eventSink.append(eventResult.value)
    return true
  } catch {
    return false
  }
}

export async function changeRole(
  actorPrincipal: Principal | null | undefined,
  targetSubject: Subject,
  newAuthority: readonly string[],
  roleSink: RoleSink,
  eventSink: AuthEventSink,
  clock: Clock,
): Promise<Result<void, AuthzFailure>> {
  if (!actorPrincipal) {
    return err(AUTHZ_FAILURE.NO_PRINCIPAL)
  }

  const decision = authorize(actorPrincipal, ROLE_CHANGE_ACTION)

  if (!decision.ok) {
    const audited = await emitEvent(
      eventSink,
      actorPrincipal.subject,
      OUTCOME.DENIED,
      clock(),
      { target: targetSubject.identifier, action: ROLE_CHANGE_ACTION },
    )
    if (!audited) {
      return err(AUTHZ_FAILURE.INTERNAL)
    }
    return decision
  }

  const frozenAuthority = Object.freeze([...newAuthority])

  try {
    await roleSink.apply(targetSubject, frozenAuthority)
  } catch {
    const audited = await emitEvent(
      eventSink,
      actorPrincipal.subject,
      OUTCOME.ERROR,
      clock(),
      { target: targetSubject.identifier, action: ROLE_CHANGE_ACTION },
    )
    if (!audited) {
      return err(AUTHZ_FAILURE.INTERNAL)
    }
    return err(AUTHZ_FAILURE.INTERNAL)
  }

  const audited = await emitEvent(
    eventSink,
    actorPrincipal.subject,
    OUTCOME.SUCCESS,
    clock(),
    { target: targetSubject.identifier, action: ROLE_CHANGE_ACTION },
  )
  if (!audited) {
    return err(AUTHZ_FAILURE.INTERNAL)
  }

  return ok(undefined)
}
