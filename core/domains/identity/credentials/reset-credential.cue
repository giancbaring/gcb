package credentials
import "gcb.example/core/core/schema"

resetCredential: schema.#Composition & {
	kind:    "composition"
	id:      "reset-credential"
	version: "1.0.0"
	domain:  "identity"
	api:     "credential-management"
	description: """
		Replace a subject's credential using a one-time reset token instead of the old credential. The token is consumed atomically by a caller-supplied store; consumption happens before the credential is hashed so that an attacker cannot drive CPU cost by submitting arbitrary tokens. On success, the new credential is hashed and written through a sink, and an auth event is recorded. Session revocation is the caller's concern and is not performed here.

		"""
	interface: {
		inputs: [{
			name: "token", type: "KeyedResetToken", required: true
		}, {
			name: "new_credential", type: "Credential", required: true
		}, {
			name: "token_store", type: "ResetTokenStore", required: true
		}, {
			name: "credential_sink", type: "CredentialSink", required: true
		}, {
			name: "event_sink", type: "AuthEventSink", required: true
		}, {
			name: "hasher", type: "Hasher", required: true
		}, {
			name: "clock", type: "() => Timestamp", required: true
		}]
		outputs: [{type: "Result<void, AuthFailure>"}]
	}
	depends_on: {
		primitives: [
			"result",
			"credential",
			"secret",
			"reset-token",
			"subject",
			"timestamp",
			"auth-failure",
			"auth-event",
			"outcome",
			"actor",
		]
		functions: ["hash-credential"]
	}
	invariants: [
		"The token is consumed before the credential is hashed.",
		"The credential sink is never invoked when token consumption fails.",
		"The token's purpose must match the purpose the composition expects.",
		"A consumed token produces at most one credential write.",
		"Every successful reset records a SUCCESS auth event.",
		"Every consumed-but-failed reset records an ERROR auth event.",
		"If the audit sink fails, the composition returns Err INTERNAL rather than Ok. A success reported without a persisted audit event is a defect of the composition.",
		"The credential and the token never appear in any returned value.",
		"Never throws.",
	]
	threats: [{
		id:   "T1"
		name: "Token enumeration driving CPU cost"
		mitigation: """
			Consumption precedes hashing. An attacker submitting invalid tokens pays only the cost of a token lookup, not a hash. Argon2id with recommended parameters is deliberately expensive; hashing attacker-chosen inputs is a DoS vector.

			"""
	}, {
		id:   "T2"
		name: "Token replay"
		mitigation: """
			Consumption is atomic at the store. A token presented a second time does not resolve.

			"""
	}, {
		id:   "T3"
		name: "Lost token on partial failure"
		mitigation: """
			Consumption precedes hashing. If hashing fails, the token has been spent and the caller must issue a new one. This is the accepted trade — the caller decides when to spend.

			"""
	}, {
		id:   "T4"
		name: "Cross-purpose token use"
		mitigation: """
			The composition asserts the token's purpose matches the fixed value 'password-reset'. A token issued for a different purpose is refused before consumption.

			"""
	}, {
		id:   "T5"
		name: "Silent credential reset"
		mitigation: """
			Every successful reset records an auth event. An admin who suspects an account was compromised can audit for resets.

			"""
	}]
	bindings: "gms-governance": {
		purpose:         "password-reset"
		token_store:     "postgres: SELECT ... FOR UPDATE, mark consumed_at, RETURNING subject"
		credential_sink: "updates users.password_hash via service-role client"
	}
	tests: [{
		given:  "a valid token and a working store"
		expect: "Ok carrying void"
	}, {
		given:  "a valid token"
		expect: "the credential sink is called exactly once with the hashed new credential"
	}, {
		given:  "a valid token"
		expect: "a SUCCESS auth event is recorded"
	}, {
		given:  "an unknown token"
		expect: "Err UNKNOWN_SUBJECT; the sink is not called"
	}, {
		given:  "an expired token"
		expect: "Err EXPIRED; the sink is not called"
	}, {
		given:  "a token whose purpose does not match the composition's expectation"
		expect: "Err MISMATCH; the store is not consulted"
	}, {
		given:  "an already-consumed token"
		expect: "Err EXPIRED; the sink is not called"
	}, {
		given:  "a hasher that throws after the token was consumed"
		expect: "Err INTERNAL; an ERROR auth event is recorded"
	}, {
		given:  "a sink that throws"
		expect: "Err INTERNAL; the exception does not escape"
	}, {
		given:  "any failure"
		expect: "the credential and token do not appear in the returned error"
	}]
}
