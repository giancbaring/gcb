package validation
import "gcb.example/core/core/schema"

validateSession: schema.#Function & {
	kind:    "function"
	id:      "validate-session"
	version: "1.0.0"
	domain:  "identity"
	module:  "session/validation"
	api:     "session-management"
	description: """
		Given a Session, return the Principal it carries if the session is currently usable. A session is usable only when it is in state 'active' AND the current instant is strictly before expiresAt. Revoked, expired, and time-lapsed sessions all fail with EXPIRED.

		"""
	interface: {
		inputs: [{
			name: "session", type: "Session", required: true
		}, {
			name: "clock", type: "() => Timestamp", required: true
		}]
		outputs: [{type: "Result<Principal, AuthFailure>"}]
	}
	depends_on: primitives: [
		"result",
		"session",
		"principal",
		"timestamp",
		"auth-failure",
	]
	invariants: [
		"Never throws. All failures are Err.",
		"A session that is not usable is reported as EXPIRED, regardless of the underlying state.",
		"The returned Principal is the exact Principal the session carries. No reconstruction.",
		"The clock is supplied by the caller, never read from the environment.",
	]
	threats: [{
		id:   "T1"
		name: "Clock substitution"
		mitigation: """
			clock is a required argument. Tests pin it. The function never consults Date.now() directly.

			"""
	}, {
		id:   "T2"
		name: "Revoked sessions accepted"
		mitigation: """
			A revoked session fails isUsable, which reports EXPIRED. There is no path from a revoked session to an Ok Principal.

			"""
	}, {
		id:   "T3"
		name: "Expiry boundary ambiguity"
		mitigation: """
			Expiry is strict: now < expiresAt. A session at exactly expiresAt is expired. The boundary is fixed by the session primitive and asserted here.

			"""
	}, {
		id:   "T4"
		name: "Principal re-issuance"
		mitigation: """
			The Principal is read from the session, never reconstructed from its parts. Authority cannot drift between issuance and validation.

			"""
	}]
	bindings: "gms-governance": clock: "() => now()"
	tests: [{
		given:  "an active session whose expiresAt is in the future"
		expect: "Ok carrying the session's principal"
	}, {
		given:  "an active session whose expiresAt is in the past"
		expect: "Err EXPIRED"
	}, {
		given:  "an active session at exactly expiresAt"
		expect: "Err EXPIRED — the boundary is strict"
	}, {
		given:  "a revoked session"
		expect: "Err EXPIRED"
	}, {
		given:  "an expired session"
		expect: "Err EXPIRED"
	}, {
		given:  "the returned Principal"
		expect: "it is the exact Principal the session carries"
	}]
}
