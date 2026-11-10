package schema

#Common: {
	id:          =~"^[a-z0-9]+(-[a-z0-9]+)*$"
	version:     =~"^[0-9]+\\.[0-9]+\\.[0-9]+$"
	domain:      "foundation" | "identity"
	description: string
	invariants:  [...string]
	threats:     [...#Threat]
	tests:       [...#Test]
	bindings?:   {[string]: _}
	...
}

#Threat: {
	id:         string
	name:       string
	mitigation: string
}

#Test: {
	given:  string
	expect: string
}

#Input: {
	name:     string
	type:     string
	required?: bool
}

#Output: { type: string }
#Interface: {
	inputs:  [...#Input]
	outputs: [...#Output]
}

#ShapeField: {
	name:     string
	type:     string
	required?: bool
	default?: _
	values?:  [...string]
}

#RecordShape: {
	type:   "record"
	fields: [...#ShapeField]
}
#ClosedUnionShape: {
	type:     "closed-union"
	variants: [...{id: string, meaning: string}]
}
#OpaqueShape: {
	type:        "opaque"
	carries:     string
	lifetime:    string
	persistence: string
}
#OpaqueStoredShape: {
	type:         "opaque-stored"
	carries:      string
	lifetime:     string
	persistence:  string
	storage_form: string
}
#BrandedStringShape: {
	type:       "branded-string"
	brand:      string
	underlying: string
	namespace?: string
	properties: [...{
		name:        string
		type:        string
		description?: string
	}]
}
#BrandedInstantShape: {
	type:       "branded-instant"
	brand:      string
	underlying: string
	unit:       string
	timezone:   string
}
#DiscriminatedUnionShape: {
	type:          "discriminated-union"
	discriminator: string
	variants: [...{
		name:                string
		discriminator_value: bool
		carries: [...{name: string, type: string}]
	}]
	type_parameters: [...{
		name:    string
		role:    string
		default?: string
	}]
}
#PrimitiveShape: #RecordShape | #ClosedUnionShape | #OpaqueShape |
	#OpaqueStoredShape | #BrandedStringShape | #BrandedInstantShape |
	#DiscriminatedUnionShape

#FunctionDependencies: {
	primitives: [...string]
	// The bucket name is a label, not a kind assertion; the resolver checks target kinds separately.
	functions?: [...string]
}
#CompositionDependencies: {
	primitives: [...string]
	// Bucket names are labels, not kind assertions; the resolver checks target kinds separately.
	functions?:    [...string]
	compositions?: [...string]
}

#Primitive: close(#Common & {
	kind:  "primitive"
	shape: #PrimitiveShape
})
#Callable: #Common & {
	api:       string
	module?:   string
	interface: #Interface
	...
}
#Function: close(#Callable & {
	kind:       "function"
	depends_on: #FunctionDependencies
})
#Composition: close(#Callable & {
	kind:       "composition"
	depends_on: #CompositionDependencies
})

#ModuleCommon: #Common & {
	kind:       "module"
	api:        string
	members:    [...string] // ids of contracts this module groups
	boundary:   string      // one-line statement of what this module owns
}

#Module: #ModuleCommon

#ApiCommon: #Common & {
	kind:    "api"
	surface: [...#SurfaceEntry]
	trust:   string // "public" | "internal" | "private"
}

#SurfaceEntry: {
	id:        string
	kind:      "function" | "composition" | "primitive"
	trust:     "public" | "internal"
	exposedAs?: string
}

#API: #ApiCommon