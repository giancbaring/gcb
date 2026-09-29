/**
 * credential.ts — implementation of the `credential` primitive.
 * Contract: core/primitives/credential.yaml
 *
 * A Credential is a proof of identity presented by a caller. It is
 * transient — never stored, never logged, never serialized. The class
 * below actively overrides serialization to guarantee redaction.
 */

const REDACTED = '[credential]'

export class Credential {
  readonly #raw: string

  private constructor(raw: string) {
    this.#raw = raw
  }

  /** Construct from a raw string. Called by bindings, not by application code. */
  static fromRaw(raw: string): Credential {
    return new Credential(raw)
  }

  /**
   * Reveal the raw value. Only the verify-function of a binding may call
   * this. Application code must not.
   */
  reveal(): string {
    return this.#raw
  }

  /** Redacted. Ensures accidental logging produces nothing sensitive. */
  toString(): string {
    return REDACTED
  }

  /** Redacted. Ensures JSON serialization produces nothing sensitive. */
  toJSON(): string {
    return REDACTED
  }

  /** Redacted. Ensures Node's inspect output produces nothing sensitive. */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return REDACTED
  }
}
