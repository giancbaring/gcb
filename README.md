# GCB — General Code Base

Language- and domain-agnostic software contracts.

## Purpose

A library of contracts that declare the interface, invariants, threat model,
and tests of reusable software units. Implementations in specific languages
sit beside the contracts, so the same guarantee holds across projects.

## Structure

```
core/
├── primitives/     atomic types, no behavior
└── identity/       authentication, session
    ├── authentication/
    │   ├── resolution/
    │   ├── verification/
    │   └── assertion/
    └── session/
        ├── establishment/
        └── validation/
```

## Conventions

| File | Role |
|---|---|
| `<name>.yaml` | Contract. Language-agnostic. |
| `<name>.ts` | Implementation. |
| `<name>.test.ts` | Tests derived from the contract. |

The filename is the unit name. The extension is the artifact kind. The
directory is the category.

## Categories

- `primitive` — atomic type + invariants. No behavior.
- `function` — pure transformation. Deterministic.
- `module` — cohesive bundle.
- `api` — boundary-crossing surface.
- `composition` — orchestrated flow.

## Development

```bash
npm install
npm test
```

## Status

v0.1.0 — foundation layer in progress.