# GCB Current State Assessment 001

Captured 2026-10-01 from command output and repository files. This task created only this document; the pre-existing worktree changes are listed below.

## 1. Repository Shape

`git status --short` (captured before this document was created):

```text
 M .github/agents/gcb-coding.agent.md
 M .gitignore
RM core/identity/administration/change-role.yaml -> core/domains/identity/administration/change-role.yaml
RM core/identity/administration/create-account.yaml -> core/domains/identity/administration/create-account.yaml
R  core/identity/authentication/assertion/assertion-freshness.yaml -> core/domains/identity/authentication/assertion/assertion-freshness.yaml
RM core/identity/authentication/assertion/issue-assertion.yaml -> core/domains/identity/authentication/assertion/issue-assertion.yaml
R  core/identity/authentication/attempt-login.yaml -> core/domains/identity/authentication/attempt-login.yaml
RM core/identity/authentication/authenticate.yaml -> core/domains/identity/authentication/authenticate.yaml
R  core/identity/authentication/login.yaml -> core/domains/identity/authentication/login.yaml
R  core/identity/authentication/resolution/resolve-identifier.yaml -> core/domains/identity/authentication/resolution/resolve-identifier.yaml
R  core/identity/authentication/verification/compare-secret.yaml -> core/domains/identity/authentication/verification/compare-secret.yaml
R  core/identity/authentication/verification/verify-credential.yaml -> core/domains/identity/authentication/verification/verify-credential.yaml
R  core/identity/authorization/authorize.yaml -> core/domains/identity/authorization/authorize.yaml
R  core/identity/authorization/permission-check.yaml -> core/domains/identity/authorization/permission-check.yaml
R  core/identity/authorization/require-authority.yaml -> core/domains/identity/authorization/require-authority.yaml
R  core/identity/credentials/change-credential.yaml -> core/domains/identity/credentials/change-credential.yaml
R  core/identity/credentials/hash-credential.yaml -> core/domains/identity/credentials/hash-credential.yaml
R  core/identity/credentials/reset-credential.yaml -> core/domains/identity/credentials/reset-credential.yaml
R  core/identity/observability/record-auth-event.yaml -> core/domains/identity/observability/record-auth-event.yaml
R  core/primitives/actor.yaml -> core/domains/identity/primitives/actor.yaml
R  core/primitives/assertion.yaml -> core/domains/identity/primitives/assertion.yaml
R  core/primitives/auth-event.yaml -> core/domains/identity/primitives/auth-event.yaml
R  core/primitives/auth-failure.yaml -> core/domains/identity/primitives/auth-failure.yaml
R  core/primitives/authz-failure.yaml -> core/domains/identity/primitives/authz-failure.yaml
R  core/primitives/credential.yaml -> core/domains/identity/primitives/credential.yaml
R  core/primitives/principal.yaml -> core/domains/identity/primitives/principal.yaml
R  core/primitives/rate-limit-failure.yaml -> core/domains/identity/primitives/rate-limit-failure.yaml
R  core/primitives/reset-token.yaml -> core/domains/identity/primitives/reset-token.yaml
RM core/primitives/session.yaml -> core/domains/identity/primitives/session.yaml
R  core/identity/session/establishment/create-session.yaml -> core/domains/identity/session/establishment/create-session.yaml
RM core/identity/session/logout.yaml -> core/domains/identity/session/logout.yaml
RM core/identity/session/persistence/session-from-storage.yaml -> core/domains/identity/session/persistence/session-from-storage.yaml
R  core/identity/session/persistence/session-to-storage.yaml -> core/domains/identity/session/persistence/session-to-storage.yaml
R  core/identity/session/refresh-session.yaml -> core/domains/identity/session/refresh-session.yaml
R  core/identity/session/validation/validate-session.yaml -> core/domains/identity/session/validation/validate-session.yaml
R  core/identity/throttling/rate-limit.yaml -> core/domains/identity/throttling/rate-limit.yaml
 M package-lock.json
 M package.json
?? CUE-MIGRATION-PLAN.md
?? SECOLA-scrub-001.md
?? core/domains/identity/administration/change-role.cue
?? core/domains/identity/administration/create-account.cue
?? core/domains/identity/authentication/assertion/assertion-freshness.cue
?? core/domains/identity/authentication/assertion/issue-assertion.cue
?? core/domains/identity/authentication/attempt-login.cue
?? core/domains/identity/authentication/authenticate.cue
?? core/domains/identity/authentication/login.cue
?? core/domains/identity/authentication/verification/compare-secret.cue
?? core/domains/identity/authorization/authorize.cue
?? core/domains/identity/credentials/change-credential.cue
?? core/domains/identity/credentials/hash-credential.cue
?? core/domains/identity/primitives/actor.cue
?? core/domains/identity/primitives/assertion.cue
?? core/domains/identity/primitives/auth-event.cue
?? core/domains/identity/primitives/auth-failure.cue
?? core/domains/identity/primitives/authz-failure.cue
?? core/domains/identity/primitives/credential.cue
?? core/domains/identity/session/establishment/create-session.cue
?? core/domains/identity/session/logout.cue
?? core/primitives/idempotency-failure.cue
?? core/primitives/idempotency-key.cue
?? core/primitives/identifier.cue
?? core/primitives/result.cue
?? core/primitives/subject.cue
?? core/schema/
?? cue.mod/
?? index/
```

