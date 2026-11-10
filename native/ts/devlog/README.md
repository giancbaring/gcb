# Development Historian

The historian records the chronological story of a contract flow as ordered events. Events carry a sequence number, timestamp, correlation id, contract id, kind, and optional detail.

## Touch Points

- `types.ts` defines event and historian contracts.
- `index.ts` exports the active historian and `DEVLOG_ENABLED` flag.
- Set `DEVLOG_ENABLED` in `index.ts` for a development build.

TypeScript alone cannot guarantee zero runtime cost. The consumer's bundler must prove `DEVLOG_ENABLED === false` and eliminate the disabled branch. When it does, that path is zero-cost. If it does not, the disabled path costs one function call per devlog site.

For a dev build, change `DEVLOG_ENABLED` to `true` in `index.ts`; login and other instrumented flows then use the shared console historian unless a historian is supplied explicitly.

The console historian generates correlation ids from `Date.now()` and a per-historian counter; this needs no platform crypto API or dependency.

Do not log credentials, secrets, reset tokens, session ids, or raw payloads. Do not use this historian for production telemetry; that is a separate concern.