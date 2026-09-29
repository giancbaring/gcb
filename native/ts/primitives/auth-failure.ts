/**
 * auth-failure.ts — implementation of the `auth-failure` primitive.
 * Contract: core/primitives/auth-failure.yaml
 *
 * A closed enumeration of authentication failure modes. Every auth
 * function returns Result<T, AuthFailure> rather than throwing. The
 * classification is preserved internally for audit, but toUserMessage
 * collapses most variants to a single generic string to prevent
 * account enumeration.
 */

export const AUTH_FAILURE = {
  MISSING: 'MISSING',
  MALFORMED: 'MALFORMED',
  UNKNOWN_SUBJECT: 'UNKNOWN_SUBJECT',
  MISMATCH: 'MISMATCH',
  EXPIRED: 'EXPIRED',
  LOCKED: 'LOCKED',
  UNVERIFIED: 'UNVERIFIED',
  INTERNAL: 'INTERNAL',
} as const

export type AuthFailure = (typeof AUTH_FAILURE)[keyof typeof AUTH_FAILURE]

const ALL: readonly AuthFailure[] = Object.freeze([
  AUTH_FAILURE.MISSING,
  AUTH_FAILURE.MALFORMED,
  AUTH_FAILURE.UNKNOWN_SUBJECT,
  AUTH_FAILURE.MISMATCH,
  AUTH_FAILURE.EXPIRED,
  AUTH_FAILURE.LOCKED,
  AUTH_FAILURE.UNVERIFIED,
  AUTH_FAILURE.INTERNAL,
])

export function isAuthFailure(value: unknown): value is AuthFailure {
  return typeof value === 'string' && (ALL as readonly string[]).includes(value)
}

/**
 * Presentation binding. Two variants are safe to disclose to an
 * unauthenticated caller because they do not reveal whether an account
 * exists — LOCKED and UNVERIFIED. Every other variant collapses to the
 * generic string.
 *
 * The binding argument supplies project-specific copy. Callers without
 * a binding get safe defaults.
 */
export interface FailureMessages {
  readonly LOCKED?: string
  readonly UNVERIFIED?: string
  readonly generic?: string
}

const DEFAULTS: Required<FailureMessages> = {
  LOCKED: 'Your account has been locked. Contact an administrator.',
  UNVERIFIED: 'Please confirm your email address to continue.',
  generic: 'Invalid credentials.',
}

export function toUserMessage(
  failure: AuthFailure,
  binding: FailureMessages = {},
): string {
  const messages = { ...DEFAULTS, ...binding }
  switch (failure) {
    case AUTH_FAILURE.LOCKED:
      return messages.LOCKED
    case AUTH_FAILURE.UNVERIFIED:
      return messages.UNVERIFIED
    default:
      return messages.generic
  }
}

/** Full internal text for audit logging. Never shown to a caller. */
export function toAuditCode(failure: AuthFailure): string {
  return `AUTH_${failure}`
}
