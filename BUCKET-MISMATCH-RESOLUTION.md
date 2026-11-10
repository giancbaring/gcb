# Bucket Mismatch Resolution

## attempt-login -> create-session

Files read:
- Source: `core/domains/identity/authentication/attempt-login.cue`, `core/domains/identity/authentication/attempt-login.yaml`, `native/ts/identity/authentication/attempt-login.ts`
- Target: `core/domains/identity/session/establishment/create-session.cue`, `core/domains/identity/session/establishment/create-session.yaml`, `native/ts/identity/session/establishment/create-session.ts`

The target implementation validates the lifetime, derives a Principal from the Assertion, computes timestamps, and constructs a Session using primitive helpers. It does not invoke or consume another composition.

Decision: **A — source wrong.** `create-session` is a function, so this dependency belongs in `attempt-login`'s `functions` bucket.

Exact edit: in `attempt-login.cue`, move `"create-session"` from `depends_on.compositions` to `depends_on.functions`. No YAML edit.

## refresh-session -> validate-session

Files read:
- Source: `core/domains/identity/session/refresh-session.cue`, `core/domains/identity/session/refresh-session.yaml`, `native/ts/identity/session/refresh-session.ts`
- Target: `core/domains/identity/session/validation/validate-session.cue`, `core/domains/identity/session/validation/validate-session.yaml`, `native/ts/identity/session/validation/validate-session.ts`

The target implementation reads the current time, checks usability with the session primitive's `isUsable` helper, and returns the session's existing Principal or an expiry error. It does not invoke another composition.

Decision: **A — source wrong.** `validate-session` is a function, so this dependency belongs in `refresh-session`'s `functions` bucket.

Exact edit: in `refresh-session.cue`, move `"validate-session"` from `depends_on.compositions` to `depends_on.functions`. No YAML edit.

## refresh-session -> create-session

Files read:
- Source: `core/domains/identity/session/refresh-session.cue`, `core/domains/identity/session/refresh-session.yaml`, `native/ts/identity/session/refresh-session.ts`
- Target: `core/domains/identity/session/establishment/create-session.cue`, `core/domains/identity/session/establishment/create-session.yaml`, `native/ts/identity/session/establishment/create-session.ts`

The target implementation validates the lifetime, derives a Principal from the Assertion, computes timestamps, and constructs a Session using primitive helpers. It does not invoke or consume another composition.

Decision: **A — source wrong.** `create-session` is a function, so this dependency belongs in `refresh-session`'s `functions` bucket.

Exact edit: in `refresh-session.cue`, move `"create-session"` from `depends_on.compositions` to `depends_on.functions`. No YAML edit.