`git log --oneline -10`:

```text
fb8ac67 (HEAD -> main, origin/main, origin/HEAD) chore: project layout and identity primitives
7aa2f80 Initial commit
```

Top-level directory listing (`Get-ChildItem -Directory -Force`):

```text
.git
.github
.vscode
core
cue.mod
index
native
node_modules
parser
```

`Get-ChildItem core -Recurse -Include *.cue,*.yaml | Group-Object Extension`:

```text
Name  Count
.cue     25
.yaml    45
```

The repository has shared CUE definitions in `core/schema`, foundation primitives in `core/primitives`, identity contracts and identity primitives in `core/domains/identity`, and validation contracts in `core/validation`. YAML sources remain alongside CUE pilots/conversions. `native/ts` contains hand-written TypeScript implementations and tests; `index` contains discovery, graph, scrub/status commands, reports, and viewer; `cue.mod` declares the CUE module. `parser` exists but is empty. No top-level `tools` directory was listed.

## 2. Migration State

Source: `npm run index:status` and `index/out/index.json` summary.

```text
Total contracts: 45
Converted:       24
Pending:         19
Blocked:          2
Unparseable:      0
```

The command summary was: `Summary: converted 24, pending 19, blocked 2, unparseable 0.` The index JSON also reports 45 indexed, 0 broken edges, and 3 bucket mismatches.

## 3. Known Defects and Blockers

Source: current `npm run index:scrub` output. It reports two findings and zero parse failures. `Test-Path` confirmed neither blocked contract has a colocated `.cue` file.

| YAML path | Finding | CUE companion |
|---|---|---|
| `core/domains/identity/observability/record-auth-event.yaml` | Line 18, null-valued phantom key at `$.interface.inputs[3]["string>"]`, parsed as `{"string>": null}`. | Absent |
| `core/primitives/outcome.yaml` | Line 18, null-valued phantom key at `$.shape.variants[2]["usually for authorization"]`, parsed as `{"usually for authorization": null}`. | Absent |

The scrub exits 1 because of these findings. The older `SECOLA-scrub-001.md` is historical; the current scrub command is the source for this assessment's blocked list.

## 4. Tooling Inventory

| Tool | State | Command and behavior |
|---|---|---|
| `index:build` | Present | `npm run index:build` builds graph/reports and writes `index/out/index.json`, `index/out/index.md`, and `index/out/index.html`. |
| `index:watch` | Present | `npm run index:watch` runs `npx tsx index/build.ts --watch`, rebuilding on core changes. `.vscode/tasks.json` starts this task on folder open. |
| `index:verify` | Present | `npm run index:verify` runs `tsx index/build.ts --strict`; strict graph diagnostics fail the command. |
| `index:scrub` | Present | `npm run index:scrub` checks YAML and prints scrub findings without rebuilding the graph. |
| `index:status` | Present | `npm run index:status` prints contracts grouped by migration status. |
| Parity harness | Absent | No parity command/script or `isDeepStrictEqual` implementation was found in package scripts or the searched tooling paths. Parity checks have been run manually, not as a committed harness. |
| Migration runner | Absent | No bulk migration script/command is present. Individual `cue import yaml` is a manual CUE CLI operation. |
| Pre-commit hook | Absent | `.git/hooks/pre-commit` is absent; only Git's `.sample` hooks are present. |
| CI configuration | Absent | `.github/workflows` does not exist. |

