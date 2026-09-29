/**
 * result.test.ts — tests for the `result` primitive.
 *
 * Test cases are derived directly from the `tests:` block of result.yaml.
 */

import { describe, it, expect } from 'vitest'
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  match,
  map,
  flatMap,
  type Result,
} from './result'

describe('result — construction', () => {
  it('ok(v) produces a success result carrying v', () => {
    const r = ok(42)
    expect(isOk(r)).toBe(true)
    if (r.ok) expect(r.value).toBe(42)
  })

  it('err(e) produces a failure result carrying e', () => {
    const r = err('failed')
    expect(isErr(r)).toBe(true)
    if (!r.ok) expect(r.error).toBe('failed')
  })

  it('ok(undefined) is valid — void success is permitted', () => {
    expect(isOk(ok(undefined))).toBe(true)
  })

  it('err does not throw when constructed', () => {
    expect(() => err(new Error('boom'))).not.toThrow()
  })
})

describe('result — type guards', () => {
  it('isOk / isErr are exact complements', () => {
    const good: Result<number, string> = ok(1)
    const bad: Result<number, string> = err('x')

    expect(isOk(good)).toBe(true)
    expect(isErr(good)).toBe(false)
    expect(isOk(bad)).toBe(false)
    expect(isErr(bad)).toBe(true)
  })
})

describe('result — unwrap', () => {
  it('unwrap returns the value on Ok', () => {
    expect(unwrap(ok(7))).toBe(7)
  })

  it('unwrap throws on Err — programmer error, not expected failure', () => {
    expect(() => unwrap(err(new Error('boom')))).toThrow('boom')
  })

  it('unwrapOr returns fallback on Err', () => {
    expect(unwrapOr(err('x'), 0)).toBe(0)
  })

  it('unwrapOr returns value on Ok', () => {
    expect(unwrapOr(ok(5), 0)).toBe(5)
  })
})

describe('result — match', () => {
  it('match folds both variants into a single value', () => {
    const double = (n: number) => n * 2
    const zero = () => 0

    expect(match(ok(21), { ok: double, err: zero })).toBe(42)
    expect(match(err('x'), { ok: double, err: zero })).toBe(0)
  })
})

describe('result — map', () => {
  it('map transforms the value inside Ok', () => {
    const r = map(ok(5), (n) => n + 1)
    expect(isOk(r) && r.value === 6).toBe(true)
  })

  it('map passes Err through unchanged', () => {
    const original = err('boom')
    const r = map(original, (n: number) => n + 1)
    expect(r).toBe(original)
  })
})

describe('result — flatMap', () => {
  it('flatMap chains a fallible computation on Ok', () => {
    const half = (n: number): Result<number, string> =>
      n % 2 === 0 ? ok(n / 2) : err('not even')

    expect(isOk(flatMap(ok(8), half))).toBe(true)
    expect(isErr(flatMap(ok(7), half))).toBe(true)
  })

  it('flatMap short-circuits on Err without calling fn', () => {
    let called = false
    const fn = (n: number) => {
      called = true
      return ok(n)
    }
    flatMap(err('x'), fn)
    expect(called).toBe(false)
  })
})