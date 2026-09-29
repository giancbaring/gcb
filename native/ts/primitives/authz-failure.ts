/**
 * authz-failure.ts — implementation of the `authz-failure` primitive.
 * Contract: core/primitives/authz-failure.yaml
 *
 * A closed enumeration of authorization failure modes. Distinct from
 * auth-failure: authentication asks who the caller is; authorization
 * asks what they may do.
 */

export const AUTHZ_FAILURE = {
  FORBIDDEN: 'FORBIDDEN',
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  NO_PRINCIPAL: 'NO_PRINCIPAL',
  INTERNAL: 'INTERNAL',
} as const

export type AuthzFailure = (typeof AUTHZ_FAILURE)[keyof typeof AUTHZ_FAILURE]

const ALL: readonly AuthzFailure[] = Object.freeze([
  AUTHZ_FAILURE.FORBIDDEN,
  AUTHZ_FAILURE.UNKNOWN_ACTION,
  AUTHZ_FAILURE.NO_PRINCIPAL,
  AUTHZ_FAILURE.INTERNAL,
])

export function isAuthzFailure(value: unknown): value is AuthzFailure {
  return typeof value === 'string' && (ALL as readonly string[]).includes(value)
}

export function allAuthzFailures(): readonly AuthzFailure[] {
  return ALL
}

/**
 * Presentation binding. FORBIDDEN gets an explicit message; every other
 * variant collapses to a generic string so the caller cannot distinguish
 * a malformed request from a system fault.
 */
export interface AuthzFailureMessages {
  readonly FORBIDDEN?: string
  readonly generic?: string
}

const DEFAULTS: Required<AuthzFailureMessages> = {
  FORBIDDEN: 'You do not have permission to perform this action.',
  generic: 'The action could not be completed.',
}

export function toUserMessage(
  failure: AuthzFailure,
  binding: AuthzFailureMessages = {},
): string {
  const messages = { ...DEFAULTS, ...binding }
  return failure === AUTHZ_FAILURE.FORBIDDEN ? messages.FORBIDDEN : messages.generic
}

/** Full internal text for audit logging. Never shown to a caller. */
export function toAuditCode(failure: AuthzFailure): string {
  return `AUTHZ_${failure}`
}
