package primitives

import "gcb.example/core/core/schema"

result: schema.#Primitive & {
	kind:    "primitive"
	id:      "result"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		A discriminated union representing the outcome of an operation that may succeed or fail. The universal return shape of every function in the GCB.

		"""
	shape: {
		type:          "discriminated-union"
		discriminator: "ok"
		variants: [{
			name:                "Ok"
			discriminator_value: true
			carries: [{
				name: "value"
				type: "T"
			}]
		}, {
			name:                "Err"
			discriminator_value: false
			carries: [{
				name: "error"
				type: "E"
			}]
		}]
		type_parameters: [{
			name: "T", role: "success payload", default: "void"
		}, {
			name: "E", role: "failure payload", default: "Error"
		}]
	}
	invariants: [
		"A Result is exactly one of Ok or Err. Never both. Never neither.",
		"Constructing an Err does not throw. Failure is a value, not an exception.",
		"Reading a Result never mutates it.",
	]
	threats: [{
		id:   "T1"
		name: "Silent failure swallowing"
		mitigation: """
			The error case is a first-class value. Ignoring it is explicit in code.

			"""
	}, {
		id:   "T2"
		name: "Exception-based control flow leakage"
		mitigation: """
			No function in the GCB throws for expected failure.

			"""
	}, {
		id:   "T3"
		name: "Null confusion"
		mitigation: """
			The discriminator determines success, not a null check.

			"""
	}, {
		id:   "T4"
		name: "Partial result leakage"
		mitigation: """
			A Result carries either a full value or a full error.

			"""
	}]
	tests: [{
		given:  "ok(42)"
		expect: "isOk true; value equals 42"
	}, {
		given:  "err('failed')"
		expect: "isErr true; error equals 'failed'"
	}, {
		given:  "ok(undefined)"
		expect: "isOk true — void success is valid"
	}, {
		given:  "unwrap(err(new Error('boom')))"
		expect: "throws the contained error"
	}, {
		given:  "unwrapOr(err('x'), 0)"
		expect: "returns 0"
	}]
}
