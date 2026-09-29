/**
 * reset-token.ts — implementation of the `reset-token` primitive.
 * Contract: core/primitives/reset-token.yaml
 *
 * A one-time, time-bounded token authorizing a privileged recovery.
 * Distinct from Credential — the token proves authorization for one
 * specific action, not identity at login.
 */

declare const resetTokenBrand: unique symbol

export type ResetToken = string & { readonly [resetTokenBrand]: true }

export interface ResetTokenBinding {
  readonly purpose: string
  readonly validate: (raw: string) => boolean
}

export interface KeyedResetToken {
  readonly token: ResetToken
  readonly purpose: string
}

export function makeResetToken(
  binding: ResetTokenBinding,
  raw: string,
): { ok: true; value: KeyedResetToken } | { ok: false; error: string } {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'reset-token: value must be a string' }
  }

  if (!binding.purpose || typeof binding.purpose !== 'string') {
    return { ok: false, error: 'reset-token: purpose is required' }
  }

  if (raw.length === 0) {
    return { ok: false, error: 'reset-token: value is empty' }
  }

  if (!binding.validate(raw)) {
    return {
      ok: false,
      error: `reset-token: invalid value for purpose '${binding.purpose}'`,
    }
  }

  return {
    ok: true,
    value: Object.freeze({
      token: raw as ResetToken,
      purpose: binding.purpose,
    }),
  }
}

export function resetTokensEqual(
  a: KeyedResetToken,
  b: KeyedResetToken,
): boolean {
  return a.purpose === b.purpose && a.token === b.token
}
