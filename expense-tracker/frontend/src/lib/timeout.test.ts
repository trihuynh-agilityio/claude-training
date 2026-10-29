import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withTimeout } from './timeout'

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with the value when the promise settles first', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 2000)).resolves.toBe('ok')
  })

  it('rejects when the promise rejects first', async () => {
    const failure = new Error('boom')
    await expect(withTimeout(Promise.reject(failure), 2000)).rejects.toBe(failure)
  })

  it('rejects once the limit passes', async () => {
    const never = new Promise<string>(() => {})
    const onSettled = vi.fn()
    const result = withTimeout(never, 2000).then(
      () => onSettled('resolved'),
      () => onSettled('rejected'),
    )

    await vi.advanceTimersByTimeAsync(1999)
    expect(onSettled).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await result
    expect(onSettled).toHaveBeenCalledWith('rejected')
  })

  it('clears the timer after the promise settles', async () => {
    await withTimeout(Promise.resolve(1), 2000)
    expect(vi.getTimerCount()).toBe(0)

    await withTimeout(Promise.reject(new Error('x')), 2000).catch(() => {})
    expect(vi.getTimerCount()).toBe(0)
  })
})
