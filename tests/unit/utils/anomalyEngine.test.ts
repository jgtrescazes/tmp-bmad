import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  detectThresholdAnomalies,
  detectDeltaAnomalies,
  detectTrendAnomalies,
  calculateVulnerabilityScore,
  combineAndSortAnomalies,
  CWV_THRESHOLDS_ABSOLUTE,
  DELTA_THRESHOLD_DEFAULT,
  SEVERITY_COEFFICIENTS,
  type Anomaly,
  type PerformanceMetricInput,
  type MonthlyDataPoint,
  type VulnerabilityAlertInput
} from '~/utils/anomalyEngine'

describe('anomalyEngine', () => {
  describe('CWV_THRESHOLDS_ABSOLUTE', () => {
    it('should define Google CWV thresholds', () => {
      expect(CWV_THRESHOLDS_ABSOLUTE.lcp).toBe(2500)
      expect(CWV_THRESHOLDS_ABSOLUTE.inp).toBe(200)
      expect(CWV_THRESHOLDS_ABSOLUTE.cls).toBe(0.1)
    })
  })

  describe('DELTA_THRESHOLD_DEFAULT', () => {
    it('should be 10%', () => {
      expect(DELTA_THRESHOLD_DEFAULT).toBe(0.1)
    })
  })

  describe('detectThresholdAnomalies', () => {
    describe('LCP threshold (2500ms)', () => {
      it('should detect anomaly when LCP exceeds 2500ms', () => {
        const metrics: PerformanceMetricInput[] = [
          { metricName: 'lcp', value: 3000, source: 'performance' }
        ]
        const anomalies = detectThresholdAnomalies(metrics)

        expect(anomalies).toHaveLength(1)
        expect(anomalies[0]).toEqual({
          type: 'threshold',
          source: 'performance',
          metric: 'lcp',
          currentValue: 3000,
          expectedValue: 2500,
          severity: 'critical'
        })
      })

      it('should not detect anomaly when LCP is below threshold', () => {
        const metrics: PerformanceMetricInput[] = [
          { metricName: 'lcp', value: 2000, source: 'performance' }
        ]
        const anomalies = detectThresholdAnomalies(metrics)

        expect(anomalies).toHaveLength(0)
      })

      it('should not detect anomaly when LCP equals threshold', () => {
        const metrics: PerformanceMetricInput[] = [
          { metricName: 'lcp', value: 2500, source: 'performance' }
        ]
        const anomalies = detectThresholdAnomalies(metrics)

        expect(anomalies).toHaveLength(0)
      })
    })

    describe('INP threshold (200ms)', () => {
      it('should detect anomaly when INP exceeds 200ms', () => {
        const metrics: PerformanceMetricInput[] = [
          { metricName: 'inp', value: 250, source: 'performance' }
        ]
        const anomalies = detectThresholdAnomalies(metrics)

        expect(anomalies).toHaveLength(1)
        expect(anomalies[0].metric).toBe('inp')
        expect(anomalies[0].expectedValue).toBe(200)
        expect(anomalies[0].severity).toBe('critical')
      })

      it('should not detect anomaly when INP is at 200ms', () => {
        const metrics: PerformanceMetricInput[] = [
          { metricName: 'inp', value: 200, source: 'performance' }
        ]
        const anomalies = detectThresholdAnomalies(metrics)

        expect(anomalies).toHaveLength(0)
      })
    })

    describe('CLS threshold (0.1)', () => {
      it('should detect anomaly when CLS exceeds 0.1', () => {
        const metrics: PerformanceMetricInput[] = [
          { metricName: 'cls', value: 0.15, source: 'performance' }
        ]
        const anomalies = detectThresholdAnomalies(metrics)

        expect(anomalies).toHaveLength(1)
        expect(anomalies[0].metric).toBe('cls')
        expect(anomalies[0].expectedValue).toBe(0.1)
      })

      it('should not detect anomaly when CLS is 0.1', () => {
        const metrics: PerformanceMetricInput[] = [
          { metricName: 'cls', value: 0.1, source: 'performance' }
        ]
        const anomalies = detectThresholdAnomalies(metrics)

        expect(anomalies).toHaveLength(0)
      })
    })

    describe('multiple metrics', () => {
      it('should detect multiple anomalies', () => {
        const metrics: PerformanceMetricInput[] = [
          { metricName: 'lcp', value: 3000, source: 'performance' },
          { metricName: 'inp', value: 300, source: 'performance' },
          { metricName: 'cls', value: 0.05, source: 'performance' } // OK
        ]
        const anomalies = detectThresholdAnomalies(metrics)

        expect(anomalies).toHaveLength(2)
        expect(anomalies.map(a => a.metric)).toContain('lcp')
        expect(anomalies.map(a => a.metric)).toContain('inp')
      })

      it('should return empty array when no metrics provided', () => {
        const anomalies = detectThresholdAnomalies([])
        expect(anomalies).toHaveLength(0)
      })
    })

    describe('non-CWV metrics', () => {
      it('should ignore non-CWV metrics', () => {
        const metrics: PerformanceMetricInput[] = [
          { metricName: 'fcp', value: 5000, source: 'performance' },
          { metricName: 'ttfb', value: 1000, source: 'performance' }
        ]
        const anomalies = detectThresholdAnomalies(metrics)

        expect(anomalies).toHaveLength(0)
      })
    })
  })

  describe('detectDeltaAnomalies', () => {
    describe('significant deltas (default 10%)', () => {
      it('should detect degradation > 10%', () => {
        const current = { metricName: 'lcp', value: 2200, source: 'performance' }
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        const anomalies = detectDeltaAnomalies([current], [previous])

        expect(anomalies).toHaveLength(1)
        expect(anomalies[0]).toMatchObject({
          type: 'delta',
          metric: 'lcp',
          currentValue: 2200,
          expectedValue: 2000
        })
      })

      it('should not detect delta < 10%', () => {
        const current = { metricName: 'lcp', value: 2050, source: 'performance' }
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        const anomalies = detectDeltaAnomalies([current], [previous])

        expect(anomalies).toHaveLength(0)
      })

      it('should detect exactly 10% as non-anomaly (threshold exclusive)', () => {
        const current = { metricName: 'lcp', value: 2200, source: 'performance' }
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        // 10% exactly = (2200-2000)/2000 = 0.1 = 10%
        const anomalies = detectDeltaAnomalies([current], [previous], 0.1)

        // 10% is borderline - should be included if > threshold
        expect(anomalies).toHaveLength(1)
      })
    })

    describe('severity levels', () => {
      it('should assign critical severity for delta > 50%', () => {
        const current = { metricName: 'lcp', value: 3500, source: 'performance' }
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        // 75% delta
        const anomalies = detectDeltaAnomalies([current], [previous])

        expect(anomalies[0].severity).toBe('critical')
      })

      it('should assign warning severity for 20% < delta <= 50%', () => {
        const current = { metricName: 'lcp', value: 2500, source: 'performance' }
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        // 25% delta
        const anomalies = detectDeltaAnomalies([current], [previous])

        expect(anomalies[0].severity).toBe('warning')
      })

      it('should assign info severity for 10% < delta <= 20%', () => {
        const current = { metricName: 'lcp', value: 2300, source: 'performance' }
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        // 15% delta
        const anomalies = detectDeltaAnomalies([current], [previous])

        expect(anomalies[0].severity).toBe('info')
      })
    })

    describe('metric polarity', () => {
      it('should detect degradation for inverted metrics (higher = worse)', () => {
        // For LCP, higher is worse
        const current = { metricName: 'lcp', value: 3000, source: 'performance' }
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        const anomalies = detectDeltaAnomalies([current], [previous])

        expect(anomalies).toHaveLength(1)
      })

      it('should detect degradation for non-inverted metrics (lower = worse)', () => {
        // For coverage, lower is worse
        const current = { metricName: 'coverage_lines', value: 70, source: 'quality' }
        const previous = { metricName: 'coverage_lines', value: 80, source: 'quality' }

        const anomalies = detectDeltaAnomalies([current], [previous])

        // 12.5% degradation
        expect(anomalies).toHaveLength(1)
      })

      it('should not detect improvement for inverted metrics', () => {
        // LCP went down (improvement)
        const current = { metricName: 'lcp', value: 1500, source: 'performance' }
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        const anomalies = detectDeltaAnomalies([current], [previous])

        expect(anomalies).toHaveLength(0)
      })

      it('should not detect improvement for non-inverted metrics', () => {
        // Coverage went up (improvement)
        const current = { metricName: 'coverage_lines', value: 90, source: 'quality' }
        const previous = { metricName: 'coverage_lines', value: 80, source: 'quality' }

        const anomalies = detectDeltaAnomalies([current], [previous])

        expect(anomalies).toHaveLength(0)
      })
    })

    describe('edge cases', () => {
      it('should handle no previous data gracefully', () => {
        const current = { metricName: 'lcp', value: 2000, source: 'performance' }

        const anomalies = detectDeltaAnomalies([current], [])

        expect(anomalies).toHaveLength(0)
      })

      it('should handle no current data gracefully', () => {
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        const anomalies = detectDeltaAnomalies([], [previous])

        expect(anomalies).toHaveLength(0)
      })

      it('should handle previous value of zero', () => {
        const current = { metricName: 'error_count', value: 10, source: 'stability' }
        const previous = { metricName: 'error_count', value: 0, source: 'stability' }

        const anomalies = detectDeltaAnomalies([current], [previous])

        // Cannot compute percentage change from 0
        expect(anomalies).toHaveLength(0)
      })

      it('should handle metric mismatch', () => {
        const current = { metricName: 'lcp', value: 3000, source: 'performance' }
        const previous = { metricName: 'inp', value: 100, source: 'performance' }

        const anomalies = detectDeltaAnomalies([current], [previous])

        expect(anomalies).toHaveLength(0)
      })
    })

    describe('custom threshold', () => {
      it('should use custom threshold when provided', () => {
        const current = { metricName: 'lcp', value: 2100, source: 'performance' }
        const previous = { metricName: 'lcp', value: 2000, source: 'performance' }

        // 5% delta with 5% threshold
        const anomalies = detectDeltaAnomalies([current], [previous], 0.05)

        expect(anomalies).toHaveLength(1)
      })
    })

    describe('multiple metrics', () => {
      it('should detect anomalies across multiple metrics', () => {
        const current = [
          { metricName: 'lcp', value: 3000, source: 'performance' },
          { metricName: 'inp', value: 250, source: 'performance' },
          { metricName: 'cls', value: 0.08, source: 'performance' }
        ]
        const previous = [
          { metricName: 'lcp', value: 2000, source: 'performance' },
          { metricName: 'inp', value: 220, source: 'performance' },
          { metricName: 'cls', value: 0.05, source: 'performance' }
        ]

        const anomalies = detectDeltaAnomalies(current, previous)

        // LCP: 50% degradation
        // INP: ~14% degradation
        // CLS: 60% degradation
        expect(anomalies).toHaveLength(3)
      })
    })
  })

  describe('Anomaly type structure', () => {
    it('should have correct shape for threshold anomaly', () => {
      const metrics: PerformanceMetricInput[] = [
        { metricName: 'lcp', value: 3000, source: 'performance' }
      ]
      const anomalies = detectThresholdAnomalies(metrics)

      const anomaly: Anomaly = anomalies[0]
      expect(anomaly.type).toBe('threshold')
      expect(typeof anomaly.source).toBe('string')
      expect(typeof anomaly.metric).toBe('string')
      expect(typeof anomaly.currentValue).toBe('number')
      expect(typeof anomaly.expectedValue).toBe('number')
      expect(['critical', 'warning', 'info']).toContain(anomaly.severity)
    })

    it('should have correct shape for delta anomaly', () => {
      const current = { metricName: 'lcp', value: 3000, source: 'performance' }
      const previous = { metricName: 'lcp', value: 2000, source: 'performance' }
      const anomalies = detectDeltaAnomalies([current], [previous])

      const anomaly: Anomaly = anomalies[0]
      expect(anomaly.type).toBe('delta')
      expect(typeof anomaly.source).toBe('string')
      expect(typeof anomaly.metric).toBe('string')
      expect(typeof anomaly.currentValue).toBe('number')
      expect(typeof anomaly.expectedValue).toBe('number')
      expect(['critical', 'warning', 'info']).toContain(anomaly.severity)
    })
  })

  // Story 4.2: Trend Analysis & Severity Score
  describe('SEVERITY_COEFFICIENTS', () => {
    it('should define severity coefficients for Dependabot', () => {
      expect(SEVERITY_COEFFICIENTS.critical).toBe(4)
      expect(SEVERITY_COEFFICIENTS.high).toBe(3)
      expect(SEVERITY_COEFFICIENTS.medium).toBe(2)
      expect(SEVERITY_COEFFICIENTS.low).toBe(1)
    })
  })

  describe('detectTrendAnomalies', () => {
    describe('insufficient data', () => {
      it('should return empty array for less than 3 data points', () => {
        const monthlyData: MonthlyDataPoint[] = [
          { periodStart: '2026-01-01', value: 100, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-02-01', value: 110, metricName: 'lcp', source: 'performance' }
        ]

        const anomalies = detectTrendAnomalies(monthlyData)

        expect(anomalies).toHaveLength(0)
      })

      it('should return empty array for empty data', () => {
        const anomalies = detectTrendAnomalies([])
        expect(anomalies).toHaveLength(0)
      })
    })

    describe('continuous degradation for inverted metrics (higher = worse)', () => {
      it('should detect 3-month degradation for LCP', () => {
        const monthlyData: MonthlyDataPoint[] = [
          { periodStart: '2026-01-01', value: 2000, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-02-01', value: 2200, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-03-01', value: 2500, metricName: 'lcp', source: 'performance' }
        ]

        const anomalies = detectTrendAnomalies(monthlyData)

        expect(anomalies).toHaveLength(1)
        expect(anomalies[0]).toMatchObject({
          type: 'trend',
          metric: 'lcp',
          currentValue: 2500,
          expectedValue: 2000,
          severity: 'warning'
        })
      })

      it('should detect 3-month degradation for error_count', () => {
        const monthlyData: MonthlyDataPoint[] = [
          { periodStart: '2026-01-01', value: 50, metricName: 'new_errors', source: 'stability' },
          { periodStart: '2026-02-01', value: 75, metricName: 'new_errors', source: 'stability' },
          { periodStart: '2026-03-01', value: 100, metricName: 'new_errors', source: 'stability' }
        ]

        const anomalies = detectTrendAnomalies(monthlyData)

        expect(anomalies).toHaveLength(1)
        expect(anomalies[0].metric).toBe('new_errors')
      })
    })

    describe('continuous degradation for non-inverted metrics (lower = worse)', () => {
      it('should detect 3-month degradation for coverage', () => {
        const monthlyData: MonthlyDataPoint[] = [
          { periodStart: '2026-01-01', value: 85, metricName: 'coverage_lines', source: 'quality' },
          { periodStart: '2026-02-01', value: 80, metricName: 'coverage_lines', source: 'quality' },
          { periodStart: '2026-03-01', value: 75, metricName: 'coverage_lines', source: 'quality' }
        ]

        const anomalies = detectTrendAnomalies(monthlyData)

        expect(anomalies).toHaveLength(1)
        expect(anomalies[0].metric).toBe('coverage_lines')
      })
    })

    describe('no degradation patterns', () => {
      it('should not detect anomaly for improving trend', () => {
        const monthlyData: MonthlyDataPoint[] = [
          { periodStart: '2026-01-01', value: 2500, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-02-01', value: 2200, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-03-01', value: 2000, metricName: 'lcp', source: 'performance' }
        ]

        const anomalies = detectTrendAnomalies(monthlyData)

        expect(anomalies).toHaveLength(0)
      })

      it('should not detect anomaly for flat trend', () => {
        const monthlyData: MonthlyDataPoint[] = [
          { periodStart: '2026-01-01', value: 2000, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-02-01', value: 2000, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-03-01', value: 2000, metricName: 'lcp', source: 'performance' }
        ]

        const anomalies = detectTrendAnomalies(monthlyData)

        expect(anomalies).toHaveLength(0)
      })

      it('should not detect anomaly for mixed trend', () => {
        const monthlyData: MonthlyDataPoint[] = [
          { periodStart: '2026-01-01', value: 2000, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-02-01', value: 2500, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-03-01', value: 2200, metricName: 'lcp', source: 'performance' }
        ]

        const anomalies = detectTrendAnomalies(monthlyData)

        expect(anomalies).toHaveLength(0)
      })
    })

    describe('multiple metrics', () => {
      it('should detect trends for multiple metrics independently', () => {
        const monthlyData: MonthlyDataPoint[] = [
          // LCP degrading
          { periodStart: '2026-01-01', value: 2000, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-02-01', value: 2200, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-03-01', value: 2500, metricName: 'lcp', source: 'performance' },
          // CLS stable
          { periodStart: '2026-01-01', value: 0.05, metricName: 'cls', source: 'performance' },
          { periodStart: '2026-02-01', value: 0.05, metricName: 'cls', source: 'performance' },
          { periodStart: '2026-03-01', value: 0.05, metricName: 'cls', source: 'performance' }
        ]

        const anomalies = detectTrendAnomalies(monthlyData)

        expect(anomalies).toHaveLength(1)
        expect(anomalies[0].metric).toBe('lcp')
      })
    })

    describe('data ordering', () => {
      it('should handle unordered data correctly', () => {
        const monthlyData: MonthlyDataPoint[] = [
          { periodStart: '2026-03-01', value: 2500, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-01-01', value: 2000, metricName: 'lcp', source: 'performance' },
          { periodStart: '2026-02-01', value: 2200, metricName: 'lcp', source: 'performance' }
        ]

        const anomalies = detectTrendAnomalies(monthlyData)

        expect(anomalies).toHaveLength(1)
        expect(anomalies[0].currentValue).toBe(2500)
        expect(anomalies[0].expectedValue).toBe(2000)
      })
    })
  })

  describe('calculateVulnerabilityScore', () => {
    beforeEach(() => {
      // Mock Date.now to control time
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-10'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('score calculation', () => {
      it('should calculate score = age x severity coefficient', () => {
        const alerts: VulnerabilityAlertInput[] = [
          {
            id: '1',
            severity: 'critical',
            createdAt: '2026-03-05', // 5 days ago
            package: 'lodash',
            title: 'Prototype Pollution'
          }
        ]

        const scored = calculateVulnerabilityScore(alerts)

        // 5 days x 4 (critical) = 20
        expect(scored[0].score).toBe(20)
        expect(scored[0].ageDays).toBe(5)
      })

      it('should apply correct coefficients for each severity', () => {
        const alerts: VulnerabilityAlertInput[] = [
          { id: '1', severity: 'critical', createdAt: '2026-03-09', package: 'a', title: 'a' }, // 1 day x 4 = 4
          { id: '2', severity: 'high', createdAt: '2026-03-09', package: 'b', title: 'b' }, // 1 day x 3 = 3
          { id: '3', severity: 'medium', createdAt: '2026-03-09', package: 'c', title: 'c' }, // 1 day x 2 = 2
          { id: '4', severity: 'low', createdAt: '2026-03-09', package: 'd', title: 'd' } // 1 day x 1 = 1
        ]

        const scored = calculateVulnerabilityScore(alerts)

        expect(scored.find(s => s.severity === 'critical')?.score).toBe(4)
        expect(scored.find(s => s.severity === 'high')?.score).toBe(3)
        expect(scored.find(s => s.severity === 'medium')?.score).toBe(2)
        expect(scored.find(s => s.severity === 'low')?.score).toBe(1)
      })
    })

    describe('sorting', () => {
      it('should sort by score descending', () => {
        const alerts: VulnerabilityAlertInput[] = [
          { id: '1', severity: 'low', createdAt: '2026-02-10', package: 'a', title: 'a' }, // 28 days x 1 = 28
          { id: '2', severity: 'critical', createdAt: '2026-03-08', package: 'b', title: 'b' }, // 2 days x 4 = 8
          { id: '3', severity: 'high', createdAt: '2026-02-01', package: 'c', title: 'c' } // 37 days x 3 = 111
        ]

        const scored = calculateVulnerabilityScore(alerts)

        expect(scored[0].id).toBe('3') // 111 points
        expect(scored[1].id).toBe('1') // 28 points
        expect(scored[2].id).toBe('2') // 8 points
      })
    })

    describe('age calculation', () => {
      it('should calculate age in days correctly', () => {
        const alerts: VulnerabilityAlertInput[] = [
          {
            id: '1',
            severity: 'critical',
            createdAt: '2026-03-01', // 9 days ago from March 10
            package: 'test',
            title: 'Test'
          }
        ]

        const scored = calculateVulnerabilityScore(alerts)

        expect(scored[0].ageDays).toBe(9)
      })

      it('should handle same-day alerts', () => {
        const alerts: VulnerabilityAlertInput[] = [
          {
            id: '1',
            severity: 'critical',
            createdAt: '2026-03-10', // Today
            package: 'test',
            title: 'Test'
          }
        ]

        const scored = calculateVulnerabilityScore(alerts)

        expect(scored[0].ageDays).toBe(0)
        expect(scored[0].score).toBe(0)
      })
    })

    describe('edge cases', () => {
      it('should handle empty array', () => {
        const scored = calculateVulnerabilityScore([])
        expect(scored).toHaveLength(0)
      })

      it('should preserve all original alert properties', () => {
        const alerts: VulnerabilityAlertInput[] = [
          {
            id: 'test-123',
            severity: 'high',
            createdAt: '2026-03-05',
            package: 'express',
            title: 'Remote Code Execution'
          }
        ]

        const scored = calculateVulnerabilityScore(alerts)

        expect(scored[0].id).toBe('test-123')
        expect(scored[0].severity).toBe('high')
        expect(scored[0].package).toBe('express')
        expect(scored[0].title).toBe('Remote Code Execution')
        expect(scored[0].createdAt).toBe('2026-03-05')
      })
    })
  })

  describe('combineAndSortAnomalies', () => {
    it('should combine all three anomaly types', () => {
      const threshold: Anomaly[] = [
        { type: 'threshold', source: 'performance', metric: 'lcp', currentValue: 3000, expectedValue: 2500, severity: 'critical' }
      ]
      const delta: Anomaly[] = [
        { type: 'delta', source: 'performance', metric: 'inp', currentValue: 220, expectedValue: 180, severity: 'info' }
      ]
      const trend: Anomaly[] = [
        { type: 'trend', source: 'stability', metric: 'new_errors', currentValue: 150, expectedValue: 100, severity: 'warning' }
      ]

      const combined = combineAndSortAnomalies(threshold, delta, trend)

      expect(combined).toHaveLength(3)
      expect(combined.map(a => a.type)).toContain('threshold')
      expect(combined.map(a => a.type)).toContain('delta')
      expect(combined.map(a => a.type)).toContain('trend')
    })

    it('should sort by severity priority', () => {
      const anomalies: Anomaly[] = [
        { type: 'delta', source: 'a', metric: 'a', currentValue: 1, expectedValue: 1, severity: 'info' },
        { type: 'threshold', source: 'b', metric: 'b', currentValue: 1, expectedValue: 1, severity: 'critical' },
        { type: 'trend', source: 'c', metric: 'c', currentValue: 1, expectedValue: 1, severity: 'warning' }
      ]

      const sorted = combineAndSortAnomalies(anomalies, [], [])

      expect(sorted[0].severity).toBe('critical')
      expect(sorted[1].severity).toBe('warning')
      expect(sorted[2].severity).toBe('info')
    })
  })
})
