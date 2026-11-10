/**
 * rate-limit-failure.test.ts — tests for the `rate-limit-failure` primitive.
 */

import { describe, it, expect } from 'vitest'
import {
  RATE_LIMIT_FAILURE,
  isRateLimitFailure,
  allRateLimitFailures,
  toAuditCode,
} from './rate-limit-failure'

describe('rate-limit-failure — guard', () => {
  it('accepts every declared variant', () => {
    for (const v of allRateLimitFailures()) {
      expect(isRateLimitFailure(v)).toBe(true)
    }
  })

  it('rejects unknown strings', () => {
    expect(isRateLimitFailure('FORBIDDEN')).toBe(false)
    expect(isRateLimitFailure('MISMATCH')).toBe(false)
    expect(isRateLimitFailure('')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isRateLimitFailure(42)).toBe(false)
    expect(isRateLimitFailure(null)).toBe(false)
    expect(isRateLimitFailure(undefined)).toBe(false)
  })
})

describe('rate-limit-failure — set integrity', () => {
  it('contains exactly two distinct values', () => {
    expect(new Set(allRateLimitFailures()).size).toBe(2)
  })

  it('allRateLimitFailures returns a frozen array', () => {
    expect(Object.isFrozen(allRateLimitFailures())).toBe(true)
  })

  it('RATE_LIMITED and INTERNAL are distinct', () => {
    expect(RATE_LIMIT_FAILURE.RATE_LIMITED).not.toBe(RATE_LIMIT_FAILURE.INTERNAL)
  })
})

describe('rate-limit-failure — audit codes', () => {
  it('every variant produces a distinct audit code', () => {
    const codes = new Set(allRateLimitFailures().map(toAuditCode))
    expect(codes.size).toBe(allRateLimitFailures().length)
  })

  it('audit codes are prefixed to distinguish from other domains', () => {
    for (const v of allRateLimitFailures()) {
      expect(toAuditCode(v).startsWith('RATELIMIT_')).toBe(true)
    }
  })
})
