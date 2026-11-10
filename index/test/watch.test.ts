import { afterEach, describe, expect, it, vi } from 'vitest'
import { debounceChange } from '../lib/watch.js'

describe('watch debounce', () => {
  afterEach(() => vi.useRealTimers())

  it('coalesces five rapid changes into one callback', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const debounced = debounceChange(onChange)

    for (let index = 0; index < 5; index++) debounced()
    expect(onChange).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)

    expect(onChange).toHaveBeenCalledTimes(1)
  })
})