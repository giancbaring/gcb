package primitives
import "gcb.example/core/core/schema"

resetToken: schema.#Primitive & {
	kind:    "primitive"
	id:      "reset-token"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		A one-time, time-bounded token authorizing a privileged recovery action. The token is generated out-of-band, delivered through a channel the caller controls, and presented by the holder to prove they may perform the recovery. Distinct from Credential: a Credential proves identity at login and is long-lived; a ResetToken proves authorization for one specific recovery and expires quickly.

		"""
	shape: {
		type:       "branded-string"
		brand:      "ResetToken"
		underlying: "string"
		properties: [{
			name:        "value"
			type:        "string"
			description: "The opaque token string."
		}, {
			name:        "purpose"
			type:        "string"
			description: "The recovery action the token authorizes."
		}]
	}
	invariants: [
		"A ResetToken is single-use. Consumption marks it invalid permanently.",
		"A ResetToken is time-bounded. An expiry must be enforced at the store.",
		"A ResetToken is opaque. No component may parse meaning from its structure.",
		"A ResetToken carries a purpose. A token for one purpose cannot authorize another.",
	]
	threats: [{
		id:   "T1"
		name: "Token enumeration"
		mitigation: """
			Tokens must be generated with cryptographically secure randomness at issuance. The primitive does not generate them — the caller does — but forbids predictable values by requiring a validator.

			"""
	}, {
		id:   "T2"
		name: "Token reuse"
		mitigation: """
			Consumption is atomic at the store. The token is invalidated on first successful use. A second presentation does not resolve.

			"""
	}, {
		id:   "T3"
		name: "Cross-purpose reuse"
		mitigation: """
			The purpose field is required. A token issued for one recovery cannot be presented for a different one.

			"""
	}, {
		id:   "T4"
		name: "Structural leakage"
		mitigation: """
			No component may derive meaning from the token's contents.

			"""
	}]
	tests: [{
		given:  "a valid token binding and a well-formed raw value"
		expect: "constructed and frozen"
	}, {
		given:  "an empty raw value"
		expect: "rejected"
	}, {
		given:  "a value that fails the binding validate"
		expect: "rejected"
	}, {
		given:  "two tokens with same value and purpose"
		expect: "equal"
	}, {
		given:  "two tokens with same value but different purpose"
		expect: "not equal"
	}]
}
