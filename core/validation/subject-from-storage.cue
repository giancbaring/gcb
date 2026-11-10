package validation
import "gcb.example/core/core/schema"

subjectFromStorage: schema.#Function & {
	kind:    "function"
	id:      "subject-from-storage"
	version: "1.0.0"
	domain:  "foundation"
	module:  "persistence"
	api:     "storage-reconstruction"
	description: """
		Reconstruct a Subject from a raw storage record. Storage layers return fields as untyped values. This function validates them and produces either a Subject or a reason for rejection. Missing or malformed fields become Err, never a partially-built subject.

		"""
	interface: {
		inputs: [{name: "record", type: "SubjectStorageRecord", required: true}]
		outputs: [{type: "Result<Subject, string>"}]
	}
	depends_on: primitives: [
		"result",
		"subject",
		"identifier",
	]
	invariants: [
		"Every field is validated. Missing or malformed values return Err.",
		"The result is either a fully-formed Subject or an error. No partial subjects.",
		"The function does not throw. Failures are returned as Err.",
		"Rejection reasons name the field, so a caller can log which one failed.",
		"Attributes are copied and frozen before they reach the Subject.",
	]
	threats: [{
		id:   "T1"
		name: "Silent acceptance of corrupt storage"
		mitigation: """
			Every field is checked before makeSubject is called.

			"""
	}, {
		id:   "T2"
		name: "Unknown subject kind from storage"
		mitigation: """
			The kind is validated against the closed set before construction.

			"""
	}, {
		id:   "T3"
		name: "Attribute tampering post-construction"
		mitigation: """
			Attributes are copied into a fresh object and frozen.

			"""
	}, {
		id:   "T4"
		name: "Identifier substitution"
		mitigation: """
			The identifier is validated as a non-empty string. No format checks are performed here — those belong to a binding.

			"""
	}]
	bindings: "gms-governance": source: "users table"
	tests: [{
		given:  "a complete, well-formed storage record"
		expect: "Ok carrying a Subject whose fields match the record"
	}, {
		given:  "a record missing the identifier"
		expect: "Err naming 'identifier'"
	}, {
		given:  "a record with an unknown kind"
		expect: "Err naming 'kind'"
	}, {
		given:  "a record with a missing kind"
		expect: "Err naming 'kind'"
	}, {
		given:  "a record with attributes as a non-object"
		expect: "Err naming 'attributes'"
	}, {
		given:  "a record with non-string attribute values"
		expect: "Err naming 'attributes'"
	}, {
		given:  "a record without attributes"
		expect: "Ok carrying a Subject with empty attributes"
	}, {
		given:  "a well-formed record"
		expect: "the returned Subject is frozen"
	}]
}
