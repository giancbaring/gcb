/**
 * validate-input.test.ts — tests for the `validate-input` function.
 */

import { describe, it, expect } from 'vitest'
import { validateInput, type Validator } from './validate-input'

const alwaysPass: Validator = { name: 'always-pass', check: () => true }
const alwaysFail: Validator = { name: 'always-fail', check: () => false }

const mustBeString: Validator = {
  name: 'must-be-string',
  check: (v) => typeof v === 'string',
}

const mustBeLonger: Validator = {
  name: 'must-be-longer',
  check: (v) => typeof v === 'string' && v.length > 3,
}

const throws: Validator = {
  name: 'throws',
  check: () => {
    throw new Error('boom')
  },
}

describe('validate-input — happy path', () => {
  it('returns Ok when the validator list is empty', () => {
    const r = validateInput('anything', [])
    expect(r.ok).toBe(true)
  })

  it('returns Ok when all validators pass', () => {
    const r = validateInput('hello', [mustBeString, mustBeLonger])
    expect(r.ok).toBe(true)
  })

  it('returns Ok carrying the original value', () => {
    const value = { a: 1 }
    const r = validateInput(value, [alwaysPass])
    if (!r.ok) throw new Error('expected ok')
    expect(r.value).toBe(value)
  })
})

describe('validate-input — failures', () => {
  it('returns Err carrying one failure for a single failing validator', () => {
    const r = validateInput('x', [mustBeLonger])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.length).toBe(1)
      expect(r.error[0].validator).toBe('must-be-longer')
    }
  })

  it('collects every failure, not just the first', () => {
    const r = validateInput(42, [mustBeString, mustBeLonger])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.length).toBe(2)
  })

  it('preserves the order the validators ran in', () => {
    const r = validateInput(42, [mustBeString, mustBeLonger, alwaysFail])
    if (r.ok) throw new Error('expected err')
    expect(r.error.map((f) => f.validator)).toEqual([
      'must-be-string',
      'must-be-longer',
      'always-fail',
    ])
  })

  it('carries only the failing validators', () => {
    const r = validateInput('hi', [alwaysPass, mustBeLonger, alwaysPass])
    if (r.ok) throw new Error('expected err')
    expect(r.error.length).toBe(1)
    expect(r.error[0].validator).toBe('must-be-longer')
  })

  it('the failure list is frozen', () => {
    const r = validateInput('x', [mustBeLonger])
    if (r.ok) throw new Error('expected err')
    expect(Object.isFrozen(r.error)).toBe(true)
  })
})

describe('validate-input — throwing validators', () => {
  it('records a throwing validator as a failure', () => {
    const r = validateInput('anything', [throws])
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.length).toBe(1)
      expect(r.error[0].validator).toBe('throws')
      expect(r.error[0].reason).toContain('threw')
    }
  })

  it('does not stop the pipeline when a validator throws', () => {
    const r = validateInput('anything', [throws, alwaysPass, alwaysFail])
    if (r.ok) throw new Error('expected err')
    expect(r.error.length).toBe(2)
    expect(r.error.map((f) => f.validator)).toEqual(['throws', 'always-fail'])
  })

  it('does not propagate the thrown error text', () => {
    const leaky: Validator = {
      name: 'leaky',
      check: () => {
        throw new Error('internal path visible')
      },
    }
    const r = validateInput('x', [leaky])
    if (r.ok) throw new Error('expected err')
    expect(JSON.stringify(r)).not.toContain('internal path')
  })
})

describe('validate-input — purity', () => {
  it('does not mutate the value', () => {
    const value = { a: 1, b: 2 }
    const before = JSON.stringify(value)
    validateInput(value, [alwaysPass, alwaysFail])
    expect(JSON.stringify(value)).toBe(before)
  })

  it('never throws', () => {
    expect(() => validateInput('x', [])).not.toThrow()
    expect(() => validateInput('x', [throws])).not.toThrow()
    expect(() => validateInput(null, [alwaysFail, throws])).not.toThrow()
  })
})
