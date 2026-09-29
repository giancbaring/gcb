/**
 * identifier.test.ts — tests for the `identifier` primitive.
 * Cases derived from the `tests:` block of identifier.yaml.
 */

import { describe, it, expect } from 'vitest'
import {
  makeIdentifier,
  unsafeIdentifier,
  identifiersEqual,
  type IdentifierBinding,
} from './identifier'

const gmsBinding: IdentifierBinding = {
  namespace: 'gms-users',
  validate: (raw) => /^GMS\d{3}$/.test(raw),
  normalize: (raw) => raw.trim().toUpperCase(),
}

describe('identifier — construction', () => {
  it('accepts a valid value and returns Ok', () => {
    const r = makeIdentifier(gmsBinding, 'GMS001')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('GMS001')
  })

  it('rejects an invalid value and returns Err', () => {
    const r = makeIdentifier(gmsBinding, 'not-a-ukey')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('gms-users')
  })

  it('applies normalize before validate', () => {
    const r = makeIdentifier(gmsBinding, '  gms042  ')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe('GMS042')
  })

  it('does not throw on invalid input', () => {
    expect(() => makeIdentifier(gmsBinding, '')).not.toThrow()
  })
})

describe('identifier — equality', () => {
  it('same value, same namespace is equal', () => {
    const a = unsafeIdentifier('GMS001')
    const b = unsafeIdentifier('GMS001')
    expect(identifiersEqual(a, b)).toBe(true)
  })

  it('different values are not equal', () => {
    const a = unsafeIdentifier('GMS001')
    const b = unsafeIdentifier('GMS002')
    expect(identifiersEqual(a, b)).toBe(false)
  })
})

describe('identifier — stability', () => {
  it('value is unchanged after any read', () => {
    const id = unsafeIdentifier('GMS007')
    const before = id
    const _ = identifiersEqual(id, id)
    expect(id).toBe(before)
  })

  it('unsafeIdentifier preserves the exact string', () => {
    const raw = 'gms001'
    expect(unsafeIdentifier(raw)).toBe(raw)
  })
})
