package primitives
import "gcb.example/core/core/schema"

timestamp: schema.#Primitive & {
	kind:    "primitive"
	id:      "timestamp"
	version: "1.0.0"
	domain:  "foundation"
	description: """
		A point in time, represented unambiguously as an instant on the UTC timeline. Distinct from a wall-clock date or a duration. A Timestamp answers only one question: when, in absolute terms.

		"""
	shape: {
		type:       "branded-instant"
		brand:      "Timestamp"
		underlying: "number"
		unit:       "milliseconds-since-unix-epoch"
		timezone:   "UTC"
	}
	invariants: [
		"A Timestamp is an instant. It carries no timezone, no locale, no calendar.",
		"Comparison between two Timestamps is total and stable.",
		"A Timestamp never moves. Reading one does not change it.",
		"Arithmetic on a Timestamp requires an explicit Duration, never a bare number.",
	]
	threats: [{
		id:   "T1"
		name: "Timezone confusion"
		mitigation: """
			Timestamps carry no zone. Conversion to a local calendar is a presentation concern handled above this primitive.

			"""
	}, {
		id:   "T2"
		name: "Clock skew"
		mitigation: """
			This primitive does not guarantee monotonicity. Systems that require ordered events MUST use a separate sequence or logical clock.

			"""
	}, {
		id:   "T3"
		name: "Unit ambiguity"
		mitigation: """
			Unit is fixed at milliseconds-since-epoch. Seconds-based systems must convert at the boundary, not inside.

			"""
	}, {
		id:   "T4"
		name: "Implicit trust in local time"
		mitigation: """
			Constructors never read the system clock implicitly. Callers must supply the instant or call a named function that says so.

			"""
	}]
	tests: [{
		given:  "now()"
		expect: "returns a Timestamp greater than any previously constructed"
	}, {
		given:  "fromMillis(0)"
		expect: "represents 1970-01-01T00:00:00Z"
	}, {
		given:  "two Timestamps made from the same instant"
		expect: "equal"
	}, {
		given:  "timestamp + duration"
		expect: "returns a new Timestamp, original unchanged"
	}, {
		given:  "later.isAfter(earlier)"
		expect: "true"
	}]
}
