package administration
import "gcb.example/core/core/schema"

changeRole: schema.#Composition & {
	kind:    "composition"
	id:      "change-role"
	version: "1.0.0"
	domain:  "identity"
	api:     "identity-administration"
	description: """
		Grant a new authority set to a subject. Requires the acting principal to carry the authority token "role:change". Every attempt — granted or denied — produces an auth event recorded through a supplied sink. The actual mutation of the target's authority is delegated to a caller-supplied RoleSink; this composition enforces the authorization and the audit trail, not the storage.

		"""
	interface: {
		inputs: [{
			name: "actor_principal", type: "Principal", required: true
		}, {
			name: "target_subject", type: "Subject", required: true
		}, {
			name: "new_authority", type: "readonly string[]", required: true
		}, {
			name: "role_sink", type: "RoleSink", required: true
		}, {
			name: "event_sink", type: "AuthEventSink", required: true
		}, {
			name: "clock", type: "() => Timestamp", required: true
		}]
		outputs: [{type: "Result<void, AuthzFailure>"}]
	}
	depends_on: {
		primitives: [
			"result",
			"principal",
			"subject",
			"actor",
			"auth-event",
			"outcome",
			"timestamp",
			"authz-failure",
		]
		compositions: [
			"authorize",
			"record-auth-event",
		]
	}
	invariants: [
		"The role sink is never invoked when authorization fails.",
		"A denied attempt still produces an auth event with outcome DENIED.",
		"A granted attempt produces an auth event with outcome SUCCESS after the role sink succeeds.",
		"If the audit sink fails, the composition returns Err INTERNAL rather than Ok. A success reported without a persisted audit event is a defect of the composition.",
		"If the role sink throws, an auth event with outcome ERROR is recorded before the error is returned.",
		"A missing principal returns Err NO_PRINCIPAL and records nothing — there is no actor to attribute the event to.",
		"The new_authority list is copied and frozen before it reaches the sink. A caller cannot mutate it after the call.",
		"Never throws. All failures are Err.",
	]
	threats: [{
		id:   "T1"
		name: "Role change without authorization"
		mitigation: """
			authorize is called first with the fixed token "role:change". A principal without it is refused before the sink is touched.

			"""
	}, {
		id:   "T2"
		name: "Silent privilege change"
		mitigation: """
			Every attempt is recorded. A change without an audit event cannot occur because both outcomes (grant and deny) are logged.

			"""
	}, {
		id:   "T3"
		name: "Authority list mutation"
		mitigation: """
			The new_authority list is copied and frozen. A caller that holds a reference cannot alter the target's authority after the call.

			"""
	}, {
		id:   "T4"
		name: "Sink failure masking"
		mitigation: """
			A throwing role sink returns Err INTERNAL and records an event with outcome ERROR, so the attempt is visible even when storage fails.

			"""
	}, {
		id:   "T5"
		name: "Self-elevation"
		mitigation: """
			The composition does not special-case actor versus target. A binding policy may forbid a subject from changing its own authority; the composition records the attempt either way.

			"""
	}]
	bindings: "gms-governance": {
		action_token: "role:change"
		role_sink:    "updates users.role_code via service-role client"
		event_sink:   "appends row to auth_events"
	}
	tests: [{
		given:  "a principal carrying role:change and a working role sink"
		expect: "Ok carrying void"
	}, {
		given:  "an authorized attempt"
		expect: "the role sink is called exactly once with the target subject and the frozen new authority"
	}, {
		given:  "an authorized attempt"
		expect: "a SUCCESS auth event is appended"
	}, {
		given:  "a principal lacking role:change"
		expect: "Err FORBIDDEN; role sink not called"
	}, {
		given:  "a denied attempt"
		expect: "a DENIED auth event is appended"
	}, {
		given:  "a missing principal"
		expect: "Err NO_PRINCIPAL; nothing recorded"
	}, {
		given:  "a role sink that throws"
		expect: "Err INTERNAL and an ERROR auth event"
	}, {
		given:  "any attempt"
		expect: "the new_authority list reaches the sink frozen"
	}]
}
