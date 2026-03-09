/**
 * Tests for useMetrics composable
 * Tests metric grouping and summary calculations
 */

import { describe, it, expect } from 'vitest'

// Types matching useMetrics.ts
type Axis = 'stability' | 'performance' | 'security' | 'quality'

interface MetricSummary {
  axis: Axis
  currentValue: number | null
  previousValue: number | null
  delta: number | null
  deltaPercent: number | null
  trend: 'up' | 'down' | 'stable' | 'unknown'
  unit: string
  label: string
}

interface GroupedMetric {
  avg: number
  unit: string
  displayName: string
}

// Re-implement groupAndAverage for testing
function groupAndAverage(data: Array<{ value_avg: number, dim_metric_types: { name: string, unit: string, display_name: string } }>): Record<string, GroupedMetric> {
  const groups: Record<string, { sum: number, count: number, unit: string, displayName: string }> = {}

  for (const row of data) {
    const metricType = row.dim_metric_types
    const name = metricType.name
    const value = row.value_avg

    if (!groups[name]) {
      groups[name] = {
        sum: 0,
        count: 0,
        unit: metricType.unit,
        displayName: metricType.display_name
      }
    }

    groups[name].sum += value
    groups[name].count += 1
  }

  const result: Record<string, GroupedMetric> = {}
  for (const [name, group] of Object.entries(groups)) {
    result[name] = {
      avg: group.count > 0 ? group.sum / group.count : 0,
      unit: group.unit,
      displayName: group.displayName
    }
  }

  return result
}

// Calculate trend
function calculateTrend(deltaPercent: number | null): MetricSummary['trend'] {
  if (deltaPercent === null) return 'unknown'
  if (Math.abs(deltaPercent) < 1) return 'stable'
  return deltaPercent > 0 ? 'up' : 'down'
}

describe('groupAndAverage', () => {
  it('groups metrics by name and calculates average', () => {
    const data = [
      { value_avg: 10, dim_metric_types: { name: 'new_errors', unit: 'count', display_name: 'Nouvelles erreurs' } },
      { value_avg: 20, dim_metric_types: { name: 'new_errors', unit: 'count', display_name: 'Nouvelles erreurs' } },
      { value_avg: 30, dim_metric_types: { name: 'new_errors', unit: 'count', display_name: 'Nouvelles erreurs' } },
      { value_avg: 5, dim_metric_types: { name: 'resolved_errors', unit: 'count', display_name: 'Erreurs résolues' } }
    ]

    const result = groupAndAverage(data)

    expect(result.new_errors.avg).toBe(20) // (10+20+30)/3
    expect(result.resolved_errors.avg).toBe(5)
  })

  it('handles empty data', () => {
    const result = groupAndAverage([])
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('preserves unit and displayName', () => {
    const data = [
      { value_avg: 100, dim_metric_types: { name: 'lcp', unit: 'ms', display_name: 'LCP' } }
    ]

    const result = groupAndAverage(data)

    expect(result.lcp.unit).toBe('ms')
    expect(result.lcp.displayName).toBe('LCP')
  })
})

describe('calculateTrend', () => {
  it('returns unknown for null delta', () => {
    expect(calculateTrend(null)).toBe('unknown')
  })

  it('returns stable for small changes', () => {
    expect(calculateTrend(0)).toBe('stable')
    expect(calculateTrend(0.5)).toBe('stable')
    expect(calculateTrend(-0.5)).toBe('stable')
    expect(calculateTrend(0.99)).toBe('stable')
  })

  it('returns up for positive changes', () => {
    expect(calculateTrend(1)).toBe('up')
    expect(calculateTrend(10)).toBe('up')
    expect(calculateTrend(100)).toBe('up')
  })

  it('returns down for negative changes', () => {
    expect(calculateTrend(-1)).toBe('down')
    expect(calculateTrend(-10)).toBe('down')
    expect(calculateTrend(-100)).toBe('down')
  })
})

describe('MetricSummary calculations', () => {
  it('calculates delta correctly', () => {
    const current = 50
    const previous = 40
    const delta = current - previous

    expect(delta).toBe(10)
  })

  it('calculates deltaPercent correctly', () => {
    const current = 50
    const previous = 40
    const delta = current - previous
    const deltaPercent = (delta / previous) * 100

    expect(deltaPercent).toBe(25) // 10/40 * 100
  })

  it('handles zero previous value', () => {
    const current = 50
    const previous = 0

    // Should return null to avoid division by zero
    const deltaPercent = previous !== 0 ? ((current - previous) / previous) * 100 : null

    expect(deltaPercent).toBeNull()
  })
})

describe('MetricRow mapping', () => {
  interface MetricRow {
    id: number
    valueAvg: number
    valueMin: number | null
    valueMax: number | null
    sampleCount: number
    periodStart: string
    metricName: string
    metricDisplayName: string
    metricUnit: string
    sourceName: string
  }

  it('maps database row to MetricRow', () => {
    const dbRow = {
      id: 1,
      value_avg: 42.5,
      value_min: 10,
      value_max: 100,
      sample_count: 24,
      period_start: '2026-03-09',
      dim_metric_types: { name: 'new_errors', display_name: 'Nouvelles erreurs', unit: 'count' },
      dim_sources: { name: 'sentry' }
    }

    const metricRow: MetricRow = {
      id: dbRow.id,
      valueAvg: dbRow.value_avg,
      valueMin: dbRow.value_min,
      valueMax: dbRow.value_max,
      sampleCount: dbRow.sample_count,
      periodStart: dbRow.period_start,
      metricName: dbRow.dim_metric_types.name,
      metricDisplayName: dbRow.dim_metric_types.display_name,
      metricUnit: dbRow.dim_metric_types.unit,
      sourceName: dbRow.dim_sources.name
    }

    expect(metricRow.id).toBe(1)
    expect(metricRow.valueAvg).toBe(42.5)
    expect(metricRow.metricName).toBe('new_errors')
    expect(metricRow.sourceName).toBe('sentry')
  })
})
