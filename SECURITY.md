# Security Policy

## Supported Versions

The project is under active development. Only the latest `main` branch is
supported with security fixes.

| Version | Supported |
| ------- | --------- |
| main    | Yes       |
| < 0.1.0 | No        |

## Reporting a Vulnerability

Do not open a public issue for security problems. Report privately to:

  **Email:** giancbaring@gmail.com

If that address is unavailable, open a GitHub Security Advisory at:

  https://github.com/giancbaring/gcb/security/advisories/new

Include, where possible:

- A description of the issue and its impact
- Steps to reproduce, or a minimal proof of concept
- The affected file, function, or contract identifier
- Any suggested mitigation

## What to Expect

- Acknowledgement within 5 business days
- An initial assessment within 10 business days
- A fix or a documented decision within 30 days for confirmed issues

If the issue is accepted, you will be credited in the advisory unless you
request otherwise. If it is declined, you will receive a written rationale.

## Scope

In scope:

- Primitives under `core/primitives/`
- Functions and compositions under `core/identity/`
- Contract files (`*.yaml`) and their TypeScript implementations
- Weaknesses in the invariant or threat model of any contract

Out of scope:

- Vulnerabilities in third-party dependencies (report upstream)
- Issues in projects that consume this library
- Denial of service through deliberately pathological inputs
- The absence of features not claimed by a contract

## Design Commitments

The following are treated as security requirements, not preferences:

- No function throws for expected failure. Failure is a value.
- No credential or secret appears in any returned value, error, or log.
- No function reads an implicit clock. Time is always an argument.
- No authorization decision is made from an unverified assertion.
- Comparison of credentials is constant-time at the binding layer.

A finding that a contract or its implementation violates any of these is a
security issue, regardless of exploitability.

## Disclosure

Please allow a reasonable period for a fix before public disclosure.
Coordinated disclosure is preferred. The maintainer will work with you on
timing if the issue affects downstream users.

## Acknowledgements

This policy follows the general structure recommended by GitHub's security
advisory guidelines and the coordinated disclosure practices described in
ISO/IEC 29147.
