# GCB CUE Migration Plan

**Scope:** Plan only. No contract conversion, parser work, or `native/ts/` edits are part of this document.

## 1. Field Inventory

The inventory covers all 45 files read under `core/`: 18 primitives (`P`), 24 identity contracts (`I`), and 3 validation contracts (`V`). In the table, `NP` means all 27 non-primitives (`I + V`), `All` means `P + I + V`, and `Module set` is the exact 16-file set listed below. These abbreviations identify the full file set, not samples.

| YAML field | Files using it | Requiredness in current files | Current value shape |
|---|---|---|---|
| `kind` | All | Required | String; values are `primitive`, `function`, or `composition`. |
| `id` | All | Required | Kebab-case string; unique in the current inventory. |
| `version` | All | Required | Semver-form string; every current value is `1.0.0`. |
| `domain` | All | Required | String; current values are `foundation` and `identity`. |
| `module` | Module set | Optional; present in 16 files | String module/path label. It appears on functions and once on a composition (`change-credential`). |
| `api` | NP | Required on all 27 non-primitives | String API/category label. It is metadata, not a `kind`. |
| `description` | All | Required | Folded YAML scalar; prose string. |
| `shape` | `core/primitives/*.yaml` (18 files) | Required for `primitive`; absent from NP | Mapping, with seven observed `type` values and several nested layouts; see structural variations. |
| `interface` | NP | Required for all 27 non-primitives; absent from primitives | Mapping with `inputs` and `outputs` lists. Inputs are records; outputs are records containing a `type` string. |
| `depends_on` | NP | Required in all 27 non-primitives; absent from primitives | Mapping with one or more of `primitives`, `functions`, `compositions`; each value is a list of contract ID strings. |
| `invariants` | All | Required | List of prose strings. |
| `threats` | All | Required | List of `{id, name, mitigation}` records; mitigation is prose. |
| `bindings` | 35 files: all except the ten named below | Optional | Open-ended mapping. Binding labels and payload shapes vary by project and contract; see §3 and §8. |
| `tests` | All | Required | List of `{given, expect}` records; both values are prose strings. |

`Module set` (exact):

- `core/identity/authentication/assertion/assertion-freshness.yaml`
- `core/identity/authentication/assertion/issue-assertion.yaml`
- `core/identity/authentication/resolution/resolve-identifier.yaml`
- `core/identity/authentication/verification/compare-secret.yaml`
- `core/identity/authentication/verification/verify-credential.yaml`
- `core/identity/authorization/permission-check.yaml`
- `core/identity/authorization/require-authority.yaml`
- `core/identity/credentials/change-credential.yaml`
- `core/identity/credentials/hash-credential.yaml`
- `core/identity/session/establishment/create-session.yaml`
- `core/identity/session/persistence/session-from-storage.yaml`
- `core/identity/session/persistence/session-to-storage.yaml`
- `core/identity/session/validation/validate-session.yaml`
- `core/validation/principal-from-storage.yaml`
- `core/validation/subject-from-storage.yaml`
- `core/validation/validate-input.yaml`

`bindings` is absent from exactly these ten files: `core/identity/session/logout.yaml`, `core/primitives/assertion.yaml`, `core/primitives/idempotency-failure.yaml`, `core/primitives/outcome.yaml`, `core/primitives/rate-limit-failure.yaml`, `core/primitives/reset-token.yaml`, `core/primitives/result.yaml`, `core/primitives/session.yaml`, `core/primitives/timestamp.yaml`, and `core/validation/principal-from-storage.yaml`. Keep these fields absent in CUE; do not fill them with empty maps.

## 2. CUE Schema Design

### Kinds present

The five conceptual GCB kinds are `primitive`, `function`, `module`, `api`, and `composition`. Only three occur as `kind:` values in `core/`: **`primitive` (18), `function` (15), and `composition` (12)**. `module` and `api` occur only as category metadata (`module:` and `api:`), not as kinds. Do not add definitions that classify any current file as kind `module` or `api`.

Create a shared schema package (planned at `core/schema/contract.cue`) and have every contract value unify with the matching definition. The following is the schema design; CUE formatting/import aliases can be adjusted during implementation, but the field constraints and optionality must remain as shown.

```cue
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
        name:               string
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
    functions?: [...string]
}
#CompositionDependencies: {
    primitives:   [...string]
    functions?:   [...string]
    compositions?: [...string]
}

#Primitive: #Common & {
    kind:  "primitive"
    shape: #PrimitiveShape
}
#Callable: #Common & {
    api:       string
    module?:   string
    interface: #Interface
}
#Function: #Callable & {
    kind:       "function"
    depends_on: #FunctionDependencies
}
#Composition: #Callable & {
    kind:       "composition"
    depends_on: #CompositionDependencies
}
```

