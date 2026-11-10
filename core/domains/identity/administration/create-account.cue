package administration
import "gcb.example/core/core/schema"

createAccount: schema.#Composition & {
	kind:    "composition"
	id:      "create-account"
	version: "1.0.0"
	domain:  "identity"
	api:     "identity-administration"
	description: """
		Provision a new account. Requires the acting principal to carry the authority token "user:create". The composition hashes the initial credential and asks a caller-supplied sink to persist the subject, the secret, and the initial authority together. It does not invent identifiers, generate credentials, or record its own events — every one of those is a caller concern.

		"""
	interface: {
		inputs: [{
			name: "actor_principal", type: "Principal", required: true
		}, {
			name: "target_subject", type: "Subject", required: true
		}, {
			name: "initial_credential", type: "Credential", required: true
		}, {
			name: "initial_authority", type: "readonly string[]", required: true
		}, {
			name: "account_sink", type: "AccountSink", required: true
		}, {
			name: "hasher", type: "Hasher", required: true
		}, {
			name: "clock", type: "() => Timestamp", required: true
		}]
		outputs: [{type: "Result<Subject, AuthzFailure>"}]
	}
	depends_on: {
		primitives: [
			"result",
			"principal",
			"subject",
			"credential",
			"secret",
			"timestamp",
			"authz-failure",
		]
		functions: ["hash-credential"]
		compositions: ["authorize"]
	}
	invariants: [
		"The account sink is never invoked when authorization fails.",
		"The initial credential is hashed before the sink sees it.",
		"The initial authority list is copied and frozen before reaching the sink.",
		"The target subject is returned unchanged on success.",
		"A missing principal returns Err NO_PRINCIPAL and does not touch the sink.",
		"An empty or malformed action token returns Err UNKNOWN_ACTION.",
		"Never throws. All failures are Err.",
	]
	threats: [{
		id:   "T1"
		name: "Unauthorized account creation"
		mitigation: """
			authorize is called first with the fixed token "user:create". A principal without it is refused before the credential is hashed or the sink is reached.

			"""
	}, {
		id:   "T2"
		name: "Plaintext credential at rest"
		mitigation: """
			The credential is hashed before the sink is called. The sink receives a Secret, never a Credential. A sink that persists a plaintext credential would have to do so explicitly — there is no path that passes one through.

			"""
	}, {
		id:   "T3"
		name: "Post-hoc authority widening"
		mitigation: """
			The initial authority list is copied and frozen. A caller who holds a reference cannot alter the created account's authority after the call.

			"""
	}, {
		id:   "T4"
		name: "Hasher fault producing a partial account"
		mitigation: """
			The account sink is invoked only after the hasher succeeds. A throwing hasher returns Err INTERNAL with no side effect.

			"""
	}, {
		id:   "T5"
		name: "Sink failure masking"
		mitigation: """
			A throwing sink returns Err INTERNAL. The composition does not swallow storage failures.

			"""
	}]
	bindings: "gms-governance": {
		action_token: "user:create"
		account_sink: "inserts into users and secrets tables in one transaction"
		hasher:       "argon2id"
	}
	tests: [{
		given:  "a principal carrying user:create and a working sink"
		expect: "Ok carrying the target subject"
	}, {
		given:  "an authorized attempt"
		expect: "the account sink is called exactly once"
	}, {
		given:  "an authorized attempt"
		expect: "the sink receives the subject, the hashed secret, and the frozen authority list"
	}, {
		given:  "a principal lacking user:create"
		expect: "Err FORBIDDEN; the sink is not called"
	}, {
		given:  "a missing principal"
		expect: "Err NO_PRINCIPAL; the sink is not called"
	}, {
		given:  "an empty action token"
		expect: "Err UNKNOWN_ACTION; the sink is not called"
	}, {
		given:  "a hasher that throws"
		expect: "Err INTERNAL; the sink is not called"
	}, {
		given:  "an account sink that throws"
		expect: "Err INTERNAL"
	}, {
		given:  "any failure"
		expect: "the credential does not appear in the returned error"
	}, {
		given:  "any call"
		expect: "the composition never throws"
	}]
}
