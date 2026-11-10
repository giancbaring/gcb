package primitives

import "gcb.example/core/core/schema"

subject: schema.#Primitive & {
	kind:    "primitive"
	id:      "subject"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		The entity being identified, authenticated, or acted upon. A Subject is what an Identifier points at and what a Principal is built from. It is the noun of identity — the person, service, or device that the system reasons about.

		"""
	shape: {
		type: "record"
		fields: [{
			name:     "identifier"
			type:     "Identifier"
			required: true
		}, {
			name:     "kind"
			type:     "subject-kind"
			required: true
			values: ["human", "service", "device", "system"]
		}, {
			name:     "attributes"
			type:     "immutable-map<string, string>"
			required: false
			default: {}
		}]
	}
	invariants: [
		"A Subject is identified by exactly one Identifier.",
		"The kind of a Subject never changes for the lifetime of that Subject.",
		"Attributes are opaque key-value metadata. No attribute grants authority.",
		"Two Subjects with the same Identifier and kind are the same Subject.",
	]
	threats: [{
		id:   "T1"
		name: "Kind confusion"
		mitigation: """
			Kind is a closed set. A caller cannot construct a Subject with an unknown kind. Type system and runtime both enforce the union.

			"""
	}, {
		id:   "T2"
		name: "Attribute escalation"
		mitigation: """
			Attributes are descriptive only. No function in the GCB may read an attribute to make an authorization decision. Authority comes from Principal, never from Subject.

			"""
	}, {
		id:   "T3"
		name: "Subject mutation"
		mitigation: """
			Subject and its attributes are frozen at construction. A changed attribute produces a new Subject, making the change visible.

			"""
	}, {
		id:   "T4"
		name: "Orphaned reference"
		mitigation: """
			Subject carries the full Identifier. A Subject is never a bare string that must be looked up elsewhere.

			"""
	}]
	bindings: {
		"gms-user": {
			identifier_namespace: "gms-users"
			kinds: ["human"]
		}
		"service-account": {
			identifier_namespace: "services"
			kinds: ["service"]
		}
	}
	tests: [{
		given:  "a Subject with kind human and a valid identifier"
		expect: "constructed successfully"
	}, {
		given:  "a Subject with an unknown kind"
		expect: "rejected — kind must be in the closed set"
	}, {
		given:  "two Subjects with same identifier and kind"
		expect: "structurally equal"
	}, {
		given:  "attempt to mutate subject.attributes"
		expect: "no effect — frozen"
	}, {
		given:  "a Subject with empty attributes"
		expect: "constructed successfully"
	}]
}
