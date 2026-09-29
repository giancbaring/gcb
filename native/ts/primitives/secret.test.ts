/**
 * secret.test.ts — tests for the `secret` primitive.
 */

import { describe, it, expect } from 'vitest'
import { Secret } from './secret'

describe('secret — construction', () => {
  it('accepts a storage record with algorithm and hash', () => {
    const s = Secret.fromStorage({ algorithm: 'argon2id', hash: 'abcdef' })
    expect(s.reveal().algorithm).toBe('argon2id')
    expect(s.reveal().hash).toBe('abcdef')
  })

  it('rejects a record missing an algorithm', () => {
    expect(() => Secret.fromStorage({ algorithm: '', hash: 'x' })).toThrow()
  })

  it('rejects a record missing a hash', () => {
    expect(() => Secret.fromStorage({ algorithm: 'sha256', hash: '' })).toThrow()
  })

  it('exposes algorithm and hash via reveal', () => {
    const s = Secret.fromStorage({
      algorithm: 'sha256',
      hash: 'deadbeef',
      parameters: { rounds: 1000 },
    })
    expect(s.reveal().parameters).toEqual({ rounds: 1000 })
  })
})

describe('secret — opacity', () => {
  it('toString redacts the hash', () => {
    const s = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })
    expect(String(s)).not.toContain('deadbeef')
    expect(String(s)).toBe('[secret]')
  })

  it('JSON.stringify redacts the hash', () => {
    const s = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })
    expect(JSON.stringify(s)).not.toContain('deadbeef')
  })

  it('two Secrets from the same storage are distinct objects', () => {
    const a = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })
    const b = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })
    expect(a).not.toBe(b)
  })

  it('the storage record is frozen after construction', () => {
    const s = Secret.fromStorage({ algorithm: 'sha256', hash: 'deadbeef' })
    expect(Object.isFrozen(s.reveal())).toBe(true)
  })
})
