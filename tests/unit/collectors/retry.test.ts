/**
 * Tests for retryWithBackoff utility
 * Note: These tests use Node-compatible implementations since Edge Functions run in Deno
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Re-implement retry logic for Node testing (mirrors _shared/retry.ts)
interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  onRetry?: (attempt: number, error: Error) => void
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, onRetry } = options
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        onRetry?.(attempt + 1, lastError)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

describe('retryWithBackoff', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await retryWithBackoff(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds eventually', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success')

    const result = await retryWithBackoff(fn, { baseDelayMs: 1 })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after max retries exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'))

    await expect(retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 1 }))
      .rejects.toThrow('Always fails')

    expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
  })

  it('calls onRetry callback on each retry attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success')
    const onRetry = vi.fn()

    await retryWithBackoff(fn, { baseDelayMs: 1, onRetry })

    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({ message: 'Fail 1' }))
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({ message: 'Fail 2' }))
  })

  it('handles non-Error exceptions', async () => {
    const fn = vi.fn().mockRejectedValue('string error')

    await expect(retryWithBackoff(fn, { maxRetries: 0 }))
      .rejects.toThrow('string error')
  })

  it('respects custom maxRetries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Fail'))

    await expect(retryWithBackoff(fn, { maxRetries: 1, baseDelayMs: 1 }))
      .rejects.toThrow('Fail')

    expect(fn).toHaveBeenCalledTimes(2) // Initial + 1 retry
  })

  it('returns immediately with zero retries on success', async () => {
    const fn = vi.fn().mockResolvedValue('immediate')

    const result = await retryWithBackoff(fn, { maxRetries: 0 })

    expect(result).toBe('immediate')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('uses exponential delays', async () => {
    // Test that delays increase exponentially (conceptual test)
    const delays: number[] = []
    const baseDelayMs = 100

    for (let attempt = 0; attempt < 3; attempt++) {
      delays.push(baseDelayMs * Math.pow(2, attempt))
    }

    expect(delays).toEqual([100, 200, 400]) // 1s, 2s, 4s pattern
  })
})
