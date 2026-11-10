package assertion
import "gcb.example/core/core/schema"

issueAssertion: schema.#Function & {
	kind:    "function"
	id:      "issue-assertion"
	version: "1.0.0"
	domain:  "identity"
	module:  "authentication/assertion"
	api:     "identity-authentication"
	description: """
		The terminal step of authentication. Given a verified Subject and the authority assigned to that subject in this context, produce an Assertion. The Assertion is the ticket that downstream systems use — nothing else may construct one.

		"""
	interface: {
		inputs: [{
			name: "subject", type: "Subject", required: true
		}, {
			name: "authority", type: "string[]", required: true
		}, {
			name: "session_id_gen", type: "IdGenerator", required: true
		}, {
			name: "clock", type: "() => Timestamp", required: true
		}]
		outputs: [{type: "Result<Assertion, AuthFailure>"}]
	}
	depends_on: primitives: [
		"result",
		"identifier",
		"subject",
		"assertion",
		"timestamp",
		"auth-failure",
	]
	invariants: [
		"The Assertion's subject matches the input subject exactly.",
		"The Assertion's issued_at is produced by the supplied clock, never by an implicit one.",
		"The Assertion's session_id is produced by the supplied generator, never by a counter or random call inside this function.",
		"Empty authority is permitted and produces an Assertion with no grants.",
		"Never throws. Failure is returned as Err.",
	]
	threats: [{
		id:   "T1"
		name: "Predictable session id"
		mitigation: """
			session_id_gen is supplied by the caller. The function does not generate ids itself, so a caller using a weak generator is visible at the call site rather than hidden here.

			"""
	}, {
		id:   "T2"
		name: "Hidden clock dependency"
		mitigation: """
			clock is a required argument. Tests supply a fixed clock; production supplies the real one. The function never reads Date.now() itself.

			"""
	}, {
		id:   "T3"
		name: "Authority injection"
		mitigation: """
			Authority is supplied by the verification flow, not by any request body. The function trusts its caller — the trust boundary is at the composition that calls this function.

			"""
	}, {
		id:   "T4"
		name: "IdGenerator failure"
		mitigation: """
			A throwing id generator is caught and mapped to INTERNAL. The failure does not escape as an exception.

			"""
	}]
	bindings: "gms-governance": {
		session_id_gen: "crypto.randomUUID() -> Identifier"
		clock:          "() => now()"
	}
	tests: [{
		given:  "a valid subject, authority, id generator, and clock"
		expect: "Ok carrying an Assertion with matching fields"
	}, {
		given:  "an empty authority list"
		expect: "Ok carrying an Assertion with no grants"
	}, {
		given:  "an id generator that throws"
		expect: "Err INTERNAL"
	}, {
		given:  "the Assertion produced"
		expect: "its issuedAt equals the value returned by the supplied clock"
	}, {
		given:  "the Assertion produced"
		expect: "its sessionId equals the value returned by the supplied generator"
	}, {
		given:  "the Assertion produced"
		expect: "it is frozen"
	}]
}
