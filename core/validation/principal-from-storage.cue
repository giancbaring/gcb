package validation
import "gcb.example/core/core/schema"

principalFromStorage: schema.#Function & {
	kind:    "function"
	id:      "principal-from-storage"
	version: "1.0.0"
	domain:  "foundation"
	module:  "persistence"
	api:     "storage-reconstruction"
	description: """
		Reconstruct a Principal from a raw storage record. A peer to subject-from-storage and session-from-storage. Validates every field and produces either a fully-formed Principal or a reason for rejection. Does not import from the authentication flow — the reconstruction is a foundational concern.

		"""
	interface: {
		inputs: [{name: "record", type: "PrincipalStorageRecord", required: true}]
		outputs: [{type: "Result<Principal, string>"}]
	}
	depends_on: primitives: [
		"result",
		"principal",
		"subject",
		"identifier",
		"timestamp",
	]
	invariants: [
		"Every field is validated. Missing or malformed values return Err.",
		"The result is either a fully-formed Principal or an error.",
		"Authority is copied into a fresh array and frozen.",
		"The reconstruction never imports from the authentication module.",
		"The function does not throw.",
		"Rejection reasons name the field.",
	]
	threats: [{
		id:   "T1"
		name: "Authentication-layer coupling"
		mitigation: """
			The function imports only from primitives. It does not import principalFromAssertion or anything in the authentication module. The dependency direction is foundation → storage, never the reverse.

			"""
	}, {
		id:   "T2"
		name: "Post-construction authority widening"
		mitigation: """
			The authority list is copied and frozen before Principal construction.

			"""
	}, {
		id:   "T3"
		name: "Attribute tampering"
		mitigation: """
			The subject is reconstructed through subject-from-storage, which copies and freezes attributes.

			"""
	}]
	tests: [{
		given:  "a well-formed record"
		expect: "Ok carrying a Principal with the record's fields"
	}, {
		given:  "a record missing sessionId"
		expect: "Err naming 'sessionId'"
	}, {
		given:  "a record with a non-numeric issuedAt"
		expect: "Err naming 'issuedAt'"
	}, {
		given:  "a record with a non-array authority"
		expect: "Err naming 'authority'"
	}, {
		given:  "a record with non-string authority entries"
		expect: "Err naming 'authority'"
	}, {
		given:  "a well-formed record"
		expect: "the returned Principal is frozen"
	}]
}
