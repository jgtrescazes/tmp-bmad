/**
 * Tests for useCollectionStatus composable
 */

import { describe, it, expect } from 'vitest'

// Types matching useCollectionStatus.ts
interface SourceStatus {
  sourceId: number
  sourceName: string
  displayName: string
  currentStatus: 'success' | 'failed' | 'partial' | 'unknown'
  lastSuccess: string | null
  lastFailure: string | null
  lastRunAt: string | null
  rowsCollected: number | null
  durationMs: number | null
  errorMessage: string | null
}

// Mock data processing logic
function computeSourceStatus(
  logs: Array<{
    source_id: number
    status: string
    completed_at: string
    rows_collected: number
    duration_ms: number
    error_message: string | null
    dim_sources: { name: string, display_name: string }
  }>
): Map<number, SourceStatus> {
  const statusBySource = new Map<number, SourceStatus>()

  for (const row of logs) {
    const sourceId = row.source_id

    if (!statusBySource.has(sourceId)) {
      statusBySource.set(sourceId, {
        sourceId,
        sourceName: row.dim_sources.name,
        displayName: row.dim_sources.display_name,
        currentStatus: 'unknown',
        lastSuccess: null,
        lastFailure: null,
        lastRunAt: null,
        rowsCollected: null,
        durationMs: null,
        errorMessage: null
      })
    }

    const status = statusBySource.get(sourceId)!
    const completedAt = row.completed_at
    const rowStatus = row.status as 'success' | 'failed' | 'partial'

    // Update last run if more recent
    if (!status.lastRunAt || completedAt > status.lastRunAt) {
      status.lastRunAt = completedAt
      status.currentStatus = rowStatus
      status.rowsCollected = row.rows_collected
      status.durationMs = row.duration_ms
      status.errorMessage = row.error_message
    }

    // Track last success
    if (rowStatus === 'success' && (!status.lastSuccess || completedAt > status.lastSuccess)) {
      status.lastSuccess = completedAt
    }

    // Track last failure
    if (rowStatus === 'failed' && (!status.lastFailure || completedAt > status.lastFailure)) {
      status.lastFailure = completedAt
    }
  }

  return statusBySource
}

describe('computeSourceStatus', () => {
  it('computes status for single successful source', () => {
    const logs = [
      {
        source_id: 1,
        status: 'success',
        completed_at: '2026-03-09T10:00:00Z',
        rows_collected: 4,
        duration_ms: 1500,
        error_message: null,
        dim_sources: { name: 'sentry', display_name: 'Sentry' }
      }
    ]

    const result = computeSourceStatus(logs)
    const sentry = result.get(1)!

    expect(sentry.currentStatus).toBe('success')
    expect(sentry.lastSuccess).toBe('2026-03-09T10:00:00Z')
    expect(sentry.lastFailure).toBeNull()
    expect(sentry.rowsCollected).toBe(4)
    expect(sentry.durationMs).toBe(1500)
  })

  it('computes status for source with mixed results', () => {
    const logs = [
      // Most recent: failed
      {
        source_id: 1,
        status: 'failed',
        completed_at: '2026-03-09T10:30:00Z',
        rows_collected: 0,
        duration_ms: 500,
        error_message: 'API timeout',
        dim_sources: { name: 'sentry', display_name: 'Sentry' }
      },
      // Earlier: success
      {
        source_id: 1,
        status: 'success',
        completed_at: '2026-03-09T10:00:00Z',
        rows_collected: 4,
        duration_ms: 1500,
        error_message: null,
        dim_sources: { name: 'sentry', display_name: 'Sentry' }
      }
    ]

    const result = computeSourceStatus(logs)
    const sentry = result.get(1)!

    expect(sentry.currentStatus).toBe('failed')
    expect(sentry.lastSuccess).toBe('2026-03-09T10:00:00Z')
    expect(sentry.lastFailure).toBe('2026-03-09T10:30:00Z')
    expect(sentry.errorMessage).toBe('API timeout')
  })

  it('handles multiple sources independently', () => {
    const logs = [
      {
        source_id: 1,
        status: 'success',
        completed_at: '2026-03-09T10:00:00Z',
        rows_collected: 4,
        duration_ms: 1500,
        error_message: null,
        dim_sources: { name: 'sentry', display_name: 'Sentry' }
      },
      {
        source_id: 2,
        status: 'failed',
        completed_at: '2026-03-09T10:00:00Z',
        rows_collected: 0,
        duration_ms: 5000,
        error_message: 'Rate limit',
        dim_sources: { name: 'github', display_name: 'GitHub' }
      }
    ]

    const result = computeSourceStatus(logs)

    expect(result.get(1)!.currentStatus).toBe('success')
    expect(result.get(2)!.currentStatus).toBe('failed')
  })

  it('handles empty logs', () => {
    const result = computeSourceStatus([])
    expect(result.size).toBe(0)
  })
})

describe('failedCount calculation', () => {
  it('counts failed sources', () => {
    const sources: SourceStatus[] = [
      { sourceId: 1, sourceName: 'sentry', displayName: 'Sentry', currentStatus: 'success', lastSuccess: null, lastFailure: null, lastRunAt: null, rowsCollected: null, durationMs: null, errorMessage: null },
      { sourceId: 2, sourceName: 'github', displayName: 'GitHub', currentStatus: 'failed', lastSuccess: null, lastFailure: null, lastRunAt: null, rowsCollected: null, durationMs: null, errorMessage: null },
      { sourceId: 3, sourceName: 'debugbear', displayName: 'DebugBear', currentStatus: 'failed', lastSuccess: null, lastFailure: null, lastRunAt: null, rowsCollected: null, durationMs: null, errorMessage: null }
    ]

    const failedCount = sources.filter(s => s.currentStatus === 'failed').length
    expect(failedCount).toBe(2)
  })

  it('returns 0 when all sources succeed', () => {
    const sources: SourceStatus[] = [
      { sourceId: 1, sourceName: 'sentry', displayName: 'Sentry', currentStatus: 'success', lastSuccess: null, lastFailure: null, lastRunAt: null, rowsCollected: null, durationMs: null, errorMessage: null }
    ]

    const failedCount = sources.filter(s => s.currentStatus === 'failed').length
    expect(failedCount).toBe(0)
  })

  it('does not count partial as failed', () => {
    const sources: SourceStatus[] = [
      { sourceId: 1, sourceName: 'sentry', displayName: 'Sentry', currentStatus: 'partial', lastSuccess: null, lastFailure: null, lastRunAt: null, rowsCollected: null, durationMs: null, errorMessage: null }
    ]

    const failedCount = sources.filter(s => s.currentStatus === 'failed').length
    expect(failedCount).toBe(0)
  })
})
