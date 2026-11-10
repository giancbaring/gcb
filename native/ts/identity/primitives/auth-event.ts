/**
 * auth-event.ts — implementation of the `auth-event` primitive.
 * Contract: core/primitives/auth-event.yaml
 *
 * An AuthEvent is a recorded fact about an authentication action. It is
 * immutable, append-only, and carries no sensitive material.
 */

import { ok, err, type Result } from '../../primitives/result'
import type { Subject } from '../../primitives/subject'
import type { Outcome } from '../../primitives/outcome'
import type { Timestamp } from '../../primitives/timestamp'
import { isOutcome } from '../../primitives/outcome'

export const AUTH_ACTION = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREDENTIAL_CHANGE: 'credential-change',
  ROLE_CHANGE: 'role-change',
  SESSION_ISSUE: 'session-issue',
  SESSION_REVOKE: 'session-revoke',
} as const

export type AuthAction = (typeof AUTH_ACTION)[keyof typeof AUTH_ACTION]

const ALL_ACTIONS: readonly AuthAction[] = Object.freeze([
  AUTH_ACTION.LOGIN,
  AUTH_ACTION.LOGOUT,
  AUTH_ACTION.CREDENTIAL_CHANGE,
  AUTH_ACTION.ROLE_CHANGE,
  AUTH_ACTION.SESSION_ISSUE,
  AUTH_ACTION.SESSION_REVOKE,
])

export function isAuthAction(value: unknown): value is AuthAction {
  return typeof value === 'string' && (ALL_ACTIONS as readonly string[]).includes(value)
}

export interface AuthEvent {
  readonly action: AuthAction
  readonly subject: Subject
  readonly outcome: Outcome
  readonly occurredAt: Timestamp
  readonly detail: Readonly<Record<string, string>>
}

export interface AuthEventInput {
  readonly action: unknown
  readonly subject: unknown
  readonly outcome: unknown
  readonly occurredAt: unknown
  readonly detail?: unknown
}

function isSubjectLike(value: unknown): value is Subject {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.identifier === 'string' && typeof v.kind === 'string'
}

function isTimestampLike(value: unknown): value is Timestamp {
  return typeof value === 'number' && Number.isFinite(value)
}

function isDetailMap(value: unknown): value is Record<string, string> {
  if (value === undefined) return true
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === 'string',
  )
}

export function makeAuthEvent(input: AuthEventInput): Result<AuthEvent, string> {
  if (!isAuthAction(input.action)) {
    return err(`auth-event: unknown action '${String(input.action)}'`)
  }
  if (!isSubjectLike(input.subject)) {
    return err('auth-event: subject is missing or malformed')
  }
  if (!isOutcome(input.outcome)) {
    return err(`auth-event: unknown outcome '${String(input.outcome)}'`)
  }
  if (!isTimestampLike(input.occurredAt)) {
    return err('auth-event: occurredAt is not a valid instant')
  }
  if (!isDetailMap(input.detail)) {
    return err('auth-event: detail must be a map of strings to strings')
  }

  const detail = (input.detail as Record<string, string> | undefined) ?? {}

  return ok(
    Object.freeze({
      action: input.action,
      subject: input.subject,
      outcome: input.outcome,
      occurredAt: input.occurredAt,
      detail: Object.freeze({ ...detail }),
    }),
  )
}

export function allAuthActions(): readonly AuthAction[] {
  return ALL_ACTIONS
}
