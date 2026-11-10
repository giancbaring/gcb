# YAML Retirement Record

Commit: `fb8ac67eb6a9fc49d56373d3cc275d7827371723` (`git rev-parse HEAD`)

## Pre-removal verification

`npm run parity`:
```text
> gcb@0.1.0 parity
> tsx index/build.ts --parity

Parity: 45/45 passed; 0 failed.
```

`npm run index:scrub`:
```text
> gcb@0.1.0 index:scrub
> tsx index/build.ts --scrub

Scrubbed 45 YAML files; findings 0; unparseable 0.
```

`cue vet ./core/...`: exited 0 with no output.

## YAML inventory

Count under `core/`: 45 files.

```text
C:\gcb\core\domains\identity\administration\change-role.yaml
C:\gcb\core\domains\identity\administration\create-account.yaml
C:\gcb\core\domains\identity\authentication\assertion\assertion-freshness.yaml
C:\gcb\core\domains\identity\authentication\assertion\issue-assertion.yaml
C:\gcb\core\domains\identity\authentication\attempt-login.yaml
C:\gcb\core\domains\identity\authentication\authenticate.yaml
C:\gcb\core\domains\identity\authentication\login.yaml
C:\gcb\core\domains\identity\authentication\resolution\resolve-identifier.yaml
C:\gcb\core\domains\identity\authentication\verification\compare-secret.yaml
C:\gcb\core\domains\identity\authentication\verification\verify-credential.yaml
C:\gcb\core\domains\identity\authorization\authorize.yaml
C:\gcb\core\domains\identity\authorization\permission-check.yaml
C:\gcb\core\domains\identity\authorization\require-authority.yaml
C:\gcb\core\domains\identity\credentials\change-credential.yaml
C:\gcb\core\domains\identity\credentials\hash-credential.yaml
C:\gcb\core\domains\identity\credentials\reset-credential.yaml
C:\gcb\core\domains\identity\observability\record-auth-event.yaml
C:\gcb\core\domains\identity\primitives\actor.yaml
C:\gcb\core\domains\identity\primitives\assertion.yaml
C:\gcb\core\domains\identity\primitives\auth-event.yaml
C:\gcb\core\domains\identity\primitives\auth-failure.yaml
C:\gcb\core\domains\identity\primitives\authz-failure.yaml
C:\gcb\core\domains\identity\primitives\credential.yaml
C:\gcb\core\domains\identity\primitives\principal.yaml
C:\gcb\core\domains\identity\primitives\rate-limit-failure.yaml
C:\gcb\core\domains\identity\primitives\reset-token.yaml
C:\gcb\core\domains\identity\primitives\session.yaml
C:\gcb\core\domains\identity\session\establishment\create-session.yaml
C:\gcb\core\domains\identity\session\logout.yaml
C:\gcb\core\domains\identity\session\persistence\session-from-storage.yaml
C:\gcb\core\domains\identity\session\persistence\session-to-storage.yaml
C:\gcb\core\domains\identity\session\refresh-session.yaml
C:\gcb\core\domains\identity\session\validation\validate-session.yaml
C:\gcb\core\domains\identity\throttling\rate-limit.yaml
C:\gcb\core\primitives\idempotency-failure.yaml
C:\gcb\core\primitives\idempotency-key.yaml
C:\gcb\core\primitives\identifier.yaml
C:\gcb\core\primitives\outcome.yaml
C:\gcb\core\primitives\result.yaml
C:\gcb\core\primitives\secret.yaml
C:\gcb\core\primitives\subject.yaml
C:\gcb\core\primitives\timestamp.yaml
C:\gcb\core\validation\principal-from-storage.yaml
C:\gcb\core\validation\subject-from-storage.yaml
C:\gcb\core\validation\validate-input.yaml
```

From this commit forward, CUE is the sole source of truth for contracts under `core/`. Git history holds the YAML itself.
