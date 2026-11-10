# Module and API Design

## 3a. What a Module Contract Is

A Module contract answers: which cohesive capability does this group of contracts own? Its `members` field names the contracts that belong to the capability, and `boundary` states what responsibility stays inside it. A module gives the library a stable unit for grouping and discussing related contracts.

A module is distinct from a composition. A composition defines an ordered use case and its behavior; a module describes ownership and grouping without adding another execution flow. The architecture defines modules as bundles of primitives and functions. The proposed subtree groupings below include composition contracts where those are present; that membership rule needs confirmation before the follow-up contracts are instantiated.

## 3b. What an API Contract Is

An API contract answers: which contracts are exposed across a boundary, and at what trust level? Its `surface` is the explicit list of exposed contract IDs, their contract kinds, optional aliases, and per-entry trust. It describes exposure, not the implementation flow inside any one contract.

The proposed trust convention is that `public` entries are supported for external consumers and `internal` entries are reserved for callers inside the library boundary. The API-level `trust` describes the audience of the overall surface; this design proposes `public`. The repository does not yet define these trust semantics, so they remain a proposal rather than an existing policy.

## 3c. Field Reference

Fields inherited from `#Common` apply to both `#Module` and `#API`.

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | kebab-case string | Yes | Stable contract identifier. |
| `version` | semantic-version string | Yes | Contract version. |
| `domain` | `"foundation"` or `"identity"` | Yes | Owning domain. |
| `description` | string | Yes | Human-readable contract purpose. |
| `invariants` | list of strings | Yes | Guarantees of the module or API contract. |
| `threats` | list of `#Threat` | Yes | Threats and mitigations. |
| `tests` | list of `#Test` | Yes | Required conformance cases. |
| `bindings` | string-keyed map | No | Optional governance or implementation bindings. |
| `kind` (`#Module`) | literal `"module"` | Yes | Identifies this as a module. |
| `api` | string | Yes for `#Module` | API grouping associated with the module. |
| `members` | list of strings | Yes for `#Module` | IDs of contracts grouped by the module. |
| `boundary` | string | Yes for `#Module` | One-line statement of the module's ownership. |
| `kind` (`#API`) | literal `"api"` | Yes | Identifies this as an API contract. |
| `surface` | list of `#SurfaceEntry` | Yes for `#API` | Contracts exposed by the API. |
| `trust` | string | Yes for `#API` | Proposed audience classification for the API surface. |
| `id` (`#SurfaceEntry`) | string | Yes | ID of the exposed contract. |
| `kind` (`#SurfaceEntry`) | `"function"`, `"composition"`, or `"primitive"` | Yes | Kind of the exposed contract. |
| `trust` (`#SurfaceEntry`) | `"public"` or `"internal"` | Yes | Exposure level for this entry. |
| `exposedAs` | string | No | Optional public alias for the contract ID. |

## 3d. Proposed Identity Modules

The following member IDs were read from the `id` fields in every `.cue` file under each subtree. The `primitives` directory is excluded from the seven capability modules; see 3g.

### identity-administration

Members: `change-role`, `create-account`

Boundary: Owns authorized account provisioning and role changes, including coordination with caller-supplied persistence and audit sinks.

Invariants:
- A failed authorization never invokes the account or role sink.
- Initial credentials are hashed before the account sink receives them.
- Denied role changes still produce a DENIED audit event.

### identity-authentication

Members: `attempt-login`, `authenticate`, `login`, `assertion-freshness`, `issue-assertion`, `resolve-identifier`, `compare-secret`, `verify-credential`

Boundary: Owns resolving identifiers, verifying credentials, issuing and checking assertions, and the login workflows that build on those steps.

Invariants:
- Login rate limiting occurs before authentication, and failed authentication does not establish a session.
- Assertions carry the resolved subject and use the supplied clock.
- Credential comparison is constant-time, and credentials are not returned in results or errors.

### identity-authorization

Members: `authorize`, `permission-check`, `require-authority`

