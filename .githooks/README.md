# Git Hook Gates

Pre-commit runs `cue vet` directly on staged `.cue` files; other commits take the fast path. It does not invoke npm.

Pre-push runs whole-corpus `cue vet ./core/...`, then `npm run index:verify`.

Install both hooks with `npm run hooks:install`. After a fresh clone, neither hook runs until installation is performed.

The YAML scrub, parity checker, and migration commands are retired. Their defect classes (including null-key and scalar-coercion ambiguities) cannot occur in CUE's typed constraint language; `cue vet` validates the contracts directly. The push hook tolerates only the three known bucket-mismatch diagnostics from `index:verify` and fails on any other diagnostic.

Bypass either hook with `--no-verify`.

The pre-commit gate stays fast by avoiding Node/tsx startup. The pre-push gate performs whole-corpus validation once per push.