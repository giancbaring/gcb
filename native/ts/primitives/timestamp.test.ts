/**
 * timestamp.test.ts — tests for the `timestamp` primitive.
 * Cases derived from the `tests:` block of timestamp.yaml.
 */

import { describe, it, expect } from 'vitest'
import {
  fromMillis,
  duration,
  now,
  toMillis,
  isAfter,
  isBefore,
  isEqual,
  add,
  subtract,
  diff,
} from './timestamp'

describe('timestamp — construction', () => {
  it('fromMillis(0) represents the Unix epoch', () => {
    const t = fromMillis(0)
    expect(toMillis(t)).toBe(0)
    expect(new Date(t).toISOString()).toBe('1970-01-01T00:00:00.000Z')
  })

  it('now() returns an instant', () => {
    const t = now()
    expect(typeof toMillis(t)).toBe('number')
    expect(toMillis(t)).toBeGreaterThan(0)
  })

  it('now() returns a value >= a previously captured instant', () => {
    const earlier = now()
    const later = now()
    expect(toMillis(later)).toBeGreaterThanOrEqual(toMillis(earlier))
  })
})

describe('timestamp — equality', () => {
  it('two Timestamps from the same instant are equal', () => {
    const a = fromMillis(1_700_000_000_000)
    const b = fromMillis(1_700_000_000_000)
    expect(isEqual(a, b)).toBe(true)
  })

  it('different instants are not equal', () => {
    const a = fromMillis(1000)
    const b = fromMillis(2000)
    expect(isEqual(a, b)).toBe(false)
  })
})

describe('timestamp — ordering', () => {
  it('isAfter is true when the first is later', () => {
    const earlier = fromMillis(1000)
    const later = fromMillis(2000)
    expect(isAfter(later, earlier)).toBe(true)
    expect(isAfter(earlier, later)).toBe(false)
  })

  it('isBefore is true when the first is earlier', () => {
    const earlier = fromMillis(1000)
    const later = fromMillis(2000)
    expect(isBefore(earlier, later)).toBe(true)
    expect(isBefore(later, earlier)).toBe(false)
  })
})

describe('timestamp — arithmetic', () => {
  it('add returns a new Timestamp', () => {
    const t = fromMillis(1000)
    const t2 = add(t, duration(500))
    expect(toMillis(t2)).toBe(1500)
    expect(toMillis(t)).toBe(1000) // original unchanged
  })

  it('subtract returns a new Timestamp', () => {
    const t = fromMillis(1000)
    const t2 = subtract(t, duration(400))
    expect(toMillis(t2)).toBe(600)
    expect(toMillis(t)).toBe(1000)
  })

  it('diff returns a signed Duration', () => {
    const a = fromMillis(2000)
    const b = fromMillis(1500)
    expect(diff(a, b)).toBe(500)
    expect(diff(b, a)).toBe(-500)
  })
})

describe('timestamp — immutability', () => {
  it('reading does not change the value', () => {
    const t = fromMillis(1700000000000)
    const before = toMillis(t)
    isEqual(t, t)
    isAfter(t, t)
    diff(t, t)
    expect(toMillis(t)).toBe(before)
  })
})
