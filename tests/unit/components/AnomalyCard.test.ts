import { describe, it, expect } from 'vitest'
import type { Anomaly } from '~/utils/anomalyEngine'
import {
  getAnomalyRoute,
  getAnomalySeverityColor,
  formatAnomalyType
} from '~/composables/useAnomalies'

/**
 * Tests for AnomalyCard component logic
 * Tests the computation functions without DOM rendering
 */

describe('AnomalyCard Logic', () => {
  const mockAnomaly: Anomaly = {
    type: 'threshold',
    source: 'performance',
    metric: 'lcp',
    currentValue: 3000,
    expectedValue: 2500,
    severity: 'critical'
  }

  describe('getAnomalyRoute', () => {
    it('should return /performance for performance source', () => {
      expect(getAnomalyRoute({ ...mockAnomaly, source: 'performance' })).toBe('/performance')
    })

    it('should return /stability for stability source', () => {
      expect(getAnomalyRoute({ ...mockAnomaly, source: 'stability' })).toBe('/stability')
    })

    it('should return /security for security source', () => {
      expect(getAnomalyRoute({ ...mockAnomaly, source: 'security' })).toBe('/security')
    })

    it('should return /quality for quality source', () => {
      expect(getAnomalyRoute({ ...mockAnomaly, source: 'quality' })).toBe('/quality')
    })

    it('should return / for unknown source', () => {
      expect(getAnomalyRoute({ ...mockAnomaly, source: 'unknown' })).toBe('/')
    })
  })

  describe('getAnomalySeverityColor', () => {
    it('should return error for critical severity', () => {
      expect(getAnomalySeverityColor('critical')).toBe('error')
    })

    it('should return warning for warning severity', () => {
      expect(getAnomalySeverityColor('warning')).toBe('warning')
    })

    it('should return info for info severity', () => {
      expect(getAnomalySeverityColor('info')).toBe('info')
    })
  })

  describe('formatAnomalyType', () => {
    it('should format threshold type', () => {
      expect(formatAnomalyType('threshold')).toBe('Seuil dépassé')
    })

    it('should format delta type', () => {
      expect(formatAnomalyType('delta')).toBe('Variation M/M-1')
    })

    it('should format trend type', () => {
      expect(formatAnomalyType('trend')).toBe('Tendance 3 mois')
    })
  })

  describe('value formatting', () => {
    // Simulating the component's formatValue function
    function formatValue(value: number, metric: string): string {
      if (metric === 'cls') {
        return value.toFixed(3)
      }
      if (['lcp', 'inp', 'fcp', 'ttfb'].includes(metric)) {
        return `${value}ms`
      }
      if (metric.includes('coverage')) {
        return `${value.toFixed(1)}%`
      }
      return String(Math.round(value))
    }

    it('should format LCP with ms suffix', () => {
      expect(formatValue(3000, 'lcp')).toBe('3000ms')
    })

    it('should format INP with ms suffix', () => {
      expect(formatValue(250, 'inp')).toBe('250ms')
    })

    it('should format CLS with 3 decimal places', () => {
      expect(formatValue(0.15, 'cls')).toBe('0.150')
    })

    it('should format coverage with percentage', () => {
      expect(formatValue(85.5, 'coverage_lines')).toBe('85.5%')
    })

    it('should format other metrics as rounded integers', () => {
      expect(formatValue(123.7, 'new_errors')).toBe('124')
    })
  })
})
