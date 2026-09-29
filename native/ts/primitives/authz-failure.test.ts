/**
 * authz-failure.test.ts — tests for the `authz-failure` primitive.
 */

import { describe, it, expect } from 'vitest'
import {
  AUTHZ_FAILURE,
  isAuthzFailure,
  allAuthzFailures,
  toUserMessage,
  toAuditCode,
} from './authz-failure'

describe('authz-failure — guard', () => {
  it('accepts every declared variant', () => {
    for (const v of allAuthzFailures()) {
      expect(isAuthzFailure(v)).toBe(true)
    }
  })

  it('rejects unknown strings', () => {
    expect(isAuthzFailure('MISMATCH')).toBe(false)
    expect(isAuthzFailure('')).toBe(false)
    expect(isAuthzFailure('forbidden')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isAuthzFailure(42)).toBe(false)
    expect(isAuthzFailure(null)).toBe(false)
    expect(isAuthzFailure(undefined)).toBe(false)
    expect(isAuthzFailure({ failure: 'FORBIDDEN' })).toBe(false)
  })
})

describe('authz-failure — set integrity', () => {
  it('contains exactly four distinct values', () => {
    expect(new Set(allAuthzFailures()).size).toBe(4)
  })

  it('allAuthzFailures returns a frozen array', () => {
    expect(Object.isFrozen(allAuthzFailures())).toBe(true)
  })

  it('FORBIDDEN and INTERNAL are distinct', () => {
    expect(AUTHZ_FAILURE.FORBIDDEN).not.toBe(AUTHZ_FAILURE.INTERNAL)
  })

  it('authentication failures are not authorization failures', () => {
    expect(isAuthzFailure('MISMATCH')).toBe(false)
    expect(isAuthzFailure('UNKNOWN_SUBJECT')).toBe(false)
  })
})

describe('authz-failure — user message', () => {
  it('FORBIDDEN returns the forbidden-specific message', () => {
    expect(toUserMessage(AUTHZ_FAILURE.FORBIDDEN)).toMatch(/permission/i)
  })

  it('every other variant collapses to the same generic message', () => {
    const messages = new Set([
      toUserMessage(AUTHZ_FAILURE.UNKNOWN_ACTION),
      toUserMessage(AUTHZ_FAILURE.NO_PRINCIPAL),
      toUserMessage(AUTHZ_FAILURE.INTERNAL),
    ])
    expect(messages.size).toBe(1)
  })

  it('accepts a project binding that overrides copy', () => {
    const custom = toUserMessage(AUTHZ_FAILURE.FORBIDDEN, { FORBIDDEN: 'Nope.' })
    expect(custom).toBe('Nope.')
  })

  it('a project binding for FORBIDDEN does not affect other variants', () => {
    const bound = { FORBIDDEN: 'Nope.' }
    expect(toUserMessage(AUTHZ_FAILURE.INTERNAL, bound)).not.toBe('Nope.')
  })
})

describe('authz-failure — audit codes', () => {
  it('every variant produces a distinct audit code', () => {
    const codes = new Set(allAuthzFailures().map(toAuditCode))
    expect(codes.size).toBe(allAuthzFailures().length)
  })

  it('audit codes are prefixed to distinguish from auth codes', () => {
    for (const v of allAuthzFailures()) {
      expect(toAuditCode(v).startsWith('AUTHZ_')).toBe(true)
    }
  })
})