## 5. Verified Working Commands

| Command | Result | Exit |
|---|---|---:|
| `cue version` | Pass; CUE language v0.17.1, Go v1.26.5, Windows amd64. | 0 |
| `npm run typecheck` | Fail; first 20 command-output lines below. | 2 |
| `npm test` | Pass; 49 test files, 562 tests. | 0 |
| `npm run index:build` | Not run. `index/build.ts` calls `mkdirSync`/`writeFileSync` for three files under `index/out`; running it would violate this task's explicit no-repo-write constraint. | N/A |
| `npx vitest run index/test/` | Pass; 4 test files, 14 tests. | 0 |

First 20 output lines captured for the typecheck failure:

```text
> gcb@0.1.0 typecheck
> tsc --noEmit

native/ts/identity/administration/change-role.test.ts(103,12): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/change-role.test.ts(104,12): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/change-role.test.ts(118,28): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/change-role.test.ts(133,12): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/change-role.test.ts(179,12): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/change-role.test.ts(250,12): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/create-account.test.ts(114,12): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/create-account.test.ts(115,12): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/create-account.test.ts(116,12): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/create-account.test.ts(130,28): error TS2532: Object is possibly 'undefined'.
native/ts/identity/administration/create-account.test.ts(144,39): error TS2532: Object is possibly 'undefined'.
native/ts/identity/authentication/assertion/assertion-freshness.ts(34,23): error TS2345: Argument of type 'Duration' is not assignable to parameter of type 'Timestamp'.
  Property '[timestampBrand]' is missing in type 'Number & { readonly [durationBrand]: true; }' but required in type '{ readonly [timestampBrand]: true; }'.
native/ts/identity/authentication/attempt-login.test.ts(21,29): error TS6133: 'AttemptLoginFailure' is declared but its value is never read.
native/ts/identity/authentication/attempt-login.test.ts(82,12): error TS2532: Object is possibly 'undefined'.
```

`npm run index:build` was deliberately not executed; its exit code is therefore unverified, not inferred from older terminal state.

## 6. Native Implementation State

Source: `Get-ChildItem native/ts -Recurse -File` with `Get-Content | Measure-Object -Line`. The directory contains 90 files: 45 implementation `.ts` files and 45 `.test.ts` files. The full `npm test` suite passed all 49 files, so each listed native test file passed in that run.

