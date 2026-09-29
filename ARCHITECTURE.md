# Architecture

The General Code Base (GCB) is a library of software contracts. Each
contract declares what a unit does, what must remain true about it, and
what attacks it resists. Implementations sit beside the contracts.

## Why contracts

The same guarantee — "no credential ever appears in a log" — has to hold
in TypeScript today and in whatever language this project uses in five
years. If the guarantee lives in code, it is re-implemented every time.
If it lives in a contract, it survives the rewrite.

A contract is authoritative. When the code and the contract disagree, the
code is wrong.

## The pipeline

Three stages, in order:

    CLL  →  LLP  →  LNL

**CLL — Core Logic Library.** The contracts. YAML files that declare an
interface, invariants, a threat model, and a test obligation. Written by
hand. Language-agnostic. This is the source of truth.

**LLP — Logic Library Parser.** A transpiler that reads CLL, validates
it, and emits LNL. It is a gate before it is a generator: an unsound
contract is rejected, not compiled.

**LNL — Logic Native Library.** The generated, language-specific output.
TypeScript today. Consumed by applications. Never hand-edited.

**Status.** CLL and LNL exist. Implementations are currently written by
hand beside their contracts. The LLP is deferred until enough contracts
exist to make its shape obvious — a transpiler for a format seen twice
is a guess.

## Categories

Every contract declares one `kind`.

| Kind | Definition | Depends on |
| ---- | ---------- | ---------- |
| `primitive` | Atomic type with invariants. No behavior. | Nothing |
| `function` | Pure transformation. Deterministic. No I/O. | Primitives |
| `module` | A cohesive bundle of primitives and functions. | Primitives, functions |
| `api` | A boundary-crossing surface. Network, database, process. | Any of the above |
| `composition` | An orchestrated use case. | All of the above |

A primitive is discovered, not invented. It exists because a function
above it needs to name it. The direction of discovery is top-down; the
direction of construction is bottom-up.

## Directory layout

    core/
      primitives/        atomic types
      identity/          domain
        authentication/  api
          resolution/    module
          verification/  module
          assertion/     module
        session/         api
          establishment/ module
          validation/    module
        observability/   api

Directories are categories. Files are units. The filename is the unit
name; the extension is the artifact kind.

    core/primitives/result.yaml           the contract
    core/primitives/result.ts             the implementation
    core/primitives/result.test.ts        tests derived from the contract

## Contract shape

Every contract declares six sections.

    kind: primitive | function | module | api | composition
    id: kebab-case-name
    version: semver
    domain: foundation | identity | ...
    description: one paragraph
    shape: | interface:   the type or function signature
    invariants:           what must remain true
    threats:              attack classes and their mitigations
    tests:                what any conforming implementation must pass

A primitive uses `shape`. Everything else uses `interface`. Both may
declare `depends_on` when the dependency matters.

## Invariants

An invariant is a statement that must hold at every observable moment.
It is not a description of what the code does — it is a constraint the
code is not permitted to violate.

Weak: "returns a Result."
Strong: "never throws; a failure is a value, not an exception."

Every invariant must be falsifiable. If no test could detect its
violation, it is not an invariant — it is a preference.

## Threat model

Every threat has three parts:

- `id` — stable identifier, never reused
- `name` — the attack class
- `mitigation` — the mechanism, in the contract's own terms

A threat with no mitigation is a known gap. That is acceptable if stated.
It is not acceptable if hidden.

## Time, identity, and failure

Three rules cut across every contract:

**No implicit clock.** Every function that needs the current time receives
it as an argument. Tests pin the clock; production supplies the real one.
A function that calls `Date.now()` directly cannot be tested for time
behaviour and is a defect.

**No failure by exception.** Expected failure is returned as
`Result<T, E>`. Exceptions are reserved for programmer error and are never
used to signal a result.

**No unverified trust.** A value that carries authority — a Principal, an
Assertion, a Session — cannot be constructed from raw input. The
constructor requires a value that has already been verified.

## Immutability

Every value returned by a primitive is frozen. A reader cannot widen
authority, extend a session, or alter an event. State transitions are
functions that return a new value; the original is unchanged.

Where `Object.freeze` is insufficient — `Set` and `Map` internals are not
frozen by it — the primitive exposes a facade with no mutating methods
rather than a raw collection.

## Extending the library

A new unit enters the catalog when a real project requires it. It does not
enter because it might be useful. The rule is: the catalog grows when the
project pulls, never when the library pushes.

To add a unit:

1. Write the contract.
2. Write the implementation beside it.
3. Write the tests named in the contract's `tests:` block.
4. Run the suite.
5. If the unit is a primitive, check that no existing primitive already
   names the concept under a different word.

## Known gaps

- The LLP does not exist. Contracts and implementations can drift.
- Nothing verifies that a contract matches its implementation.
- The SQL enforcement layer — RLS policies — is not yet in the catalog.
- Coverage is limited to the identity domain.
