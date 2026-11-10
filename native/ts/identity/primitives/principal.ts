/**
 * principal.ts — implementation of the `principal` primitive.
 * Contract: core/primitives/principal.yaml
 *
 * A Principal is the authenticated identity used for authorization
 * decisions. It is constructed from a verified Assertion. The Assertion
 * type lives in assertion.ts — principal re-exports it for consumers
 * that import everything from one place.
 *
 * Note on immutability: `Object.freeze(new Set(...))` does NOT prevent
 * mutations via Set.prototype.add — Object.freeze only freezes own
 * properties, not the internal slot. We therefore expose a facade with
 * no mutating methods rather than a raw Set.
 */

import type { Subject } from '../../primitives/subject'
import type { Identifier } from '../../primitives/identifier'
import type { Timestamp } from '../../primitives/timestamp'
import type { Assertion } from './assertion'

export type { Assertion } from './assertion'

export interface Authority {
  has(token: string): boolean
  readonly size: number
  toArray(): readonly string[]
}

export interface Principal {
  readonly subject: Subject
  readonly sessionId: Identifier
  readonly authority: Authority
  readonly issuedAt: Timestamp
}

function makeAuthority(tokens: readonly string[]): Authority {
  const inner = new Set(tokens)
  return Object.freeze({
    has: (token: string): boolean => inner.has(token),
    get size(): number {
      return inner.size
    },
    toArray: (): readonly string[] => Object.freeze([...inner]),
  })
}

export function principalFromAssertion(assertion: Assertion): Principal {
  return Object.freeze({
    subject: assertion.subject,
    sessionId: assertion.sessionId,
    authority: makeAuthority(assertion.authority),
    issuedAt: assertion.issuedAt,
  })
}

export function hasAuthority(principal: Principal, token: string): boolean {
  return principal.authority.has(token)
}

export function principalsEqual(a: Principal, b: Principal): boolean {
  return a.subject.identifier === b.subject.identifier && a.sessionId === b.sessionId
}
