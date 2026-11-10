package session
import "gcb.example/core/core/schema"

refreshSession: schema.#Composition & {
	kind:    "composition"
	id:      "refresh-session"
	version: "1.0.0"
	domain:  "identity"
	api:     "session-management"
	description: """
		Extend an active session without re-authenticating. Verifies the current session is usable, then produces a new session with the same principal and a fresh expiry. The old session is left untouched — sessions are immutable. Callers may revoke the old one or discard it, depending on their policy. This is the "remember me" path: the caller remains authenticated while the credential is not re-presented.

		"""
	interface: {
		inputs: [{
			name: "session", type: "Session", required: true
		}, {
			name: "lifetime", type: "Duration", required: true
		}, {
			name: "clock", type: "() => Timestamp", required: true
		}]
		outputs: [{type: "Result<Session, AuthFailure>"}]
	}
	depends_on: {
		primitives: [
			"result",
			"session",
			"timestamp",
			"auth-failure",
		]
		functions: [
			"validate-session",
			"create-session",
		]
		compositions: [
		]
	}
	invariants: [
		"Refresh of a non-usable session fails with EXPIRED.",
		"The new session's principal is the exact principal of the old session.",
		"The new session's createdAt is produced by the supplied clock.",
		"The new session's id is derived from the old session's principal — never invented.",
		"The old session is never mutated.",
		"Lifetime must be strictly positive; zero or negative returns INTERNAL.",
		"Never throws. All failures are Err.",
	]
	threats: [{
		id:   "T1"
		name: "Refresh after revocation"
		mitigation: """
			validate-session is called first. A revoked or expired session fails with EXPIRED and no new session is created.

			"""
	}, {
		id:   "T2"
		name: "Principal drift across refresh"
		mitigation: """
			The new session carries the same principal object as the old session. Authority cannot change during refresh.

			"""
	}, {
		id:   "T3"
		name: "Session id reuse"
		mitigation: """
			The new session reuses the current session's id. A caller that expects rotation must supply a session-id generator — this composition does not rotate ids implicitly.

			"""
	}, {
		id:   "T4"
		name: "Silent clock substitution"
		mitigation: """
			clock is a required argument. The composition never reads the system clock directly.

			"""
	}]
	bindings: "gms-governance": {
		lifetime_default: "PT1H (3600 seconds)"
		clock:            "() => now()"
	}
	tests: [{
		given:  "an active, unexpired session and a positive lifetime"
		expect: "Ok carrying a new active session"
	}, {
		given:  "the returned session"
		expect: "its principal is the exact principal of the input"
	}, {
		given:  "the returned session"
		expect: "its id equals the input session's id"
	}, {
		given:  "the returned session"
		expect: "its createdAt equals the supplied clock value"
	}, {
		given:  "a revoked session"
		expect: "Err EXPIRED; no new session is produced"
	}, {
		given:  "an expired session"
		expect: "Err EXPIRED"
	}, {
		given:  "a zero lifetime"
		expect: "Err INTERNAL"
	}, {
		given:  "the input session"
		expect: "it is unchanged"
	}, {
		given:  "any input"
		expect: "the composition never throws"
	}]
}
