package primitives
import "gcb.example/core/core/schema"

idempotencyFailure: schema.#Primitive & {
	kind:    "primitive"
	id:      "idempotency-failure"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		A closed enumeration of the ways an idempotency-guarded operation may fail to complete. Distinct from AuthFailure, AuthzFailure, and RateLimitFailure — idempotency is its own concern with its own failure modes.

		"""
	shape: {
		type: "closed-union"
		variants: [{
			id: "IN_PROGRESS", meaning: "another execution with the same key is currently running"
		}, {
			id: "STORE_FAULT", meaning: "the idempotency store failed"
		}, {
			id: "INTERNAL", meaning: "an internal system fault occurred"
		}]
	}
	invariants: [
		"An IdempotencyFailure is exactly one of the declared variants.",
		"IN_PROGRESS is the correct response to a concurrent duplicate, not a system fault.",
		"STORE_FAULT and INTERNAL are distinct — the caller can distinguish store failures from library faults.",
		"The primitive carries no message. Presentation is separate.",
	]
	threats: [{
		id:   "T1"
		name: "Concurrent duplicate re-execution"
		mitigation: """
			IN_PROGRESS is a distinct variant. A caller that sees it knows another execution is in flight and can decide to wait, refuse, or surface a user-facing message.

			"""
	}, {
		id:   "T2"
		name: "Store failure masking a duplicate"
		mitigation: """
			STORE_FAULT is never returned as IN_PROGRESS. A faulted store does not fabricate the appearance of a concurrent execution.

			"""
	}, {
		id:   "T3"
		name: "Exception escape"
		mitigation: """
			No idempotency function throws an IdempotencyFailure. It is a value.

			"""
	}]
	tests: [{
		given:  "every declared variant"
		expect: "isIdempotencyFailure returns true"
	}, {
		given:  "an unknown string"
		expect: "isIdempotencyFailure returns false"
	}, {
		given:  "IN_PROGRESS and STORE_FAULT"
		expect: "they are distinct values"
	}, {
		given:  "the complete set"
		expect: "exactly three distinct values"
	}]
}
