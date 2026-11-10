/**
 * rate-limit.test.ts - tests for the `rate-limit` composition.
 */

import { describe, it, expect } from 'vitest'
import { fromMillis, duration } from '../../primitives/timestamp'
import {
  RATE_LIMIT_FAILURE,
} from '../primitives/rate-limit-failure'
import {
  rateLimit,
  type RateLimitPolicy,
  type RateLimitStore,
} from './rate-limit'

const now = fromMillis(1_700_000_000_000)
const policy: RateLimitPolicy = { limit: 5, window: duration(900_000) }

function storeReturning(allowed: boolean, calls: unknown[][] = []): RateLimitStore {
  return {
    checkAndRecord: (key, receivedPolicy, receivedNow) => {
      calls.push([key, receivedPolicy, receivedNow])
      return { allowed }
    },
  }
}

describe('rate-limit - outcomes', () => {
  it('returns Ok carrying void when the store allows', async () => {
    const r = await rateLimit('login:GMS001', policy, storeReturning(true), () => now)
    expect(r).toEqual({ ok: true, value: undefined })
  })

  it('returns Err RATE_LIMITED when the store refuses', async () => {
    const r = await rateLimit('login:GMS001', policy, storeReturning(false), () => now)
    expect(r).toEqual({ ok: false, error: RATE_LIMIT_FAILURE.RATE_LIMITED })
  })

  it('returns Err INTERNAL when the store throws', async () => {
    const store: RateLimitStore = {
      checkAndRecord: () => {
        throw new Error('store unavailable')
      },
    }
    const r = await rateLimit('login:GMS001', policy, store, () => now)
    expect(r).toEqual({ ok: false, error: RATE_LIMIT_FAILURE.INTERNAL })
  })

  it('returns Err INTERNAL when the store rejects asynchronously', async () => {
    const store: RateLimitStore = {
      checkAndRecord: async () => {
        throw new Error('store unavailable')
      },
    }
    const r = await rateLimit('login:GMS001', policy, store, () => now)
    expect(r).toEqual({ ok: false, error: RATE_LIMIT_FAILURE.INTERNAL })
  })

  it('keeps RATE_LIMITED and INTERNAL distinct', () => {
    expect(RATE_LIMIT_FAILURE.RATE_LIMITED).not.toBe(RATE_LIMIT_FAILURE.INTERNAL)
  })
})

describe('rate-limit - dependencies', () => {
  it('passes the key through unchanged', async () => {
    const calls: unknown[][] = []
    await rateLimit('opaque:key/value', policy, storeReturning(true, calls), () => now)
    expect(calls[0]?.[0]).toBe('opaque:key/value')
  })

  it('passes the policy through unchanged', async () => {
    const calls: unknown[][] = []
    await rateLimit('login:GMS001', policy, storeReturning(true, calls), () => now)
    expect(calls[0]?.[1]).toBe(policy)
  })

  it('invokes the clock exactly once per call', async () => {
    let calls = 0
    await rateLimit('login:GMS001', policy, storeReturning(true), () => {
      calls += 1
      return now
    })
    expect(calls).toBe(1)
  })

  it('does not throw when the store failure is handled', async () => {
    const store: RateLimitStore = {
      checkAndRecord: () => {
        throw new Error('expected failure')
      },
    }
    await expect(rateLimit('login:GMS001', policy, store, () => now)).resolves.toEqual({
      ok: false,
      error: RATE_LIMIT_FAILURE.INTERNAL,
    })
  })
})
