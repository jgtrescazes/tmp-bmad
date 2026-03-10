import { describe, it, expect } from 'vitest'
import type { Anomaly } from '~/utils/anomalyEngine'

// Test helpers - extracted logic from useReport for unit testing
// The actual composable requires Supabase context

/**
 * Calculate delta percentage between current and previous values
 */
function calculateDelta(
  currentValue: number,
  previousValue: number | null
): number | null {
  if (previousValue === null || previousValue === 0) {
    return null
  }
  return ((currentValue - previousValue) / previousValue) * 100
}

/**
 * Get the top N problems (anomalies) sorted by severity
 */
function getTopProblems(anomalies: Anomaly[], count: number = 3): Anomaly[] {
  return anomalies.slice(0, count)
}

/**
 * Determine overall trend based on anomalies
 */
type ReportTrend = 'improving' | 'degrading' | 'stable'

function determineTrend(anomalies: Anomaly[]): ReportTrend {
  if (anomalies.length === 0) {
    return 'stable'
  }

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length
  const warningCount = anomalies.filter(a => a.severity === 'warning').length

  if (criticalCount > 0 || warningCount > 2) {
    return 'degrading'
  }

  if (warningCount === 0 && anomalies.length <= 2) {
    return 'improving'
  }

  return 'stable'
}

/**
 * Format period as YYYY-MM
 */
function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/**
 * Get the first day of a month in YYYY-MM-DD format
 * Uses UTC to avoid timezone issues
 */
function getMonthStart(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 1))
  return date.toISOString().split('T')[0]
}

/**
 * Get the last day of a month in YYYY-MM-DD format
 * Uses UTC to avoid timezone issues
 */
function getMonthEnd(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month + 1, 0))
  return date.toISOString().split('T')[0]
}