```text
native/ts/identity/administration/change-role.test.ts — 286 lines [test: pass]
native/ts/identity/administration/change-role.ts — 104 lines
native/ts/identity/administration/create-account.test.ts — 389 lines [test: pass]
native/ts/identity/administration/create-account.ts — 57 lines
native/ts/identity/authentication/assertion/assertion-freshness.test.ts — 117 lines [test: pass]
native/ts/identity/authentication/assertion/assertion-freshness.ts — 32 lines
native/ts/identity/authentication/assertion/issue-assertion.test.ts — 88 lines [test: pass]
native/ts/identity/authentication/assertion/issue-assertion.ts — 43 lines
native/ts/identity/authentication/attempt-login.test.ts — 276 lines [test: pass]
native/ts/identity/authentication/attempt-login.ts — 135 lines
native/ts/identity/authentication/authenticate.test.ts — 234 lines [test: pass]
native/ts/identity/authentication/authenticate.ts — 67 lines
native/ts/identity/authentication/login.test.ts — 147 lines [test: pass]
native/ts/identity/authentication/login.ts — 39 lines
native/ts/identity/authentication/resolution/resolve-identifier.test.ts — 62 lines [test: pass]
native/ts/identity/authentication/resolution/resolve-identifier.ts — 31 lines
native/ts/identity/authentication/verification/compare-secret.test.ts — 65 lines [test: pass]
native/ts/identity/authentication/verification/compare-secret.ts — 33 lines
native/ts/identity/authentication/verification/verify-credential.test.ts — 103 lines [test: pass]
native/ts/identity/authentication/verification/verify-credential.ts — 50 lines
native/ts/identity/authorization/authorize.test.ts — 119 lines [test: pass]
native/ts/identity/authorization/authorize.ts — 31 lines
native/ts/identity/authorization/permission-check.test.ts — 96 lines [test: pass]
native/ts/identity/authorization/permission-check.ts — 25 lines
native/ts/identity/authorization/require-authority.test.ts — 168 lines [test: pass]
native/ts/identity/authorization/require-authority.ts — 45 lines
native/ts/identity/credentials/change-credential.test.ts — 224 lines [test: pass]
native/ts/identity/credentials/change-credential.ts — 65 lines
native/ts/identity/credentials/hash-credential.test.ts — 97 lines [test: pass]
native/ts/identity/credentials/hash-credential.ts — 33 lines
native/ts/identity/credentials/reset-credential.test.ts — 422 lines [test: pass]
native/ts/identity/credentials/reset-credential.ts — 108 lines
native/ts/identity/observability/record-auth-event.test.ts — 108 lines [test: pass]
native/ts/identity/observability/record-auth-event.ts — 49 lines
native/ts/identity/session/establishment/create-session.test.ts — 82 lines [test: pass]
native/ts/identity/session/establishment/create-session.ts — 39 lines
native/ts/identity/session/logout.test.ts — 78 lines [test: pass]
native/ts/identity/session/logout.ts — 13 lines
native/ts/identity/session/persistence/session-from-storage.test.ts — 155 lines [test: pass]
native/ts/identity/session/persistence/session-from-storage.ts — 78 lines
native/ts/identity/session/persistence/session-to-storage.test.ts — 146 lines [test: pass]
native/ts/identity/session/persistence/session-to-storage.ts — 61 lines
native/ts/identity/session/refresh-session.test.ts — 159 lines [test: pass]
native/ts/identity/session/refresh-session.ts — 43 lines
native/ts/identity/session/validation/validate-session.test.ts — 107 lines [test: pass]
native/ts/identity/session/validation/validate-session.ts — 25 lines
native/ts/identity/throttling/rate-limit.test.ts — 85 lines [test: pass]
native/ts/identity/throttling/rate-limit.ts — 43 lines
native/ts/primitives/actor.test.ts — 99 lines [test: pass]
native/ts/primitives/actor.ts — 78 lines
native/ts/primitives/assertion.test.ts — 77 lines [test: pass]
native/ts/primitives/assertion.ts — 66 lines
native/ts/primitives/auth-event.test.ts — 99 lines [test: pass]
native/ts/primitives/auth-event.ts — 91 lines
native/ts/primitives/auth-failure.test.ts — 86 lines [test: pass]
native/ts/primitives/auth-failure.ts — 71 lines
native/ts/primitives/authz-failure.test.ts — 76 lines [test: pass]
native/ts/primitives/authz-failure.ts — 51 lines
native/ts/primitives/credential.test.ts — 38 lines [test: pass]
native/ts/primitives/credential.ts — 38 lines
native/ts/primitives/idempotency-failure.test.ts — 49 lines [test: pass]
native/ts/primitives/idempotency-failure.ts — 25 lines
native/ts/primitives/idempotency-key.test.ts — 99 lines [test: pass]
native/ts/primitives/idempotency-key.ts — 59 lines
native/ts/primitives/identifier.test.ts — 60 lines [test: pass]
native/ts/primitives/identifier.ts — 51 lines
native/ts/primitives/outcome.test.ts — 46 lines [test: pass]
native/ts/primitives/outcome.ts — 27 lines
native/ts/primitives/principal.test.ts — 94 lines [test: pass]
native/ts/primitives/principal.ts — 54 lines
native/ts/primitives/rate-limit-failure.test.ts — 49 lines [test: pass]
native/ts/primitives/rate-limit-failure.ts — 28 lines
native/ts/primitives/reset-token.test.ts — 78 lines [test: pass]
native/ts/primitives/reset-token.ts — 51 lines
native/ts/primitives/result.test.ts — 96 lines [test: pass]
native/ts/primitives/result.ts — 76 lines
native/ts/primitives/secret.test.ts — 46 lines [test: pass]
native/ts/primitives/secret.ts — 41 lines
native/ts/primitives/session.test.ts — 119 lines [test: pass]
native/ts/primitives/session.ts — 99 lines
native/ts/primitives/subject.test.ts — 62 lines [test: pass]
native/ts/primitives/subject.ts — 43 lines
native/ts/primitives/timestamp.test.ts — 90 lines [test: pass]
native/ts/primitives/timestamp.ts — 51 lines
native/ts/validation/principal-from-storage.test.ts — 125 lines [test: pass]
native/ts/validation/principal-from-storage.ts — 80 lines
native/ts/validation/subject-from-storage.test.ts — 118 lines [test: pass]
native/ts/validation/subject-from-storage.ts — 54 lines
native/ts/validation/validate-input.test.ts — 113 lines [test: pass]
native/ts/validation/validate-input.ts — 43 lines
```

