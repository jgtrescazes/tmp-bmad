/**
 * Tests for Sentry collector logic
 * Tests the metric mapping and data transformation logic
 */

import { describe, it, expect } from 'vitest'

// Types matching _shared/types.ts
interface SentryIssue {
  id: string
  shortId: string
  title: string
  count: number
  userCount: number
  firstSeen: string
  lastSeen: string
  status: 'resolved' | 'unresolved' | 'ignored'
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  metadata: {
    type?: string
    value?: string
    filename?: string
    function?: string
  }
}

interface MetricInsert {
  source_id: number
  metric_type_id: number
  repository_id: number
  value: number
  metadata?: Record<string, unknown>
  collected_at: string
}

// Helper functions that mirror collector logic
function countNewErrors(issues: SentryIssue[], windowStart: Date): number {
  return issues.filter((issue) => {
    const firstSeen = new Date(issue.firstSeen)
    return firstSeen >= windowStart
  }).length
}

function calculateErrorRate(issues: SentryIssue[], totalEvents: number): number {
  if (totalEvents === 0) return 0
  const totalErrors = issues.reduce((sum, issue) => sum + issue.count, 0)
  return totalErrors / totalEvents
}

function calculateAvgResolutionTime(issues: SentryIssue[]): number {
  const resolutionTimes = issues
    .filter((issue) => issue.firstSeen && issue.lastSeen)
    .map((issue) => {
      const firstSeen = new Date(issue.firstSeen).getTime()
      const lastSeen = new Date(issue.lastSeen).getTime()
      return lastSeen - firstSeen
    })

  if (resolutionTimes.length === 0) return 0
  return resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
}

function createMetricsInsert(
  sourceId: number,
  metricTypeId: number,
  repositoryId: number,
  value: number,
  collectedAt: string
): MetricInsert {
  return {
    source_id: sourceId,
    metric_type_id: metricTypeId,
    repository_id: repositoryId,
    value,
    collected_at: collectedAt
  }
}

describe('Sentry metric calculations', () => {
  const mockIssues: SentryIssue[] = [
    {
      id: '1',
      shortId: 'PROJ-1',
      title: 'TypeError: Cannot read property',
      count: 42,
      userCount: 15,
      firstSeen: '2026-03-09T10:00:00Z',
      lastSeen: '2026-03-09T10:30:00Z',
      status: 'unresolved',
      level: 'error',
      metadata: { type: 'TypeError' }
    },
    {
      id: '2',
      shortId: 'PROJ-2',
      title: 'ReferenceError: foo is not defined',
      count: 10,
      userCount: 5,
      firstSeen: '2026-03-09T09:00:00Z',
      lastSeen: '2026-03-09T10:15:00Z',
      status: 'unresolved',
      level: 'error',
      metadata: { type: 'ReferenceError' }
    },
    {
      id: '3',
      shortId: 'PROJ-3',
      title: 'Network Error',
      count: 5,
      userCount: 3,
      firstSeen: '2026-03-09T10:25:00Z',
      lastSeen: '2026-03-09T10:28:00Z',
      status: 'resolved',
      level: 'warning',
      metadata: {}
    }
  ]

  describe('countNewErrors', () => {
    it('counts issues with firstSeen within window', () => {
      const windowStart = new Date('2026-03-09T10:00:00Z')
      const count = countNewErrors(mockIssues, windowStart)
      // Issues 1 and 3 have firstSeen >= windowStart
      expect(count).toBe(2)
    })

    it('returns 0 when no issues in window', () => {
      const windowStart = new Date('2026-03-09T11:00:00Z')
      const count = countNewErrors(mockIssues, windowStart)
      expect(count).toBe(0)
    })

    it('returns all issues when window is old', () => {
      const windowStart = new Date('2026-03-09T08:00:00Z')
      const count = countNewErrors(mockIssues, windowStart)
      expect(count).toBe(3)
    })
  })

  describe('calculateErrorRate', () => {
    it('calculates ratio of errors to total events', () => {
      // Total errors = 42 + 10 + 5 = 57
      const rate = calculateErrorRate(mockIssues, 1000)
      expect(rate).toBe(0.057)
    })

    it('returns 0 when no events', () => {
      const rate = calculateErrorRate(mockIssues, 0)
      expect(rate).toBe(0)
    })

    it('handles empty issues array', () => {
      const rate = calculateErrorRate([], 1000)
      expect(rate).toBe(0)
    })
  })

  describe('calculateAvgResolutionTime', () => {
    it('calculates average time between firstSeen and lastSeen', () => {
      // Issue 1: 30 minutes = 1800000ms
      // Issue 2: 75 minutes = 4500000ms
      // Issue 3: 3 minutes = 180000ms
      // Average: (1800000 + 4500000 + 180000) / 3 = 2160000ms
      const avgTime = calculateAvgResolutionTime(mockIssues)
      expect(avgTime).toBe(2160000)
    })

    it('returns 0 for empty array', () => {
      const avgTime = calculateAvgResolutionTime([])
      expect(avgTime).toBe(0)
    })
  })
})

describe('MetricInsert creation', () => {
  it('creates valid MetricInsert object', () => {
    const metric = createMetricsInsert(
      1,
      1,
      1,
      42,
      '2026-03-09T10:30:00Z'
    )

    expect(metric).toEqual({
      source_id: 1,
      metric_type_id: 1,
      repository_id: 1,
      value: 42,
      collected_at: '2026-03-09T10:30:00Z'
    })
  })

  it('handles decimal values', () => {
    const metric = createMetricsInsert(
      1,
      3,
      1,
      0.057,
      '2026-03-09T10:30:00Z'
    )

    expect(metric.value).toBe(0.057)
  })

  it('handles zero values', () => {
    const metric = createMetricsInsert(
      1,
      2,
      1,
      0,
      '2026-03-09T10:30:00Z'
    )

    expect(metric.value).toBe(0)
  })
})

describe('Sentry API response handling', () => {
  const testIssues: SentryIssue[] = [
    {
      id: '1',
      shortId: 'PROJ-1',
      title: 'TypeError',
      count: 42,
      userCount: 15,
      firstSeen: '2026-03-09T10:00:00Z',
      lastSeen: '2026-03-09T10:30:00Z',
      status: 'unresolved',
      level: 'error',
      metadata: { type: 'TypeError' }
    },
    {
      id: '2',
      shortId: 'PROJ-2',
      title: 'ReferenceError',
      count: 10,
      userCount: 5,
      firstSeen: '2026-03-09T09:00:00Z',
      lastSeen: '2026-03-09T10:15:00Z',
      status: 'unresolved',
      level: 'error',
      metadata: { type: 'ReferenceError' }
    },
    {
      id: '3',
      shortId: 'PROJ-3',
      title: 'Network Error',
      count: 5,
      userCount: 3,
      firstSeen: '2026-03-09T10:25:00Z',
      lastSeen: '2026-03-09T10:28:00Z',
      status: 'resolved',
      level: 'warning',
      metadata: {}
    }
  ]

  it('filters issues by status', () => {
    const unresolved = testIssues.filter((i) => i.status === 'unresolved')
    const resolved = testIssues.filter((i) => i.status === 'resolved')

    expect(unresolved).toHaveLength(2)
    expect(resolved).toHaveLength(1)
  })

  it('extracts metadata correctly', () => {
    const issue = testIssues[0]
    expect(issue.metadata.type).toBe('TypeError')
  })
})
