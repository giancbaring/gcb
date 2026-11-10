package credentials
import "gcb.example/core/core/schema"

changeCredential: schema.#Composition & {
	kind:    "composition"
	id:      "change-credential"
	version: "1.0.0"
	domain:  "identity"
	module:  "credentials"
	api:     "credential-management"
	description: """
		Replace a subject's stored secret with a new one, after verifying the old credential. This is the flow for password change: verify what the caller knows, then store what they want instead. Composes verification and hashing. Persists nothing itself — the caller supplies the sink that writes the new secret.

		"""
	interface: {
		inputs: [{
			name: "identifier", type: "Identifier", required: true
		}, {
			name: "old_credential", type: "Credential", required: true
		}, {
			name: "new_credential", type: "Credential", required: true
		}, {
			name: "context", type: "ChangeContext", required: true
		}, {
			name: "comparator", type: "Comparator", required: true
		}, {
			name: "hasher", type: "Hasher", required: true
		}]
		outputs: [{type: "Result<void, AuthFailure>"}]
	}
	depends_on: {
		primitives: [
			"result",
			"identifier",
			"credential",
			"secret",
			"subject",
			"auth-failure",
		]
		functions: [
			"compare-secret",
			"hash-credential",
		]
	}
	invariants: [
		"The new secret is hashed before any write reaches the sink.",
		"The old credential is verified before the new one is hashed.",
		"Neither credential appears in the returned value or error.",
		"A sink failure is Err INTERNAL. Nothing is swallowed.",
		"Never throws. All failures are Err.",
	]
	threats: [{
		id:   "T1"
		name: "Credential change without verification"
		mitigation: """
			compare-secret is called on the Ok branch of resolution before any hash or write occurs. A caller without the old credential cannot reach the write path.

			"""
	}, {
		id:   "T2"
		name: "Partial write"
		mitigation: """
			The composition verifies and hashes in full before invoking the sink. The sink receives one record. There is no two-step write.

			"""
	}, {
		id:   "T3"
		name: "Credential leakage via error"
		mitigation: """
			Neither credential appears in any returned value. Errors carry only AuthFailure codes.

			"""
	}, {
		id:   "T4"
		name: "Reuse of the new secret on failure"
		mitigation: """
			On any failure, the hashed Secret is discarded. No reference to it escapes the composition.

			"""
	}]
	bindings: "gms-governance": {
		context:    "resolves ukey -> { subject, secret } from users table"
		sink:       "updates users.password_hash via service-role client"
		comparator: "constant-time hash-compare"
		hasher:     "argon2id"
	}
	tests: [{
		given:  "a valid old credential and a working context"
		expect: "Ok carrying void"
	}, {
		given:  "the sink is called exactly once"
		expect: "with the hashed new secret"
	}, {
		given:  "an unknown identifier"
		expect: "Err UNKNOWN_SUBJECT; sink not called"
	}, {
		given:  "a mismatching old credential"
		expect: "Err MISMATCH; sink not called"
	}, {
		given:  "a hasher that throws"
		expect: "Err INTERNAL; sink not called"
	}, {
		given:  "a sink that throws"
		expect: "Err INTERNAL"
	}, {
		given:  "any failure"
		expect: "neither credential appears in the error"
	}]
}
