package primitives

import "gcb.example/core/core/schema"

credential: schema.#Primitive & {
	kind:    "primitive"
	id:      "credential"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		A proof of identity presented by a caller. A Credential is supplied at authentication time and verified against a stored Secret. It is never persisted. It is opaque — the system must not parse structure from it. Password, token, key, and signature are all bindings of this same primitive.

		"""
	shape: {
		type:        "opaque"
		carries:     "bytes"
		lifetime:    "transient"
		persistence: "forbidden"
	}
	invariants: [
		"A Credential is never stored. Not in a database, not in a log, not in memory beyond verification.",
		"A Credential is never serialized. toString, toJSON, and template interpolation MUST NOT reveal it.",
		"A Credential is compared against a Secret, never against another Credential.",
		"A Credential carries no meaning to the system. Its format is a binding concern.",
	]
	threats: [{
		id:   "T1"
		name: "Credential leakage via logging"
		mitigation: """
			The type MUST override serialization to produce a fixed redaction string. A Credential in a log line reveals nothing.

			"""
	}, {
		id:   "T2"
		name: "Credential leakage via error messages"
		mitigation: """
			Errors raised during verification MUST NOT include the Credential value. Verify functions return Result with opaque failure codes.

			"""
	}, {
		id:   "T3"
		name: "Credential reuse across contexts"
		mitigation: """
			A Credential is bound to one verification context. It MUST NOT be passed to functions that expect a different proof type.

			"""
	}, {
		id:   "T4"
		name: "Timing side-channel"
		mitigation: """
			Comparison between a Credential and a Secret MUST be constant-time. This is enforced at the binding, not at the primitive.

			"""
	}]
	bindings: {
		password: {
			presented_as: "string"
			stored_as:    "hash"
			verify:       "hash-and-compare"
		}
		token: {
			presented_as: "string"
			stored_as:    "hash"
			verify:       "hash-and-compare"
		}
		key: {
			presented_as: "bytes"
			stored_as:    "public-key"
			verify:       "signature-check"
		}
	}
	tests: [{
		given:  "a Credential constructed from 'hunter2'"
		expect: "String(credential) does not contain 'hunter2'"
	}, {
		given:  "a Credential constructed from 'hunter2'"
		expect: "JSON.stringify(credential) does not contain 'hunter2'"
	}, {
		given:  "a Credential constructed from 'hunter2'"
		expect: "template interpolation does not contain 'hunter2'"
	}, {
		given:  "two Credentials from the same raw value"
		expect: "they are not directly comparable by === on the raw value"
	}]
}
