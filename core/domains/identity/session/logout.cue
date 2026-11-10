package session

import "gcb.example/core/core/schema"

logout: schema.#Composition & {
	kind:    "composition"
	id:      "logout"
	version: "1.0.0"
	domain:  "identity"
	api:     "session-management"
	description: """
		Terminate an active session. Produces a revoked copy of the session and returns it. The caller is responsible for persisting the revoked state and for recording the corresponding auth event. This is the symmetric counterpart to login.

		"""
	interface: {
		inputs: [{name: "session", type: "Session", required: true}]
		outputs: [{type: "Session"}]
	}
	depends_on: primitives: ["session"]
	invariants: [
		"The returned session is in state 'revoked'.",
		"The input session is unchanged — sessions are immutable.",
		"All other fields (id, principal, createdAt, expiresAt) are preserved exactly.",
		"Logout is idempotent: revoking an already-revoked session returns a revoked session.",
		"This composition never fails. It has no failure mode.",
	]
	threats: [{
		id:   "T1"
		name: "Session resurrection"
		mitigation: """
			The returned session is revoked. A revoked session fails validate-session with EXPIRED. There is no path back to 'active'.

			"""
	}, {
		id:   "T2"
		name: "Mutation of the input"
		mitigation: """
			revoke produces a new frozen object. The original session is unchanged at the call site.

			"""
	}, {
		id:   "T3"
		name: "Silent persistence failure"
		mitigation: """
			Logout returns the revoked session. It does not persist anything. Persistence is the caller's concern and must be observable.

			"""
	}]
	tests: [{
		given:  "an active session"
		expect: "the returned session is in state 'revoked'"
	}, {
		given:  "an active session"
		expect: "the input session is unchanged"
	}, {
		given:  "the returned session"
		expect: "all fields other than state match the input"
	}, {
		given:  "an already-revoked session"
		expect: "the returned session is in state 'revoked'"
	}, {
		given:  "any session"
		expect: "logout never throws"
	}]
}
