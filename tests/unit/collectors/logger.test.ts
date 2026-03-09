/**
 * Tests for collection logger utility
 */

import { describe, it, expect, vi } from 'vitest'

// Re-implement createCollectResult for Node testing (mirrors _shared/logger.ts)
interface CollectResult {
  source: string
  repositoryId: number
  status: 'success' | 'failed' | 'partial'
  rowsCollected: number
  errorMessage?: string
  durationMs: number
}

function createCollectResult(
  source: string,
  repositoryId: number,
  status: 'success' | 'failed' | 'partial',
  rowsCollected: number,
  startedAt: Date,
  errorMessage?: string
): CollectResult {
  return {
    source,
    repositoryId,
    status,
    rowsCollected,
    durationMs: Date.now() - startedAt.getTime(),
    errorMessage
  }
}

describe('createCollectResult', () => {
  it('creates success result with correct fields', () => {
    const startedAt = new Date(Date.now() - 1500) // 1.5 seconds ago

    const result = createCollectResult('sentry', 1, 'success', 4, startedAt)

    expect(result.source).toBe('sentry')
    expect(result.repositoryId).toBe(1)
    expect(result.status).toBe('success')
    expect(result.rowsCollected).toBe(4)
    expect(result.durationMs).toBeGreaterThanOrEqual(1500)
    expect(result.durationMs).toBeLessThan(2000)
    expect(result.errorMessage).toBeUndefined()
  })

  it('creates failed result with error message', () => {
    const startedAt = new Date(Date.now() - 500)

    const result = createCollectResult(
      'sentry',
      1,
      'failed',
      0,
      startedAt,
      'API rate limit exceeded'
    )

    expect(result.status).toBe('failed')
    expect(result.rowsCollected).toBe(0)
    expect(result.errorMessage).toBe('API rate limit exceeded')
  })

  it('creates partial result', () => {
    const startedAt = new Date()

    const result = createCollectResult('debugbear', 2, 'partial', 2, startedAt)

    expect(result.source).toBe('debugbear')
    expect(result.status).toBe('partial')
    expect(result.rowsCollected).toBe(2)
  })

  it('calculates duration correctly', () => {
    vi.useFakeTimers()
    const startedAt = new Date()

    vi.advanceTimersByTime(2500)

    const result = createCollectResult('github', 1, 'success', 10, startedAt)

    expect(result.durationMs).toBe(2500)

    vi.useRealTimers()
  })
})

describe('CollectionLogInsert structure', () => {
  interface CollectionLogInsert {
    source_id: number
    repository_id: number
    status: 'success' | 'failed' | 'partial'
    rows_collected: number
    error_message?: string
    duration_ms: number
    started_at: string
  }

  it('validates required fields', () => {
    const log: CollectionLogInsert = {
      source_id: 1,
      repository_id: 1,
      status: 'success',
      rows_collected: 4,
      duration_ms: 1500,
      started_at: new Date().toISOString()
    }

    expect(log.source_id).toBeTypeOf('number')
    expect(log.repository_id).toBeTypeOf('number')
    expect(['success', 'failed', 'partial']).toContain(log.status)
    expect(log.rows_collected).toBeGreaterThanOrEqual(0)
    expect(log.duration_ms).toBeGreaterThanOrEqual(0)
    expect(log.started_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('allows optional error_message', () => {
    const logWithError: CollectionLogInsert = {
      source_id: 1,
      repository_id: 1,
      status: 'failed',
      rows_collected: 0,
      error_message: 'Connection timeout',
      duration_ms: 5000,
      started_at: new Date().toISOString()
    }

    expect(logWithError.error_message).toBe('Connection timeout')

    const logWithoutError: CollectionLogInsert = {
      source_id: 1,
      repository_id: 1,
      status: 'success',
      rows_collected: 10,
      duration_ms: 800,
      started_at: new Date().toISOString()
    }

    expect(logWithoutError.error_message).toBeUndefined()
  })
})
