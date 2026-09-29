/**
 * validate-input.ts — implementation of the `validate-input` function.
 * Contract: core/validation/validate-input.yaml
 *
 * Runs every validator, collects every failure. Never throws.
 */

import { ok, err, type Result } from '../primitives/result'

/**
 * A Validator has a name (for audit and presentation) and a predicate
 * that returns true when the value is acceptable. It may throw — the
 * pipeline catches that and records it as a failure.
 */
export interface Validator {
  readonly name: string
  readonly check: (value: unknown) => boolean
}

export interface ValidationFailure {
  readonly validator: string
  readonly reason: string
}

export function validateInput(
  value: unknown,
  validators: readonly Validator[],
): Result<unknown, readonly ValidationFailure[]> {
  const failures: ValidationFailure[] = []

  for (const validator of validators) {
    try {
      const passed = validator.check(value)
      if (!passed) {
        failures.push({
          validator: validator.name,
          reason: 'check returned false',
        })
      }
    } catch {
      failures.push({
        validator: validator.name,
        reason: 'validator threw',
      })
    }
  }

  return failures.length === 0 ? ok(value) : err(Object.freeze(failures))
}
