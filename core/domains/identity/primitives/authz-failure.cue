package primitives
import "gcb.example/core/core/schema"

authzFailure: schema.#Primitive & {
	kind:    "primitive"
	id:      "authz-failure"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		A closed enumeration of the ways an authorization decision may fail. Every authorization function returns Result<T, AuthzFailure>. Distinct from AuthFailure: authentication asks who the caller is; authorization asks what they may do. Conflating the two makes audit trails ambiguous.

		"""
	shape: {
		type: "closed-union"
		variants: [{
			id: "FORBIDDEN", meaning: "principal lacks the required authority"
		}, {
			id: "UNKNOWN_ACTION", meaning: "the requested action token is malformed or empty"
		}, {
			id: "NO_PRINCIPAL", meaning: "no principal was supplied to the decision"
		}, {
			id: "INTERNAL", meaning: "a system fault prevented the decision"
		}]
	}
	invariants: [
		"An AuthzFailure is exactly one of the declared variants.",
		"The variants are closed. Adding one is a breaking change.",
		"FORBIDDEN is the expected outcome of a legitimate denial — not a system fault.",
		"An AuthzFailure carries no message. Presentation is a separate concern.",
	]
	threats: [{
		id:   "T1"
		name: "Denial logged as system fault"
		mitigation: """
			FORBIDDEN is distinct from INTERNAL. Monitoring systems can alert on INTERNAL without firing on every legitimate denial.

			"""
	}, {
		id:   "T2"
		name: "Privilege probing masked by generic errors"
		mitigation: """
			FORBIDDEN is a specific, stable code. A sequence of FORBIDDEN events from one principal is visible in audit and can be rate-limited or escalated.

			"""
	}, {
		id:   "T3"
		name: "Error detail leakage to the caller"
		mitigation: """
			The primitive carries no message. Callers who present to users must supply their own text; the underlying code is not disclosed.

			"""
	}, {
		id:   "T4"
		name: "Exception escape"
		mitigation: """
			No authorization function throws an AuthzFailure. It is a value. A thrown exception in the authz path is a defect.

			"""
	}]
	bindings: "gms-governance": presentation: {
		FORBIDDEN: "You do not have permission to perform this action."
		default:   "The action could not be completed."
	}
	tests: [{
		given:  "every declared variant"
		expect: "isAuthzFailure returns true"
	}, {
		given:  "an unknown string"
		expect: "isAuthzFailure returns false"
	}, {
		given:  "a non-string"
		expect: "isAuthzFailure returns false"
	}, {
		given:  "FORBIDDEN and INTERNAL"
		expect: "they are distinct values"
	}, {
		given:  "the complete set"
		expect: "exactly four distinct values"
	}]
}
