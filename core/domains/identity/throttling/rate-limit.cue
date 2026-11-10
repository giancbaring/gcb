package throttling
import "gcb.example/core/core/schema"

rateLimit: schema.#Composition & {
	kind:    "composition"
	id:      "rate-limit"
	version: "1.0.0"
	domain:  "identity"
	api:     "identity-throttling"
	description: """
		Atomically check and record a rate-limit key through a caller-supplied store. The composition keeps policy and storage outside the core and returns a closed failure code when the request is refused or the store fails.

		"""
	interface: {
		inputs: [{
			name: "key", type: "string", required: true
		}, {
			name: "policy", type: "RateLimitPolicy", required: true
		}, {
			name: "store", type: "RateLimitStore", required: true
		}, {
			name: "clock", type: "() => Timestamp", required: true
		}]
		outputs: [{type: "Promise<Result<void, RateLimitFailure>>"}]
	}
	depends_on: primitives: [
		"result",
		"timestamp",
		"rate-limit-failure",
	]
	invariants: [
		"The clock is invoked exactly once per call.",
		"The store checkAndRecord operation is invoked exactly once per call.",
		"The key and policy are passed to the store unchanged.",
		"An allowed store result returns Ok carrying void.",
		"A refused store result returns Err RATE_LIMITED.",
		"A throwing or rejecting store returns Err INTERNAL.",
		"The store is responsible for atomically checking and recording the key.",
		"The key is opaque to this composition and is not interpreted.",
		"The current implementation invokes clock before its store try/catch; clock is therefore a non-throwing binding requirement.",
	]
	threats: [{
		id:   "T1"
		name: "Rate-limit bypass"
		mitigation: """
			checkAndRecord is a single caller-supplied operation so the binding can perform the check and record atomically.

			"""
	}, {
		id:   "T2"
		name: "Policy confusion"
		mitigation: """
			The composition passes the policy through unchanged and does not reinterpret its limit or window.

			"""
	}, {
		id:   "T3"
		name: "Key disclosure"
		mitigation: """
			The key is opaque to this unit. Bindings decide how identifiers are transformed into storage keys.

			"""
	}, {
		id:   "T4"
		name: "Store exception escape"
		mitigation: """
			Synchronous and asynchronous store failures collapse to INTERNAL and are never thrown to the caller.

			"""
	}, {
		id:   "T5"
		name: "Failure-category confusion"
		mitigation: """
			A refusal is RATE_LIMITED, while a store failure is INTERNAL. The two closed codes remain distinct for callers and audit bindings.

			"""
	}]
	bindings: "gms-governance": {
		policy: "five attempts per fifteen minutes"
		store:  "atomic rate-limit counter with durable or distributed state"
	}
	tests: [{
		given:  "a store that allows the key"
		expect: "Ok carrying void"
	}, {
		given:  "a store that refuses the key"
		expect: "Err RATE_LIMITED"
	}, {
		given:  "a store that throws"
		expect: "Err INTERNAL, not RATE_LIMITED"
	}, {
		given:  "a store that rejects asynchronously"
		expect: "Err INTERNAL"
	}, {
		given:  "the two failure codes"
		expect: "RATE_LIMITED and INTERNAL are distinct"
	}, {
		given:  "a rate-limit call"
		expect: "the key is passed through unchanged"
	}, {
		given:  "a rate-limit call"
		expect: "the policy is passed through unchanged"
	}, {
		given:  "a rate-limit call"
		expect: "the clock is invoked exactly once"
	}, {
		given:  "valid inputs and handled store failures"
		expect: "the composition does not throw"
	}]
}