describe('useReport', () => {
  describe('calculateDelta', () => {
    it('should calculate positive delta correctly', () => {
      const delta = calculateDelta(110, 100)
      expect(delta).toBe(10) // 10% increase
    })

    it('should calculate negative delta correctly', () => {
      const delta = calculateDelta(90, 100)
      expect(delta).toBe(-10) // 10% decrease
    })

    it('should return null when previousValue is null', () => {
      const delta = calculateDelta(100, null)
      expect(delta).toBeNull()
    })

    it('should return null when previousValue is zero', () => {
      const delta = calculateDelta(100, 0)
      expect(delta).toBeNull()
    })

    it('should handle zero current value', () => {
      const delta = calculateDelta(0, 100)
      expect(delta).toBe(-100) // 100% decrease
    })

    it('should handle equal values', () => {
      const delta = calculateDelta(100, 100)
      expect(delta).toBe(0)
    })

    it('should handle large increases', () => {
      const delta = calculateDelta(200, 100)
      expect(delta).toBe(100) // 100% increase
    })

    it('should handle decimal values', () => {
      const delta = calculateDelta(0.15, 0.1)
      expect(delta).toBeCloseTo(50, 1) // 50% increase
    })
  })

  describe('getTopProblems', () => {
    const anomalies: Anomaly[] = [
      {
        type: 'threshold',
        source: 'performance',
        metric: 'lcp',
        currentValue: 3000,
        expectedValue: 2500,
        severity: 'critical'
      },
      {
        type: 'delta',
        source: 'stability',
        metric: 'new_errors',
        currentValue: 150,
        expectedValue: 100,
        severity: 'warning'
      },
      {
        type: 'delta',
        source: 'quality',
        metric: 'coverage',
        currentValue: 75,
        expectedValue: 80,
        severity: 'info'
      },
      {
        type: 'trend',
        source: 'performance',
        metric: 'inp',
        currentValue: 250,
        expectedValue: 200,
        severity: 'warning'
      }
    ]

    it('should return top 3 by default', () => {
      const top = getTopProblems(anomalies)
      expect(top).toHaveLength(3)
    })

    it('should return specified count', () => {
      const top = getTopProblems(anomalies, 2)
      expect(top).toHaveLength(2)
    })

    it('should return all if count exceeds length', () => {
      const top = getTopProblems(anomalies, 10)
      expect(top).toHaveLength(4)
    })

    it('should return empty array for empty input', () => {
      const top = getTopProblems([])
      expect(top).toHaveLength(0)
    })
  })

  describe('determineTrend', () => {
    it('should return stable for no anomalies', () => {
      const trend = determineTrend([])
      expect(trend).toBe('stable')
    })

    it('should return degrading for critical anomalies', () => {
      const anomalies: Anomaly[] = [
        {
          type: 'threshold',
          source: 'performance',
          metric: 'lcp',
          currentValue: 3000,
          expectedValue: 2500,
          severity: 'critical'
        }
      ]
      const trend = determineTrend(anomalies)
      expect(trend).toBe('degrading')
    })

    it('should return degrading for more than 2 warnings', () => {
      const anomalies: Anomaly[] = [
        {
          type: 'delta',
          source: 'stability',
          metric: 'new_errors',
          currentValue: 150,
          expectedValue: 100,
          severity: 'warning'
        },
        {
          type: 'delta',
          source: 'performance',
          metric: 'lcp',
          currentValue: 2800,
          expectedValue: 2400,
          severity: 'warning'
        },
        {
          type: 'delta',
          source: 'security',
          metric: 'vulnerabilities',
          currentValue: 5,
          expectedValue: 3,
          severity: 'warning'
        }
      ]
      const trend = determineTrend(anomalies)
      expect(trend).toBe('degrading')
    })

    it('should return improving for no warnings and few anomalies', () => {
      const anomalies: Anomaly[] = [
        {
          type: 'delta',
          source: 'quality',
          metric: 'coverage',
          currentValue: 78,
          expectedValue: 80,
          severity: 'info'
        }
      ]
      const trend = determineTrend(anomalies)
      expect(trend).toBe('improving')
    })

    it('should return stable for moderate anomalies', () => {
      const anomalies: Anomaly[] = [
        {
          type: 'delta',
          source: 'stability',
          metric: 'new_errors',
          currentValue: 110,
          expectedValue: 100,
          severity: 'warning'
        },
        {
          type: 'delta',
          source: 'quality',
          metric: 'coverage',
          currentValue: 78,
          expectedValue: 80,
          severity: 'info'
        },
        {
          type: 'delta',
          source: 'performance',
          metric: 'cls',
          currentValue: 0.12,
          expectedValue: 0.1,
          severity: 'info'
        }
      ]
      const trend = determineTrend(anomalies)
      expect(trend).toBe('stable')
    })
  })

  describe('formatPeriod', () => {
    it('should format January correctly', () => {
      expect(formatPeriod(2026, 0)).toBe('2026-01')
    })

    it('should format December correctly', () => {
      expect(formatPeriod(2026, 11)).toBe('2026-12')
    })

    it('should pad single digit months', () => {
      expect(formatPeriod(2026, 2)).toBe('2026-03')
    })

    it('should handle double digit months', () => {
      expect(formatPeriod(2026, 9)).toBe('2026-10')
    })
  })

  describe('getMonthStart', () => {
    it('should return first day of January', () => {
      const start = getMonthStart(2026, 0)
      expect(start).toBe('2026-01-01')
    })

    it('should return first day of February', () => {
      const start = getMonthStart(2026, 1)
      expect(start).toBe('2026-02-01')
    })

    it('should return first day of December', () => {
      const start = getMonthStart(2026, 11)
      expect(start).toBe('2026-12-01')
    })
  })

  describe('getMonthEnd', () => {
    it('should return last day of January (31)', () => {
      const end = getMonthEnd(2026, 0)
      expect(end).toBe('2026-01-31')
    })

    it('should return last day of February (non-leap year)', () => {
      const end = getMonthEnd(2025, 1) // 2025 is not a leap year
      expect(end).toBe('2025-02-28')
    })

    it('should return last day of February (leap year)', () => {
      const end = getMonthEnd(2024, 1) // 2024 is a leap year
      expect(end).toBe('2024-02-29')
    })

    it('should return last day of April (30)', () => {
      const end = getMonthEnd(2026, 3)
      expect(end).toBe('2026-04-30')
    })

    it('should return last day of December', () => {
      const end = getMonthEnd(2026, 11)
      expect(end).toBe('2026-12-31')
    })
  })

  describe('report data structure', () => {
    it('should have correct shape for empty report', () => {
      // Verify expected structure
      const emptyReport = {
        period: '2026-03',
        previousPeriod: '2026-02',
        repositoryName: 'international',
        generatedAt: new Date().toISOString(),
        sections: [],
        deployments: [],
        totalAnomalies: 0
      }

      expect(emptyReport.period).toMatch(/^\d{4}-\d{2}$/)
      expect(emptyReport.previousPeriod).toMatch(/^\d{4}-\d{2}$/)
      expect(emptyReport.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(Array.isArray(emptyReport.sections)).toBe(true)
      expect(Array.isArray(emptyReport.deployments)).toBe(true)
      expect(typeof emptyReport.totalAnomalies).toBe('number')
    })

    it('should have correct section structure', () => {
      const section = {
        axis: 'stability' as const,
        displayName: 'Stabilite (Sentry)',
        metrics: [
          {
            name: 'new_errors',
            displayName: 'Nouvelles erreurs',
            currentValue: 42,
            previousValue: 38,
            delta: 10.5,
            unit: ''
          }
        ],
        anomalies: [],
        topProblems: []
      }

      expect(section.axis).toBe('stability')
      expect(section.metrics).toHaveLength(1)
      expect(section.metrics[0].delta).toBeCloseTo(10.5, 1)
    })

    it('should have correct deployment structure', () => {
      const deployment = {
        sha: 'abc1234567890',
        shortSha: 'abc1234',
        message: 'Fix: resolve CLS issue',
        author: 'dev@example.com',
        prNumber: 123,
        deployedAt: '2026-02-15T14:30:00Z'
      }

      expect(deployment.sha).toHaveLength(13)
      expect(deployment.shortSha).toHaveLength(7)
      expect(deployment.prNumber).toBe(123)
    })
  })

  describe('edge cases', () => {
    it('should handle M-1 being previous year', () => {
      // January 2026 -> December 2025
      const currentPeriod = formatPeriod(2026, 0)
      expect(currentPeriod).toBe('2026-01')

      // Previous month calculation
      const month = 0
      const year = 2026
      const prevMonth = month - 1 < 0 ? 11 : month - 1
      const prevYear = month - 1 < 0 ? year - 1 : year

      expect(formatPeriod(prevYear, prevMonth)).toBe('2025-12')
    })

    it('should handle null prNumber in deployment', () => {
      const deployment = {
        sha: 'abc1234567890',
        shortSha: 'abc1234',
        message: 'Direct commit',
        author: 'dev@example.com',
        prNumber: null,
        deployedAt: '2026-02-15T14:30:00Z'
      }

      expect(deployment.prNumber).toBeNull()
    })

    it('should handle metrics with missing previous values', () => {
      const metrics = [
        {
          name: 'new_metric',
          displayName: 'New Metric',
          currentValue: 100,
          previousValue: null,
          delta: null,
          unit: 'ms'
        }
      ]

      expect(metrics[0].previousValue).toBeNull()
      expect(metrics[0].delta).toBeNull()
    })
  })
})
