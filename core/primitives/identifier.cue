package primitives
import "gcb.example/core/core/schema"

identifier: schema.#Primitive & {
	kind:    "primitive"
	id:      "identifier"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		An opaque, stable reference to a subject within a namespace. The identifier is how a subject is named externally; it is not the subject itself, and it carries no meaning beyond uniqueness within its namespace. Format is a project binding, not a property of this primitive.

		"""
	shape: {
		type:       "branded-string"
		brand:      "Identifier"
		underlying: "string"
		namespace:  "required"
		properties: [{
			name:        "value"
			type:        "string"
			description: "The opaque string."
		}, {
			name:        "namespace"
			type:        "string"
			description: "The scope within which value is unique."
		}]
	}
	invariants: [
		"An identifier is unique within its namespace. Never duplicated.",
		"An identifier is stable — it does not change for the lifetime of its subject.",
		"An identifier is opaque — no component may parse meaning from its structure.",
		"Format validation is a binding concern, not an identifier concern.",
	]
	threats: [{
		id:   "T1"
		name: "Identifier enumeration"
		mitigation: """
			Format SHOULD be unguessable where exposure is a concern. Whether a format is guessable is a binding decision, not enforced here.

			"""
	}, {
		id:   "T2"
		name: "Cross-namespace collision"
		mitigation: """
			Namespace is a required field. Two identifiers with the same value in different namespaces are distinct by contract.

			"""
	}, {
		id:   "T3"
		name: "Structural leakage"
		mitigation: """
			No component may derive authority, role, or meaning from the format of an identifier. Consumers MUST treat it as an opaque token.

			"""
	}]
	bindings: {
		// Project-specific bindings declare the concrete format. The primitive
		// itself defines none.
		example: {
			namespace: "example-users"
			format:    "^[A-Z]{3}\\d{3}$"
			normalize: "uppercase"
			note:      "Illustrative only — real bindings live in the PSO."
		}
	}
	tests: [{
		given:  "two identifiers with same value, same namespace"
		expect: "equal — they refer to the same subject"
	}, {
		given:  "two identifiers with same value, different namespaces"
		expect: "not equal — namespaces are distinct scopes"
	}, {
		given:  "any identifier"
		expect: "value is unchanged after any read operation"
	}, {
		given:  "an identifier produced by a binding with normalize: uppercase"
		expect: "value is uppercase — normalization applied at construction"
	}]
}
