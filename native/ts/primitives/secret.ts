/**
 * secret.ts — implementation of the `secret` primitive.
 * Contract: core/primitives/secret.yaml
 *
 * A Secret is a stored value against which a Credential is verified.
 * It is persisted, but its storage form is a one-way hash of the raw
 * value. It carries an algorithm identifier so verification can refuse
 * unknowns. It redacts itself on any serialization path.
 */

const REDACTED = '[secret]'

export interface SecretStorage {
  readonly algorithm: string
  readonly hash: string
  readonly parameters?: Readonly<Record<string, string | number>>
}

export class Secret {
  readonly #storage: SecretStorage

  private constructor(storage: SecretStorage) {
    this.#storage = Object.freeze({ ...storage })
  }

  /** Construct from a storage record. Rejects empty algorithm or hash. */
  static fromStorage(storage: SecretStorage): Secret {
    if (!storage.algorithm || !storage.hash) {
      throw new Error('Secret requires both algorithm and hash')
    }
    return new Secret(storage)
  }

  /** Reveal the storage record. Only the verification function may call this. */
  reveal(): SecretStorage {
    return this.#storage
  }

  toString(): string {
    return REDACTED
  }

  toJSON(): string {
    return REDACTED
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return REDACTED
  }
}
