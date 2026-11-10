package authentication
import "gcb.example/core/core/schema"

authenticate: schema.#Composition & {
	kind:    "composition"
	id:      "authenticate"
	version: "1.0.0"
	domain:  "identity"
	api:     "identity-authentication"
	description: """
		The authentication use case, end to end. Given an identifier and a credential, resolve the subject, verify the credential against the stored secret, and issue an Assertion carrying the subject and the authority assigned in this context. This is the function a login endpoint invokes. It composes resolution, verification, and assertion issuance without adding new invariants of its own.

		"""
	interface: {
		inputs: [{
			name: "identifier", type: "Identifier", required: true
		}, {
			name: "credential", type: "Credential", required: true
		}, {
			name: "context", type: "AuthenticationContext", required: true
		}, {
			name: "comparator", type: "Comparator", required: true
		}, {
			name: "session_id_gen", type: "IdGenerator", required: true
		}, {
			name: "clock", type: "() => Timestamp", required: true
		}]
		outputs: [{type: "Result<Assertion, AuthFailure>"}]
	}
	depends_on: {
		primitives: [
			"result",
			"identifier",
			"credential",
			"secret",
			"subject",
			"assertion",
			"timestamp",
			"auth-failure",
		]
		functions: [
			"compare-secret",
			"issue-assertion",
		]
	}
	invariants: [
		"Never throws. All failures are returned as Err.",
		"The returned Assertion's subject is the subject resolved by the context.",
		"The returned Assertion's authority equals the authority the context supplies.",
		"Failure codes are preserved from the underlying step: UNKNOWN_SUBJECT, MISMATCH, INTERNAL.",
		"The credential never appears in the returned value or error.",
	]
	threats: [{
		id:   "T1"
		name: "Enumeration via differentiated failure"
		mitigation: """
			UNKNOWN_SUBJECT and MISMATCH are both returned. Collapsing them for a caller is a presentation concern (auth-failure.toUserMessage).

			"""
	}, {
		id:   "T2"
		name: "Credential leakage"
		mitigation: """
			The credential is passed to the comparator and never echoed. The Assertion carries no credential material.

			"""
	}, {
		id:   "T3"
		name: "Resolver failure leakage"
		mitigation: """
			A throwing resolver or comparator is caught and mapped to INTERNAL. No raw error text is propagated.

			"""
	}, {
		id:   "T4"
		name: "Hidden clock or id source"
		mitigation: """
			clock and session_id_gen are required arguments. The composition never reads an ambient clock or generates an id itself.

			"""
	}]
	bindings: "gms-governance": {
		context:        "resolves ukey -> { subject, secret, authority } from users table"
		comparator:     "constant-time hash-compare"
		session_id_gen: "crypto.randomUUID() -> Identifier"
		clock:          "() => now()"
	}
	tests: [{
		given:  "a valid identifier, matching credential, and working context"
		expect: "Ok carrying an Assertion"
	}, {
		given:  "the returned Assertion"
		expect: "its subject equals the context-resolved subject"
	}, {
		given:  "the returned Assertion"
		expect: "its authority equals the authority supplied by the context"
	}, {
		given:  "an unknown identifier"
		expect: "Err UNKNOWN_SUBJECT"
	}, {
		given:  "a valid identifier and a mismatching credential"
		expect: "Err MISMATCH"
	}, {
		given:  "a resolver that throws"
		expect: "Err INTERNAL"
	}, {
		given:  "a comparator that throws"
		expect: "Err INTERNAL"
	}, {
		given:  "a session id generator that throws"
		expect: "Err INTERNAL"
	}, {
		given:  "any failure"
		expect: "the credential is not present in the error"
	}]
}