The definitions intentionally validate the serialized contract structure. They do not reinterpret prose or claim that a type expression written as a string is a checked CUE type. Keep the current type strings (for example, `Result<Session, AuthFailure>` and `() => Timestamp`) intact.

### `depends_on`

- Function contracts use `depends_on.primitives` and, where present, `depends_on.functions`.
- Composition contracts use `depends_on.primitives`, and optionally `depends_on.functions` and `depends_on.compositions`.
- Preserve the YAML bucket as written during migration. The CUE schema above validates the bucket's list-of-string shape, not that the referenced target has the corresponding `kind`. Three current bucket/type mismatches are recorded in §8.

### `tests` and `threats`

Represent `tests` as a list of closed `{given: string, expect: string}` records. Represent `threats` as a list of closed `{id: string, name: string, mitigation: string}` records. Preserve list order and exact text. These constraints validate structure only; they do not execute tests or prove mitigations.

### Open-ended bindings

Represent `bindings` as optional `{[string]: _}`. This explicitly permits arbitrary binding names and arbitrary nested project-specific values, while requiring the top-level value to be a mapping. Do not enumerate only `gms-governance`, `example`, `password`, or other current keys as a closed schema: that would reject the existing extension pattern. Do not add bindings where the YAML omits the field.

## 3. Mapping Table

Each row gives the CUE field/constraint that replaces the YAML field. Nested rows make the mapping for collection members explicit. Definitions refer to the schema in §2.

