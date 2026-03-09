/**
 * Retry utility with exponential backoff
 * Pattern: 1s, 2s, 4s delays between retries
 */

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  onRetry?: (attempt: number, error: Error) => void
}

export async function retryWithBackoff<T>(
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
        const delay = baseDelayMs * Math.pow(2, attempt) // 1s, 2s, 4s
        onRetry?.(attempt + 1, lastError)
        await sleep(delay)
      }
    }
  }

  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
