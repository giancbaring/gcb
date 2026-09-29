/**
 * idempotency-key.test.ts — tests for the `idempotency-key` primitive.
 */

import { describe, it, expect } from 'vitest'
import {
  makeIdempotencyKey,
  idempotencyKeysEqual,
  type KeyBinding,
} from './idempotency-key'

const uuidBinding: KeyBinding = {
  scope: 'change-role',
  validate: (raw) => /^[0-9a-f-]{36}$/.test(raw),
  normalize: (raw) => raw.trim().toLowerCase(),
}

const otherScopeBinding: KeyBinding = {
  scope: 'create-meeting',
  validate: (raw) => /^[0-9a-f-]{36}$/.test(raw),
  normalize: (raw) => raw.trim().toLowerCase(),
}

const anyBinding: KeyBinding = {
  scope: 'anything',
  validate: (raw) => raw.length > 0,
}

describe('idempotency-key — construction', () => {
  it('accepts a valid value in a scope', () => {
    const r = makeIdempotencyKey(uuidBinding, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.scope).toBe('change-role')
      expect(r.value.key).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    }
  })

  it('applies normalize before validate', () => {
    const r = makeIdempotencyKey(uuidBinding, '  A1B2C3D4-E5F6-7890-ABCD-EF1234567890  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.key).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
  })

  it('rejects an empty value', () => {
    const r = makeIdempotencyKey(anyBinding, '')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('empty')
  })

  it('rejects a whitespace-only value after normalize', () => {
    const r = makeIdempotencyKey(uuidBinding, '   ')
    expect(r.ok).toBe(false)
  })

  it('rejects a value that fails the binding validate', () => {
    const r = makeIdempotencyKey(uuidBinding, 'not-a-uuid')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('change-role')
  })

  it('rejects a missing scope', () => {
    const bad: KeyBinding = { scope: '', validate: () => true }
    const r = makeIdempotencyKey(bad, 'abc')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('scope')
  })

  it('rejects a non-string value', () => {
    const r = makeIdempotencyKey(anyBinding, 42 as never)
    expect(r.ok).toBe(false)
  })

  it('the constructed value is frozen', () => {
    const r = makeIdempotencyKey(anyBinding, 'abc')
    expect(r.ok && Object.isFrozen(r.value)).toBe(true)
  })
})

describe('idempotency-key — equality', () => {
  it('same value, same scope are equal', () => {
    const a = makeIdempotencyKey(uuidBinding, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    const b = makeIdempotencyKey(uuidBinding, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    if (!a.ok || !b.ok) throw new Error('expected both ok')
    expect(idempotencyKeysEqual(a.value, b.value)).toBe(true)
  })

  it('same value, different scope are not equal', () => {
    const a = makeIdempotencyKey(uuidBinding, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    const b = makeIdempotencyKey(otherScopeBinding, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    if (!a.ok || !b.ok) throw new Error('expected both ok')
    expect(idempotencyKeysEqual(a.value, b.value)).toBe(false)
  })

  it('different values, same scope are not equal', () => {
    const a = makeIdempotencyKey(uuidBinding, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    const b = makeIdempotencyKey(uuidBinding, 'b2c3d4e5-f6a7-8901-bcde-f12345678901')
    if (!a.ok || !b.ok) throw new Error('expected both ok')
    expect(idempotencyKeysEqual(a.value, b.value)).toBe(false)
  })

  it('normalization makes case differences equal', () => {
    const a = makeIdempotencyKey(uuidBinding, 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890')
    const b = makeIdempotencyKey(uuidBinding, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    if (!a.ok || !b.ok) throw new Error('expected both ok')
    expect(idempotencyKeysEqual(a.value, b.value)).toBe(true)
  })
})

describe('idempotency-key — never throws', () => {
  it('does not throw on any input', () => {
    expect(() => makeIdempotencyKey(anyBinding, 'abc')).not.toThrow()
    expect(() => makeIdempotencyKey(anyBinding, '')).not.toThrow()
    expect(() => makeIdempotencyKey(uuidBinding, 42 as never)).not.toThrow()
  })
})
