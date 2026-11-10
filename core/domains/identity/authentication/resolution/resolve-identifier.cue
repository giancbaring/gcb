package resolution
import "gcb.example/core/core/schema"

resolveIdentifier: schema.#Function & {
	kind:    "function"
	id:      "resolve-identifier"
	version: "1.0.0"
	domain:  "identity"
	module:  "authentication/resolution"
	api:     "identity-authentication"
	description: """
		Given an Identifier, return the Subject it refers to. Resolution is the first step of authentication: before a credential can be verified, the system must know which subject the credential is being presented for. Resolution is a lookup, not a validation — it does not verify anything about the caller.

		"""
	interface: {
		inputs: [{
			name: "identifier", type: "Identifier", required: true
		}, {
			name: "resolver", type: "Resolver", required: true
		}]
		outputs: [{type: "Result<Subject, AuthFailure>"}]
	}
	depends_on: primitives: [
		"result",
		"identifier",
		"subject",
		"auth-failure",
	]
	invariants: [
		"Resolution never throws. Failure is returned as Result.",
		"Failure for \"not found\" is UNKNOWN_SUBJECT, never a thrown error.",
		"The returned Subject MUST match the input Identifier.",
		"Resolution never reads a credential. It only resolves identity.",
	]
	threats: [{
		id:   "T1"
		name: "Enumeration via error differentiation"
		mitigation: """
			Unknown identifiers return UNKNOWN_SUBJECT. Callers MUST collapse this with MISMATCH at the presentation layer, per the auth-failure primitive's toUserMessage.

			"""
	}, {
		id:   "T2"
		name: "Resolver failure leaking internals"
		mitigation: """
			A resolver that throws is caught and mapped to INTERNAL. No raw error text is propagated.

			"""
	}, {
		id:   "T3"
		name: "Identifier substitution"
		mitigation: """
			The Subject's identifier field is asserted equal to the input identifier. A resolver that returns a mismatched subject causes the function to fail with INTERNAL.

			"""
	}]
	bindings: "gms-governance": resolver: "lookup users table by ukey, return Subject(identifier=ukey, kind=human)"
	tests: [{
		given:  "a resolver that returns a Subject for a known identifier"
		expect: "Ok carrying that Subject"
	}, {
		given:  "a resolver that returns null for an unknown identifier"
		expect: "Err UNKNOWN_SUBJECT"
	}, {
		given:  "a resolver that throws"
		expect: "Err INTERNAL; the throw does not escape"
	}, {
		given:  "a resolver that returns a Subject with a different identifier"
		expect: "Err INTERNAL"
	}]
}
