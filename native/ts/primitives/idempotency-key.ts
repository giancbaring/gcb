/**
 * idempotency-key.ts — implementation of the `idempotency-key` primitive.
 * Contract: core/primitives/idempotency-key.yaml
 *
 * An opaque token identifying a logical request. Distinct from
 * Identifier: an Identifier names a subject; an IdempotencyKey names
 * one operation and is consumed by the first execution.
 */

declare const idempotencyKeyBrand: unique symbol

export type IdempotencyKey = string & { readonly [idempotencyKeyBrand]: true }

export interface KeyBinding {
  readonly scope: string
  readonly validate: (raw: string) => boolean
  readonly normalize?: (raw: string) => string
}

export interface KeyedIdempotencyKey {
  readonly key: IdempotencyKey
  readonly scope: string
}

/**
 * Construct an IdempotencyKey for a given scope, applying the binding's
 * normalize and validate. Empty or malformed values are rejected. There
 * is no default key.
 */
export function makeIdempotencyKey(
  binding: KeyBinding,
  raw: string,
): { ok: true; value: KeyedIdempotencyKey } | { ok: false; error: string } {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'idempotency-key: value must be a string' }
  }

  if (!binding.scope || typeof binding.scope !== 'string') {
    return { ok: false, error: 'idempotency-key: scope is required' }
  }

  const normalized = binding.normalize ? binding.normalize(raw) : raw

  if (normalized.length === 0) {
    return { ok: false, error: 'idempotency-key: value is empty' }
  }

  if (!binding.validate(normalized)) {
    return {
      ok: false,
      error: `idempotency-key: invalid value for scope '${binding.scope}'`,
    }
  }

  return {
    ok: true,
    value: Object.freeze({
      key: normalized as IdempotencyKey,
      scope: binding.scope,
    }),
  }
}

/** Equality within a scope. Same value and same scope means same request. */
export function idempotencyKeysEqual(
  a: KeyedIdempotencyKey,
  b: KeyedIdempotencyKey,
): boolean {
  return a.scope === b.scope && a.key === b.key
}
