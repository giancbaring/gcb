package primitives
import "gcb.example/core/core/schema"

outcome: schema.#Primitive & {
	kind:    "primitive"
	id:      "outcome"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		A closed classification of how an action or attempt resolved. An Outcome is not the action's result value — that is carried by Result. Outcome describes the disposition of the operation for the purposes of recording and reasoning: did it succeed, fail on its own terms, get refused, or fault?

		"""
	shape: {
		type: "closed-union"
		variants: [{
			id: "SUCCESS", meaning: "the operation completed as intended"
		}, {
			id: "FAILURE", meaning: "the operation ran but its own logic did not succeed"
		}, {
			id: "DENIED", meaning: "the operation was refused before execution, usually for authorization"
		}, {
			id: "ERROR", meaning: "the operation faulted; a system-level concern interrupted it"
		}]
	}
	invariants: [
		"An Outcome is exactly one of the declared variants. Never more, never fewer.",
		"The variants are closed. Adding one is a breaking change to every consumer.",
		"An Outcome carries no message, no reason, no payload. It is a classification only.",
		"DENIED is distinct from FAILURE. Refusal is not the same as failure of logic.",
	]
	threats: [{
		id:   "T1"
		name: "Denial confused with failure"
		mitigation: """
			DENIED and FAILURE are separate variants. A system that reports authorization refusals as FAILURE loses the ability to audit attempted abuse independently of legitimate logic failure.

			"""
	}, {
		id:   "T2"
		name: "Error hidden as failure"
		mitigation: """
			ERROR is distinct from FAILURE. Faults that are not the operation's own concern must be classified as ERROR so that operational alarms can be distinguished from business-logic misses.

			"""
	}, {
		id:   "T3"
		name: "Silent success"
		mitigation: """
			Every operation that produces an Outcome must record one. The audit layer enforces this at the composition, not at the primitive.

			"""
	}, {
		id:   "T4"
		name: "Free-form classification drift"
		mitigation: """
			The set is closed. A new classification requires changing the primitive, which is a versioned and reviewed action.

			"""
	}]
	tests: [{
		given:  "every declared variant"
		expect: "isOutcome returns true"
	}, {
		given:  "an unknown string"
		expect: "isOutcome returns false"
	}, {
		given:  "a non-string"
		expect: "isOutcome returns false"
	}, {
		given:  "the complete set of variants"
		expect: "exactly four distinct values"
	}]
}