| YAML field | CUE expression / representation |
|---|---|
| `kind` | `kind: "primitive"` in `#Primitive`; `kind: "function"` in `#Function`; `kind: "composition"` in `#Composition`. |
| `id` | `id: string` constrained by `#Common.id` to the current kebab-case format; preserve the exact ID value. |
| `version` | `version: string` constrained by `#Common.version`; preserve `1.0.0` values. |
| `domain` | `domain: "foundation" \| "identity"`; preserve exact value. |
| `module` | `module?: string` in `#Callable`; absent when not in YAML. |
| `api` | `api: string` in `#Callable`; required on each non-primitive. |
| `description` | `description: string`; preserve folded text content. |
| `shape` | `shape: #PrimitiveShape`; dispatch on existing `shape.type` to one of the seven definitions in §2. |
| `interface` | `interface: #Interface`; required on function and composition contracts. |
| `interface.inputs` | `inputs: [...#Input]`; preserve order. |
| `interface.inputs[].name` | `name: string`. |
| `interface.inputs[].type` | `type: string`; preserve existing type-expression text literally. |
| `interface.inputs[].required` | `required?: bool`; preserve `true`/`false`; do not synthesize it for the one input where it is omitted (`record-auth-event`'s `detail`). |
| `interface.outputs` | `outputs: [...#Output]`; preserve order. |
| `interface.outputs[].type` | `type: string`; preserve direct and `Result<...>` output strings. |
| `depends_on` | `depends_on: #FunctionDependencies` for functions; `depends_on: #CompositionDependencies` for compositions. |
| `depends_on.primitives` | `primitives: [...string]`. |
| `depends_on.functions` | `functions?: [...string]`, in the kinds where present. |
| `depends_on.compositions` | `compositions?: [...string]`, composition dependency list. |
| `invariants` | `invariants: [...string]`; preserve order and prose verbatim. |
| `threats` | `threats: [...#Threat]`; preserve order. |
| `threats[].id` | `id: string`. |
| `threats[].name` | `name: string`. |
| `threats[].mitigation` | `mitigation: string`; preserve folded prose content. |
| `bindings` | `bindings?: {[string]: _}`; open mapping, only present where the YAML field is present. |
| `tests` | `tests: [...#Test]`; preserve order. |
| `tests[].given` | `given: string`. |
| `tests[].expect` | `expect: string`. |

No extra contract fields are to be added. Package-internal CUE labels used to name individual values are implementation scaffolding only; they are not emitted as YAML-equivalent contract fields.

## 4. Migration Sequence

For each listed source, create the corresponding `.cue` file at the same relative path (replace `.yaml` with `.cue`). Keep YAML sources available until the parity and validation gates in §7 pass; remove them only in the actual migration's agreed cutover, not during this planning task.

### Pilot: schema coverage before bulk conversion

1. `core/primitives/result.yaml` — discriminated union, generic parameters, nested variants.
2. `core/primitives/subject.yaml` — record shape, optional/defaulted field, enum values, typed map expression, nested binding data.
3. `core/primitives/credential.yaml` — opaque shape and heterogeneous binding examples.

Convert and validate these as a pilot, then freeze the shared schema before continuing. These three are deliberate shape/binding coverage, not model redesign.

### Remaining primitives

Convert all remaining primitive leaves before contracts that depend on them, in this order:

1. `core/primitives/actor.yaml`
2. `core/primitives/assertion.yaml`
3. `core/primitives/auth-event.yaml`
4. `core/primitives/auth-failure.yaml`
5. `core/primitives/authz-failure.yaml`
6. `core/primitives/idempotency-failure.yaml`
7. `core/primitives/idempotency-key.yaml`
8. `core/primitives/identifier.yaml`
9. `core/primitives/outcome.yaml`
10. `core/primitives/principal.yaml`
11. `core/primitives/rate-limit-failure.yaml`
12. `core/primitives/reset-token.yaml`
13. `core/primitives/secret.yaml`
14. `core/primitives/session.yaml`
15. `core/primitives/timestamp.yaml`

### Primitive-only functions

Convert these after the primitive set; they have no `depends_on.functions` references:

1. `core/identity/authentication/assertion/assertion-freshness.yaml`
2. `core/identity/authentication/assertion/issue-assertion.yaml`
3. `core/identity/authentication/resolution/resolve-identifier.yaml`
4. `core/identity/authentication/verification/compare-secret.yaml`
5. `core/identity/authorization/permission-check.yaml`
6. `core/identity/credentials/hash-credential.yaml`
7. `core/identity/session/establishment/create-session.yaml`
8. `core/identity/session/persistence/session-from-storage.yaml`
9. `core/identity/session/persistence/session-to-storage.yaml`
10. `core/identity/session/validation/validate-session.yaml`
11. `core/validation/principal-from-storage.yaml`
12. `core/validation/subject-from-storage.yaml`
13. `core/validation/validate-input.yaml`

Then convert function dependents:

14. `core/identity/authentication/verification/verify-credential.yaml` — depends on `compare-secret`.
15. `core/identity/authorization/require-authority.yaml` — its YAML bucket names `authorize` under `compositions`, so convert it after `authorize` below despite its own `kind: function`.

### Primitive-only compositions and authorization base

Convert these after their primitive/function dependencies:

1. `core/identity/throttling/rate-limit.yaml`
2. `core/identity/session/logout.yaml`
3. `core/identity/observability/record-auth-event.yaml`
4. `core/identity/authorization/authorize.yaml` — depends on `permission-check`; after this, convert `require-authority` from the preceding group.

### Remaining compositions

Convert in dependency order:

1. `core/identity/authentication/authenticate.yaml` — `compare-secret`, `issue-assertion`.
2. `core/identity/credentials/change-credential.yaml` — `compare-secret`, `hash-credential`.
3. `core/identity/administration/create-account.yaml` — `hash-credential`, `authorize`.
4. `core/identity/credentials/reset-credential.yaml` — `hash-credential`.
5. `core/identity/session/refresh-session.yaml` — `validate-session`, `create-session` (declared under `compositions` in YAML, although both targets are functions).
6. `core/identity/authentication/login.yaml` — `authenticate`, `create-session`.
7. `core/identity/authentication/attempt-login.yaml` — `authenticate`, `create-session`, `rate-limit`, `record-auth-event` (`create-session` is likewise bucketed as a composition in YAML).
8. `core/identity/administration/change-role.yaml` — `authorize`, `record-auth-event`.

All 45 source files are listed above. This order is for making dependencies available to later aggregate validation; individual contract CUE files may be structurally vettable before their dependency files exist.

## 5. The Manifest Emission

Emit **one manifest for all of `core/`**, not separate manifests by domain. The current inventory shares primitives across foundation, identity, and validation contracts; a single index gives the future consumer one complete contract catalog and one resolver input.

Add a root package file at `core/manifest.cue`. It imports each directory package, selects the 45 package-internal contract values, and exposes one top-level field:

```cue
package manifest

contracts: [
    // Contract values selected from the imported core packages.
]
```

Each source `.cue` file should contribute exactly one value unified with `schema.#Primitive`, `schema.#Function`, or `schema.#Composition`. Use a unique internal label in its directory package (a normalized ID is sufficient); the manifest list selects the value itself, not that label. This allows sibling contracts in one directory to coexist without adding wrapper fields to the exported contract objects.

With a CUE module configured, `cue export ./core/manifest.cue` should produce JSON of this shape:

```json
{
  "contracts": [
    {
      "kind": "primitive",
      "id": "actor",
      "version": "1.0.0",
      "domain": "foundation"
    }
  ]
}
```

The example is abbreviated; each array element contains all and only the fields present in its source YAML. The array should have 45 entries in a stable, documented order (the migration inventory order). Absence remains absence: no nulls or default-filled `module`/`bindings` values. A CUE module path/import identity does not exist in the current repository and must be selected when implementation begins; schema and package imports must use that one stable module identity.

## 6. The Resolver Gap

`cue vet` can check that each dependency list contains strings and that the manifest has the declared shape. It does not discover files in the repository or prove that a dependency ID names one of them. Add a standalone dependency resolver under `tools/contract-resolver/`, outside `core/`, `native/ts/`, and the still-empty `parser/`.

Specify its input as the JSON emitted from `core/manifest.cue`. Its required checks:

1. Every contract ID is unique.
2. Every ID in `depends_on.primitives`, `depends_on.functions`, and `depends_on.compositions` resolves to exactly one manifest contract ID.
3. Report the source contract, dependency bucket, and unresolved/duplicate ID with a nonzero exit status on failure.

Keep this check language-neutral: define the JSON input and behavior as the contract for the tool; choose the implementation language separately. Do not put filesystem traversal in a contract or make TypeScript a requirement. A separate diagnostic may compare dependency buckets against resolved target kinds, but it must initially report rather than rewrite the three existing mismatches in §8.

## 7. Verification Strategy

1. **Freeze a source snapshot.** Before deleting or editing YAML in the migration, parse all 45 source documents with a YAML 1.2-compatible parser and retain the parsed values for comparison. Do not compare raw text alone because folded scalars and formatting normalize.
2. **Per-file CUE validation.** For each converted file, run `cue vet` with that file and the shared schema import. Check that all original required fields and shapes are accepted, while absent optional fields remain absent. Also vet each containing package.
3. **Structural parity.** Export each converted contract to JSON and compare its decoded value to the parsed YAML value. Ignore object key order only; preserve list order, scalar values, nested map contents, and field presence. The comparison must fail on added defaults, dropped prose, altered binding values, or changed dependency buckets.
4. **Whole-manifest gates.** Run `cue vet ./core/...`, export the global manifest, assert exactly 45 contracts and unique IDs, then run the resolver. Record the three known bucket/kind mismatches as diagnostics pending a separate decision; do not silently correct them in the CUE translation.
5. **Native TypeScript cross-check: yes, but not as the contract oracle.** `native/ts/` is hand-written, not generated. Run `npm test` unchanged after the CUE migration and map each contract's `tests:` obligations to the corresponding `.test.ts` coverage. Use failures or behavior differences to identify parity questions; do not change TypeScript or amend CUE/YAML to make an implementation pass without a separate contract decision. The CUE/YAML structural comparison establishes translation fidelity; native tests provide an independent behavioral regression signal.
6. **Known cross-check to record.** `native/ts/primitives/subject.ts` returns `Subject` and throws for an unknown kind; `subject.test.ts` asserts that behavior. `core/validation/subject-from-storage.yaml` separately requires malformed storage to return `Err` and not throw. Preserve both source contracts during migration and track this behavior boundary as a parity question, not a CUE migration fix.

## 8. Risks and Open Questions

- **Dependency bucket mismatches:** The resolver found no missing dependency IDs, but it found three `compositions` entries whose targets are functions: `attempt-login -> create-session`, `refresh-session -> validate-session`, and `refresh-session -> create-session`. Keep the YAML bucket values verbatim for translation fidelity. Decide separately whether the contracts or the bucket schema should change; do not make that decision during conversion.
- **Open binding schema:** `bindings` is intentionally extensible. Existing payloads include nested maps, scalar strings, lists, numeric values, and objects (for example, `core/identity/authentication/login.yaml` has `gms-governance.session_lifetime`). The schema cannot constrain those project-specific meanings without redesigning the binding model. Use an explicit open map, not an inferred closed set.
- **Map-valued primitive fields:** Several `shape.fields[].type` values describe arbitrary-key maps, such as `immutable-map<string, string>` for `Subject.attributes` and `AuthEvent.detail`. These are currently type-expression strings inside contract data; they are not runtime maps for CUE to validate. Preserve the expression exactly. The same applies to arbitrary interface type strings and function signatures.
- **Prose remains prose:** CUE can require strings and preserve list structure, but it cannot prove that an `invariants` sentence is true, that a threat mitigation is effective, or that a `given`/`expect` pair is executable. Turning these into machine-checkable predicates would redesign the contract model and is out of scope.
- **Current `kind` versus architecture terminology:** `ARCHITECTURE.md` describes five categories, but current values only use three; `module` and `api` are metadata. Keep the actual values during the migration. Whether future contracts should use the other kinds is a separate model question.
- **CUE module identity and tooling:** The repository currently has no CUE module configuration or CUE dependency. Select and pin a CUE CLI version and choose the module import path before implementation; this plan does not claim CUE is installed in the current environment.
- **YAML parser semantics:** The parity check needs a YAML 1.2-compatible reader and must preserve strings and omission semantics. Decide the concrete comparison tool in the migration implementation; it must not coerce contract prose or special-looking scalar strings.
- **Handwritten native code:** The TypeScript suite is useful as a behavior cross-check but may diverge from contracts. The subject construction example above is known. No TypeScript change is authorized by this plan.
