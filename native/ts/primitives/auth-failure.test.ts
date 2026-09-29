/**
 * auth-failure.test.ts — tests for the `auth-failure` primitive.
 * Cases derived from the `tests:` block of auth-failure.yaml.
 */

import { describe, it, expect } from 'vitest'
import {
  AUTH_FAILURE,
  isAuthFailure,
  toUserMessage,
  toAuditCode,
  type AuthFailure,
} from './auth-failure'

const ALL_VARIANTS: readonly AuthFailure[] = [
  AUTH_FAILURE.MISSING,
  AUTH_FAILURE.MALFORMED,
  AUTH_FAILURE.UNKNOWN_SUBJECT,
  AUTH_FAILURE.MISMATCH,
  AUTH_FAILURE.EXPIRED,
  AUTH_FAILURE.LOCKED,
  AUTH_FAILURE.UNVERIFIED,
  AUTH_FAILURE.INTERNAL,
]

describe('auth-failure — guard', () => {
  it('accepts every declared variant', () => {
    for (const v of ALL_VARIANTS) {
      expect(isAuthFailure(v)).toBe(true)
    }
  })

  it('rejects unknown strings', () => {
    expect(isAuthFailure('OK')).toBe(false)
    expect(isAuthFailure('')).toBe(false)
    expect(isAuthFailure('LOCKED_OUT')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isAuthFailure(42)).toBe(false)
    expect(isAuthFailure(null)).toBe(false)
    expect(isAuthFailure(undefined)).toBe(false)
    expect(isAuthFailure({})).toBe(false)
  })
})

describe('auth-failure — user message collapse', () => {
  const genericCases: AuthFailure[] = [
    AUTH_FAILURE.MISSING,
    AUTH_FAILURE.MALFORMED,
    AUTH_FAILURE.UNKNOWN_SUBJECT,
    AUTH_FAILURE.MISMATCH,
    AUTH_FAILURE.EXPIRED,
    AUTH_FAILURE.INTERNAL,
  ]

  it('every non-disclosable variant returns the same generic string', () => {
    const messages = new Set(genericCases.map((v) => toUserMessage(v)))
    expect(messages.size).toBe(1)
    expect([...messages][0]).toBe('Invalid credentials.')
  })

  it('UNKNOWN_SUBJECT and MISMATCH are indistinguishable to the caller', () => {
    expect(toUserMessage(AUTH_FAILURE.UNKNOWN_SUBJECT)).toBe(
      toUserMessage(AUTH_FAILURE.MISMATCH),
    )
  })

  it('LOCKED returns the locked-specific message', () => {
    expect(toUserMessage(AUTH_FAILURE.LOCKED)).toMatch(/locked/i)
  })

  it('UNVERIFIED returns the unverified-specific message', () => {
    expect(toUserMessage(AUTH_FAILURE.UNVERIFIED)).toMatch(/confirm|verif/i)
  })

  it('accepts a project binding that overrides copy', () => {
    const custom = toUserMessage(AUTH_FAILURE.MISMATCH, { generic: 'Nope.' })
    expect(custom).toBe('Nope.')
  })

  it('accepts a project binding for LOCKED only, other variants keep defaults', () => {
    const locked = toUserMessage(AUTH_FAILURE.LOCKED, { LOCKED: 'Account frozen.' })
    expect(locked).toBe('Account frozen.')
    expect(toUserMessage(AUTH_FAILURE.MISMATCH)).toBe('Invalid credentials.')
  })
})

describe('auth-failure — audit codes', () => {
  it('every variant produces a distinct audit code', () => {
    const codes = new Set(ALL_VARIANTS.map(toAuditCode))
    expect(codes.size).toBe(ALL_VARIANTS.length)
  })

  it('audit code preserves the variant identifier', () => {
    for (const v of ALL_VARIANTS) {
      expect(toAuditCode(v)).toBe(`AUTH_${v}`)
    }
  })
})
