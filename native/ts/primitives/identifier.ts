/**
 * identifier.ts — implementation of the `identifier` primitive.
 * Contract: core/primitives/identifier.yaml
 *
 * An Identifier is an opaque, stable reference to a subject within a
 * namespace. It carries no meaning beyond uniqueness in its scope. The
 * concrete format is supplied by a binding (a validator function), never
 * by this module.
 */

declare const identifierBrand: unique symbol

/**
 * A branded string. TypeScript will not accept a plain string where an
 * Identifier is required — the value must pass through `makeIdentifier`
 * or `unsafeIdentifier`.
 */
export type Identifier = string & { readonly [identifierBrand]: true }

/**
 * A binding validates and normalizes a raw string into an Identifier.
 * Bindings are project-specific. The primitive does not prescribe a format.
 */
export type IdentifierBinding = {
  readonly namespace: string
  readonly validate: (raw: string) => boolean
  readonly normalize?: (raw: string) => string
}

/**
 * Construct an Identifier, applying the binding's normalize and validate.
 * Returns a Result — never throws on invalid input.
 */
export function makeIdentifier(
  binding: IdentifierBinding,
  raw: string,
): { ok: true; value: Identifier } | { ok: false; error: string } {
  const normalized = binding.normalize ? binding.normalize(raw) : raw

  if (!binding.validate(normalized)) {
    return { ok: false, error: `invalid identifier for namespace: ${binding.namespace}` }
  }

  return { ok: true, value: normalized as Identifier }
}

/**
 * Bypass validation. Use only when an Identifier has already been validated
 * elsewhere — e.g., when reading from a trusted source. Marked explicitly to
 * make the safety assumption visible at the call site.
 */
export function unsafeIdentifier(raw: string): Identifier {
  return raw as Identifier
}

/** Compare two Identifiers within the same namespace. */
export function identifiersEqual(a: Identifier, b: Identifier): boolean {
  return a === b
}
