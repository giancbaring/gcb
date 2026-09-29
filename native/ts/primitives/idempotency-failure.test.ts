/**
 * idempotency-failure.test.ts — tests for the `idempotency-failure` primitive.
 */

import { describe, it, expect } from 'vitest'
import {
  IDEMPOTENCY_FAILURE,
  isIdempotencyFailure,
  allIdempotencyFailures,
  toAuditCode,
} from './idempotency-failure'

describe('idempotency-failure — guard', () => {
  it('accepts every declared variant', () => {
    for (const v of allIdempotencyFailures()) {
      expect(isIdempotencyFailure(v)).toBe(true)
    }
  })

  it('rejects unknown strings', () => {
    expect(isIdempotencyFailure('FORBIDDEN')).toBe(false)
    expect(isIdempotencyFailure('')).toBe(false)
    expect(isIdempotencyFailure('in_progress')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isIdempotencyFailure(42)).toBe(false)
    expect(isIdempotencyFailure(null)).toBe(false)
    expect(isIdempotencyFailure(undefined)).toBe(false)
  })
})

describe('idempotency-failure — set integrity', () => {
  it('contains exactly three distinct values', () => {
    expect(new Set(allIdempotencyFailures()).size).toBe(3)
  })

  it('allIdempotencyFailures returns a frozen array', () => {
    expect(Object.isFrozen(allIdempotencyFailures())).toBe(true)
  })

  it('IN_PROGRESS and STORE_FAULT are distinct', () => {
    expect(IDEMPOTENCY_FAILURE.IN_PROGRESS).not.toBe(IDEMPOTENCY_FAILURE.STORE_FAULT)
  })
})

describe('idempotency-failure — audit codes', () => {
  it('every variant produces a distinct audit code', () => {
    const codes = new Set(allIdempotencyFailures().map(toAuditCode))
    expect(codes.size).toBe(allIdempotencyFailures().length)
  })

  it('audit codes are prefixed', () => {
    for (const v of allIdempotencyFailures()) {
      expect(toAuditCode(v).startsWith('IDEMPOTENCY_')).toBe(true)
    }
  })
})