## 7. Dependencies

Source: `package.json`, `npm ls --all --parseable`, `npm ls tsx --depth=0`, and `cue version`.

- `dependencies`: none declared.
- `devDependencies`: `tsx@^4.23.15`, `typescript@~5.6.0`, `vite@^8.3.1`, `vitest@^5.0.2`, `yaml@^2.9.1`.
- Installed packages: 40 package paths excluding the repository root; `npm ls --all --parseable` returned 41 paths including the root, exit 0.
- `cue`: on PATH, v0.17.1 (Go v1.26.5, windows/amd64).
- `tsx`: installed, v4.23.15.

## 8. Scripts and Automation Present

Source: `package.json` and `.vscode/tasks.json`.

- `typecheck` — `tsc --noEmit`; checks TypeScript without emitting output.
- `test` — `vitest run`; executes the full test suite once.
- `test:watch` — `vitest`; starts Vitest in watch mode.
- `index:build` — `tsx index/build.ts`; builds the contract index and writes JSON, Markdown, and HTML reports.
- `index:verify` — `tsx index/build.ts --strict`; builds reports and additionally treats strict graph diagnostics as failures.
- `index:scrub` — `tsx index/build.ts --scrub`; prints the YAML scrub report without rebuilding the graph.
- `index:status` — `tsx index/build.ts --status`; prints the status of each contract and a summary.
- `index:watch` — `npx tsx index/build.ts --watch`; watches `core/` and rebuilds the index. The VS Code task starts it on folder open.

## 9. Known Gaps

- The architecture describes the LLP/parser as deferred; `parser/` is empty (`ARCHITECTURE.md`, "The pipeline").
- LNL TypeScript implementations are hand-written rather than generated, so contract/implementation agreement is not mechanically checked (`ARCHITECTURE.md`, "The pipeline" and "Known gaps").
- No parity harness is present; the architecture explicitly lists contract/implementation drift as a known gap (tooling inventory above and `ARCHITECTURE.md`, "Known gaps").
- Migration is incomplete: 19 contracts remain pending and 2 are blocked by source defects (Sections 2 and 3).
- The SQL enforcement/RLS layer is documented as absent from the catalog (`ARCHITECTURE.md`, "Known gaps").
- Typecheck fails with native TypeScript errors (Section 5); tests pass independently.
- No active pre-commit hook or CI workflow was found, so commit/CI enforcement is absent (Section 4).
- The current `index:build` result is unverified in this assessment because running it would write to the repository (Section 5). `index:verify` and `index:watch` are present but were not run here.

## 10. Tooling Readiness for Next Phase

- Can a new contract be converted today with a single command? **No.** No migration runner is present; conversion is a per-file CUE import plus schema unification and validation (Sections 4 and 8).
- Can a broken contract be detected today without manual inspection? **Yes.** `npm run index:scrub` reports the two blocked YAML sources and exits nonzero (Section 3).
- Can a blocked commit be prevented today? **No.** There is no active pre-commit hook or CI workflow (Section 4).
- Can an agent read the current state in one file? **Yes: `STATE-ASSESSMENT-001.md`** (this document).
- What one command shows migration progress? **`npm run index:status`** (Section 2).
