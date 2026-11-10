package primitives
import "gcb.example/core/core/schema"

session: schema.#Primitive & {
	kind:    "primitive"
	id:      "session"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		An active, time-bounded authentication context. A Session is what survives between requests after an Assertion has been issued. It carries the Principal that owns it, the instant it was created, the instant it ceases to be valid, and the current lifecycle state.

		"""
	shape: {
		type: "record"
		fields: [{
			name:     "id"
			type:     "Identifier"
			required: true
		}, {
			name:     "principal"
			type:     "Principal"
			required: true
		}, {
			name:     "created_at"
			type:     "Timestamp"
			required: true
		}, {
			name:     "expires_at"
			type:     "Timestamp"
			required: true
		}, {
			name:     "state"
			type:     "session-state"
			required: true
			values: ["active", "expired", "revoked"]
		}]
	}
	invariants: [
		"A Session is identified by exactly one Identifier, stable for its lifetime.",
		"A Session carries exactly one Principal. The Principal is never replaced; a new Principal requires a new Session.",
		"expires_at is strictly greater than created_at. A Session with zero duration is invalid.",
		"A Session in state 'active' whose expires_at has passed is stale; readers must treat it as expired.",
		"State transitions are one-way: active → expired, active → revoked. Neither expired nor revoked returns to active.",
	]
	threats: [{
		id:   "T1"
		name: "Session fixation"
		mitigation: """
			Session ids originate from the auth flow, never from client input. The primitive cannot detect a fixed id on its own — enforcement is a composition concern — but the type requires the id to be supplied by the constructor, never synthesized by a caller.

			"""
	}, {
		id:   "T2"
		name: "Indefinite lifetime"
		mitigation: """
			expires_at is required and strictly greater than created_at. There is no fromRaw session with no expiry.

			"""
	}, {
		id:   "T3"
		name: "Resurrection after revocation"
		mitigation: """
			State is a closed union. There is no 'pending' or 'reactivated'. A revoked Session cannot be revived; a new Assertion produces a new Session.

			"""
	}, {
		id:   "T4"
		name: "Clock skew between issue and read"
		mitigation: """
			isExpired accepts an explicit 'now' argument. Callers cannot rely on an implicit clock. A session is expired by the caller's clock, not by the primitive's.

			"""
	}]
	tests: [{
		given:  "a session with expires_at > created_at and state 'active'"
		expect: "constructed successfully"
	}, {
		given:  "a session with expires_at <= created_at"
		expect: "rejected — zero or negative duration"
	}, {
		given:  "a session with an unknown state"
		expect: "rejected"
	}, {
		given:  "an active session whose expires_at is in the past"
		expect: "isExpired returns true for the given now"
	}, {
		given:  "an active session whose expires_at is in the future"
		expect: "isExpired returns false"
	}, {
		given:  "a revoked session whose expires_at is in the future"
		expect: "isExpired returns true — revoked is always expired for readers"
	}]
}
