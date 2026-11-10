package primitives
import "gcb.example/core/core/schema"

authEvent: schema.#Primitive & {
	kind:    "primitive"
	id:      "auth-event"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		A recorded fact that an authentication-related action was attempted or completed. An AuthEvent is the unit of the audit trail for identity operations. It binds an action name, the subject involved, the outcome, and the instant the event was recorded.

		"""
	shape: {
		type: "record"
		fields: [{
			name:     "action"
			type:     "closed-union"
			required: true
			values: ["login", "logout", "credential-change", "role-change", "session-issue", "session-revoke"]
		}, {
			name:     "subject"
			type:     "Subject"
			required: true
		}, {
			name:     "outcome"
			type:     "Outcome"
			required: true
		}, {
			name:     "occurred_at"
			type:     "Timestamp"
			required: true
		}, {
			name:     "detail"
			type:     "immutable-map<string, string>"
			required: false
			default: {}
		}]
	}
	invariants: [
		"An AuthEvent is immutable. Once recorded, it never changes.",
		"Every AuthEvent carries exactly one Subject, one Outcome, and one instant.",
		"The action set is closed. New actions require a versioned change.",
		"Detail is descriptive only. It MUST NOT contain credentials, secrets, or session tokens.",
		"AuthEvents are append-only. There is no update or delete operation.",
	]
	threats: [{
		id:   "T1"
		name: "Sensitive data in detail"
		mitigation: """
			Detail values are strings. The primitive cannot inspect them, but conventions forbid credentials, secrets, session ids, and IPs. A binding may add a validator; the primitive does not.

			"""
	}, {
		id:   "T2"
		name: "Event forgery"
		mitigation: """
			Production of AuthEvents is restricted to the auth flow and the audit layer. The primitive itself validates shape, not source.

			"""
	}, {
		id:   "T3"
		name: "Loss of ordering"
		mitigation: """
			occurred_at is required. Storage layers are responsible for preserving append order; the primitive does not guarantee monotonicity across hosts.

			"""
	}, {
		id:   "T4"
		name: "Mutation after recording"
		mitigation: """
			AuthEvent and its detail map are frozen at construction. A stored event that can be edited is not an audit trail.

			"""
	}, {
		id:   "T5"
		name: "Silent action failure"
		mitigation: """
			Every action produces exactly one AuthEvent, regardless of outcome. Recording SUCCESS only is a defect of the caller, not this primitive.

			"""
	}]
	bindings: "gms-governance": {
		actions: ["login", "logout", "credential-change", "role-change", "session-issue", "session-revoke"]
		storage: "append-only table with no UPDATE or DELETE policies"
	}
	tests: [{
		given:  "a well-formed event input"
		expect: "constructed and frozen"
	}, {
		given:  "an unknown action"
		expect: "rejected"
	}, {
		given:  "a missing subject"
		expect: "rejected"
	}, {
		given:  "an invalid outcome"
		expect: "rejected"
	}, {
		given:  "the detail map"
		expect: "frozen after construction"
	}, {
		given:  "two events with the same fields"
		expect: "structurally equivalent"
	}]
}
