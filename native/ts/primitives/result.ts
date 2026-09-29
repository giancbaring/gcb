/**
 * result.ts — implementation of the `result` primitive.
 * Contract: core/primitives/result.yaml
 *
 * A Result is a discriminated union. It replaces thrown exceptions with an
 * explicit success/failure value. Every function in the GCB returns a Result
 * for expected failure modes and throws only on programmer error.
 */

export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

/** Construct a successful result. */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

/** Construct a failed result. Does not throw. */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/** Type guard for the success variant. */
export function isOk<T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } {
  return result.ok
}

/** Type guard for the failure variant. */
export function isErr<T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } {
  return !result.ok
}

/**
 * Extract the value from an Ok result.
 * Throws on Err — a programmer error, not an expected failure mode.
 * Callers that cannot guarantee the variant should use unwrapOr or match.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value
  throw new Error(`unwrap() called on an Err result: ${String(result.error)}`)
}

/** Extract the value, or return a fallback if the result is Err. */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback
}

/**
 * Fold a Result into a single value by handling both variants.
 * The primary consumer of Result — forces explicit handling of both cases.
 */
export function match<T, E, R>(
  result: Result<T, E>,
  handlers: {
    ok: (value: T) => R
    err: (error: E) => R
  },
): R {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error)
}

/**
 * Transform the value inside an Ok result. Err passes through unchanged.
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result
}

/**
 * Chain a fallible computation onto an Ok result. Err short-circuits.
 * Used to sequence operations that each may fail.
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result
}