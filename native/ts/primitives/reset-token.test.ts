/**
 * reset-token.test.ts — tests for the `reset-token` primitive.
 */

import { describe, it, expect } from 'vitest'
import {
  makeResetToken,
  resetTokensEqual,
  type ResetTokenBinding,
} from './reset-token'

const passwordReset: ResetTokenBinding = {
  purpose: 'password-reset',
  validate: (raw) => /^[0-9a-f]{64}$/.test(raw),
}

const emailChange: ResetTokenBinding = {
  purpose: 'email-change',
  validate: (raw) => /^[0-9a-f]{64}$/.test(raw),
}

const validToken = 'a'.repeat(64)

describe('reset-token — construction', () => {
  it('accepts a valid value in a purpose', () => {
    const r = makeResetToken(passwordReset, validToken)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.purpose).toBe('password-reset')
      expect(r.value.token).toBe(validToken)
    }
  })

  it('rejects an empty value', () => {
    const r = makeResetToken(passwordReset, '')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('empty')
  })

  it('rejects a value that fails the binding validate', () => {
    const r = makeResetToken(passwordReset, 'short')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('password-reset')
  })

  it('rejects a missing purpose', () => {
    const bad: ResetTokenBinding = { purpose: '', validate: () => true }
    const r = makeResetToken(bad, validToken)
    expect(r.ok).toBe(false)
  })

  it('rejects a non-string value', () => {
    const r = makeResetToken(passwordReset, 42 as never)
    expect(r.ok).toBe(false)
  })

  it('the constructed value is frozen', () => {
    const r = makeResetToken(passwordReset, validToken)
    expect(r.ok && Object.isFrozen(r.value)).toBe(true)
  })
})

describe('reset-token — equality', () => {
  it('same value and purpose are equal', () => {
    const a = makeResetToken(passwordReset, validToken)
    const b = makeResetToken(passwordReset, validToken)
    if (!a.ok || !b.ok) throw new Error('expected both ok')
    expect(resetTokensEqual(a.value, b.value)).toBe(true)
  })

  it('same value but different purpose are not equal', () => {
    const a = makeResetToken(passwordReset, validToken)
    const b = makeResetToken(emailChange, validToken)
    if (!a.ok || !b.ok) throw new Error('expected both ok')
    expect(resetTokensEqual(a.value, b.value)).toBe(false)
  })

  it('different values are not equal', () => {
    const a = makeResetToken(passwordReset, 'a'.repeat(64))
    const b = makeResetToken(passwordReset, 'b'.repeat(64))
    if (!a.ok || !b.ok) throw new Error('expected both ok')
    expect(resetTokensEqual(a.value, b.value)).toBe(false)
  })
})

describe('reset-token — never throws', () => {
  it('does not throw on any input', () => {
    expect(() => makeResetToken(passwordReset, validToken)).not.toThrow()
    expect(() => makeResetToken(passwordReset, '')).not.toThrow()
    expect(() => makeResetToken(passwordReset, 42 as never)).not.toThrow()
  })
})