Boundary: Owns authority checks and guards that decide whether an action may execute for a principal.

Invariants:
- A denied authorization is terminal and returns FORBIDDEN where the contract requires an authorization outcome.
- A guarded action never runs when the required authority is absent.
- A permitted decision preserves the principal supplied to the check.

### identity-credentials

Members: `change-credential`, `hash-credential`, `reset-credential`

Boundary: Owns credential hashing, verified credential changes, and reset-token-based credential replacement.

Invariants:
- A replacement credential is hashed before it reaches a persistence sink.
- A credential change verifies the old credential before hashing the replacement.
- A reset token is consumed before hashing, and failed token consumption does not invoke the credential sink.

### identity-observability

Members: `record-auth-event`

Boundary: Owns constructing and appending immutable authentication events through a caller-supplied sink.

Invariants:
- The recorded event subject is the actor's subject.
- A valid call appends exactly one event, and sink error text is not returned.

### identity-session

Members: `logout`, `refresh-session`, `create-session`, `session-from-storage`, `session-to-storage`, `validate-session`

Boundary: Owns session establishment, validation, refresh, termination, and storage conversion.

Invariants:
- A usable session is active and strictly before its expiry; otherwise validation fails as EXPIRED.
- Logout and refresh leave their input session unchanged.
- Session storage conversion round-trips to an equivalent validated session.

### identity-throttling

Members: `rate-limit`

Boundary: Owns atomic rate-limit checks through a caller-supplied store and policy.

Invariants:
- The clock is invoked exactly once per call.
- The store's `checkAndRecord` operation is invoked exactly once per call.

## 3e. Proposed Identity API

Proposed contract: `identity`, with API-level trust `public`.

| ID | Kind | Trust |
| --- | --- | --- |
| `attempt-login` | `composition` | `public` |
| `authenticate` | `composition` | `public` |
| `login` | `composition` | `public` |
| `logout` | `composition` | `public` |

Selection rule: include contracts whose descriptions explicitly say a login endpoint invokes them (`attempt-login`, `authenticate`, and `login`), plus `logout`, which is explicitly described as the counterpart to login. The existing contracts have no dedicated entry-point marker, so this is a text-based proposal rather than a definitive public API declaration.

Proposed invariants:
- Login operations do not return a Session when authentication fails.
- Login operations do not expose the submitted credential in a returned value or error.
- `logout` returns a revoked session without mutating its input.

## 3f. What This Task Does Not Do

No `.cue` contracts are created by this task. The seven Module contracts and one API contract described above are proposals only; their eight contract files will be created by a follow-up task after Task 14 completes and the contract count is stable at 45.

## 3g. Open Questions

- The current filesystem has eight top-level directories under `core/domains/identity`, not seven. This proposal excludes `primitives` because the architecture defines primitives as atomic types and the other seven directories are capability groupings. Confirm that the primitive catalog should not receive a Module contract.
- `ARCHITECTURE.md` defines a Module as a bundle of primitives and functions, while several proposed subtree member lists also contain compositions. Confirm whether Module `members` may include compositions or whether the Module boundaries should follow the architecture's narrower category.
- The authentication contracts describe three overlapping login endpoint candidates (`attempt-login`, `authenticate`, and `login`). Confirm whether all should be public, or whether one is the canonical login entry point.
- `ARCHITECTURE.md` describes an API as a boundary-crossing surface such as a network, database, or process boundary. No transport boundary is declared by these contracts. Confirm whether `identity` is intended to be one public API or whether APIs should map to concrete boundary adapters.
- `#ApiCommon.trust` is `string`; the comment lists `public`, `internal`, and `private` but CUE does not constrain it to those values. Confirm whether a later schema revision should use a closed union.
- `members: [...string]` and `surface` entries identify contracts by string but do not verify that IDs exist, are unique, or belong to the declared subtree/API. Those cross-contract constraints are not expressible by the definitions as written and need a later validation decision.