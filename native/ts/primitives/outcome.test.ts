/**
 * outcome.test.ts — tests for the `outcome` primitive.
 */

import { describe, it, expect } from 'vitest'
import { OUTCOME, isOutcome, allOutcomes, type Outcome } from './outcome'

describe('outcome — guard', () => {
  it('accepts every declared variant', () => {
    const variants: Outcome[] = [
      OUTCOME.SUCCESS,
      OUTCOME.FAILURE,
      OUTCOME.DENIED,
      OUTCOME.ERROR,
    ]
    for (const v of variants) {
      expect(isOutcome(v)).toBe(true)
    }
  })

  it('rejects unknown strings', () => {
    expect(isOutcome('OK')).toBe(false)
    expect(isOutcome('')).toBe(false)
    expect(isOutcome('SUCCESSFUL')).toBe(false)
    expect(isOutcome('Failed')).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isOutcome(42)).toBe(false)
    expect(isOutcome(null)).toBe(false)
    expect(isOutcome(undefined)).toBe(false)
    expect(isOutcome({ outcome: 'SUCCESS' })).toBe(false)
    expect(isOutcome(['SUCCESS'])).toBe(false)
  })
})

describe('outcome — set integrity', () => {
  it('contains exactly four distinct values', () => {
    const set = new Set(allOutcomes())
    expect(set.size).toBe(4)
  })

  it('allOutcomes returns a frozen array', () => {
    expect(Object.isFrozen(allOutcomes())).toBe(true)
  })

  it('DENIED is distinct from FAILURE', () => {
    expect(OUTCOME.DENIED).not.toBe(OUTCOME.FAILURE)
  })

  it('ERROR is distinct from FAILURE', () => {
    expect(OUTCOME.ERROR).not.toBe(OUTCOME.FAILURE)
  })
})
