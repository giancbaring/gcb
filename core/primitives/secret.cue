package primitives
import "gcb.example/core/core/schema"

secret: schema.#Primitive & {
	kind:    "primitive"
	id:      "secret"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		A stored value against which a Credential is verified. Unlike a Credential, a Secret is persisted. It MUST be stored in a form that does not reveal the original raw value — typically a cryptographic hash. The Secret is the database-side counterpart of the Credential the caller presents.

		"""
	shape: {
		type:         "opaque-stored"
		carries:      "bytes"
		lifetime:     "persistent"
		persistence:  "required"
		storage_form: "hash"
	}
	invariants: [
		"A Secret is never constructed from a raw value. It is constructed from a hash.",
		"A Secret is never comparable to another Secret for equality by an application.",
		"A Secret is compared against a Credential only by the verification function.",
		"A Secret's storage form MUST be a one-way transform of the raw value.",
	]
	threats: [{
		id:   "T1"
		name: "Reversal to raw value"
		mitigation: """
			Storage form is a cryptographic hash. The primitive does not prescribe the algorithm — that is a binding — but it forbids reversible storage such as plaintext or symmetric encryption.

			"""
	}, {
		id:   "T2"
		name: "Secret leakage via enumeration"
		mitigation: """
			Secrets are never returned from queries to unauthenticated callers. RLS policies on the storage table MUST deny SELECT to anon.

			"""
	}, {
		id:   "T3"
		name: "Cross-context reuse"
		mitigation: """
			A Secret is bound to one subject and one context. Copying a Secret between rows is a defect.

			"""
	}, {
		id:   "T4"
		name: "Hash algorithm downgrade"
		mitigation: """
			The storage form includes an algorithm identifier. Verification reads the identifier and refuses unknown or weak algorithms.

			"""
	}]
	bindings: {
		"password-hash": {
			algorithm: "argon2id"
			parameters: {memory: 19456, iterations: 2, parallelism: 1}
		}
		"token-hash": {
			algorithm: "sha256"
			parameters: {}
		}
		"api-key-hash": {
			algorithm: "sha256"
			parameters: {}
		}
	}
	tests: [{
		given:  "a Secret constructed from a hash string"
		expect: "toString redacts the hash"
	}, {
		given:  "two Secrets from the same hash"
		expect: "not directly comparable by application code"
	}, {
		given:  "a Secret's storage form"
		expect: "matches the declared algorithm prefix"
	}]
}
