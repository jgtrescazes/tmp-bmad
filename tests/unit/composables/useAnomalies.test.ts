import { describe, it, expect } from 'vitest'
import type { Anomaly } from '~/utils/anomalyEngine'
import {
  detectThresholdAnomalies,
  detectDeltaAnomalies,
  combineAndSortAnomalies
} from '~/utils/anomalyEngine'

describe('useAnomalies integration', () => {
  describe('combineAndSortAnomalies', () => {
    it('should combine threshold and delta anomalies', () => {
      const threshold: Anomaly[] = [
        {
          type: 'threshold',
          source: 'performance',
          metric: 'lcp',
          currentValue: 3000,
          expectedValue: 2500,
          severity: 'critical'
        }
      ]

      const delta: Anomaly[] = [
        {
          type: 'delta',
          source: 'performance',
          metric: 'inp',
          currentValue: 250,
          expectedValue: 200,
          severity: 'warning'
        }
      ]

      const combined = combineAndSortAnomalies(threshold, delta)

      expect(combined).toHaveLength(2)
    })

    it('should sort by severity (critical > warning > info)', () => {
      const anomalies: Anomaly[] = [
        {
          type: 'delta',
          source: 'performance',
          metric: 'inp',
          currentValue: 220,
          expectedValue: 200,
          severity: 'info'
        },
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
          source: 'performance',
          metric: 'cls',
          currentValue: 0.15,
          expectedValue: 0.1,
          severity: 'warning'
        }
      ]

      const sorted = combineAndSortAnomalies([], [], anomalies)

      expect(sorted[0].severity).toBe('critical')
      expect(sorted[1].severity).toBe('warning')
      expect(sorted[2].severity).toBe('info')
    })

    it('should include trend anomalies when provided', () => {
      const trend: Anomaly[] = [
        {
          type: 'trend',
          source: 'stability',
          metric: 'new_errors',
          currentValue: 150,
          expectedValue: 100,
          severity: 'warning'
        }
      ]

      const combined = combineAndSortAnomalies([], [], trend)

      expect(combined).toHaveLength(1)
      expect(combined[0].type).toBe('trend')
    })

    it('should handle empty arrays', () => {
      const combined = combineAndSortAnomalies([], [], [])
      expect(combined).toHaveLength(0)
    })
  })

  describe('anomaly pipeline', () => {
    it('should process performance metrics through threshold and delta detection', () => {
      // Current performance metrics
      const currentMetrics = [
        { metricName: 'lcp', value: 3000, source: 'performance' },
        { metricName: 'inp', value: 180, source: 'performance' },
        { metricName: 'cls', value: 0.05, source: 'performance' }
      ]

      // Previous period metrics
      const previousMetrics = [
        { metricName: 'lcp', value: 2000, source: 'performance' },
        { metricName: 'inp', value: 150, source: 'performance' },
        { metricName: 'cls', value: 0.04, source: 'performance' }
      ]

      // Run detection
      const thresholdAnomalies = detectThresholdAnomalies(currentMetrics)
      const deltaAnomalies = detectDeltaAnomalies(currentMetrics, previousMetrics)
      const allAnomalies = combineAndSortAnomalies(thresholdAnomalies, deltaAnomalies)

      // LCP: threshold breach (3000 > 2500) + delta (50% increase)
      // INP: delta only (20% increase, under 200ms threshold)
      // CLS: delta only (25% increase, under 0.1 threshold)
      expect(thresholdAnomalies).toHaveLength(1) // LCP threshold
      expect(deltaAnomalies.length).toBeGreaterThanOrEqual(2) // LCP + INP + CLS deltas
      expect(allAnomalies.length).toBeGreaterThanOrEqual(3)
    })
  })
})
