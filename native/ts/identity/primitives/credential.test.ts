/**
 * credential.test.ts — tests for the `credential` primitive.
 * Cases derived from the `tests:` block of credential.yaml.
 */

import { describe, it, expect } from 'vitest'
import { Credential } from './credential'

describe('credential — opacity', () => {
  it('toString redacts the raw value', () => {
    const c = Credential.fromRaw('hunter2')
    expect(String(c)).not.toContain('hunter2')
    expect(String(c)).toBe('[credential]')
  })

  it('JSON.stringify redacts the raw value', () => {
    const c = Credential.fromRaw('hunter2')
    expect(JSON.stringify(c)).not.toContain('hunter2')
    expect(JSON.stringify(c)).toBe('"[credential]"')
  })

  it('template interpolation redacts the raw value', () => {
    const c = Credential.fromRaw('hunter2')
    const s = `value: ${c}`
    expect(s).not.toContain('hunter2')
  })

  it('reveal exposes the raw value to explicit callers', () => {
    const c = Credential.fromRaw('hunter2')
    expect(c.reveal()).toBe('hunter2')
  })
})

describe('credential — construction', () => {
  it('two Credentials from the same raw value are distinct objects', () => {
    const a = Credential.fromRaw('hunter2')
    const b = Credential.fromRaw('hunter2')
    expect(a).not.toBe(b)
    expect(a.reveal()).toBe(b.reveal())
  })

  it('accepts an empty string without throwing', () => {
    expect(() => Credential.fromRaw('')).not.toThrow()
  })
})
