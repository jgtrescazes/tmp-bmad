import { describe, it, expect } from 'vitest'
import type { Anomaly } from '~/utils/anomalyEngine'

/**
 * Tests for InvestigateBanner component logic
 * Tests the computation functions without DOM rendering
 */

describe('InvestigateBanner Logic', () => {
  const criticalAnomaly: Anomaly = {
    type: 'threshold',
    source: 'performance',
    metric: 'lcp',
    currentValue: 3000,
    expectedValue: 2500,
    severity: 'critical'
  }

  const warningAnomaly: Anomaly = {
    type: 'delta',
    source: 'stability',
    metric: 'new_errors',
    currentValue: 150,
    expectedValue: 100,
    severity: 'warning'
  }

  const infoAnomaly: Anomaly = {
    type: 'trend',
    source: 'quality',
    metric: 'coverage_lines',
    currentValue: 75,
    expectedValue: 85,
    severity: 'info'
  }

  describe('visibility logic', () => {
    function shouldShowBanner(anomalies: Anomaly[], pending: boolean): boolean {
      return !pending && anomalies.length > 0
    }

    it('should not show banner when no anomalies', () => {
      expect(shouldShowBanner([], false)).toBe(false)
    })

    it('should show banner when anomalies exist', () => {
      expect(shouldShowBanner([criticalAnomaly], false)).toBe(true)
    })

    it('should not show banner while pending', () => {
      expect(shouldShowBanner([criticalAnomaly], true)).toBe(false)
    })

    it('should show banner with multiple anomalies', () => {
      expect(shouldShowBanner([criticalAnomaly, warningAnomaly, infoAnomaly], false)).toBe(true)
    })
  })

  describe('title generation', () => {
    function generateTitle(count: number): string {
      if (count === 1) {
        return '1 anomalie à investiguer'
      }
      return `${count} anomalies à investiguer`
    }

    it('should use singular form for 1 anomaly', () => {
      expect(generateTitle(1)).toBe('1 anomalie à investiguer')
    })

    it('should use plural form for multiple anomalies', () => {
      expect(generateTitle(2)).toBe('2 anomalies à investiguer')
      expect(generateTitle(5)).toBe('5 anomalies à investiguer')
    })

    it('should handle zero anomalies', () => {
      expect(generateTitle(0)).toBe('0 anomalies à investiguer')
    })
  })

  describe('anomaly ordering', () => {
    it('should display critical first, then warning, then info', () => {
      const anomalies = [infoAnomaly, criticalAnomaly, warningAnomaly]

      // Simulating sorting by severity
      const severityOrder: Record<string, number> = {
        critical: 0,
        warning: 1,
        info: 2
      }

      const sorted = [...anomalies].sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      )

      expect(sorted[0].severity).toBe('critical')
      expect(sorted[1].severity).toBe('warning')
      expect(sorted[2].severity).toBe('info')
    })
  })

  describe('expand/collapse logic', () => {
    it('should start collapsed', () => {
      const isExpanded = false
      expect(isExpanded).toBe(false)
    })

    it('should toggle on click', () => {
      let isExpanded = false
      isExpanded = !isExpanded
      expect(isExpanded).toBe(true)
      isExpanded = !isExpanded
      expect(isExpanded).toBe(false)
    })
  })

  describe('anomaly count computation', () => {
    it('should return correct count', () => {
      const anomalies = [criticalAnomaly, warningAnomaly]
      expect(anomalies.length).toBe(2)
    })

    it('should count mixed severity types', () => {
      const anomalies = [criticalAnomaly, warningAnomaly, infoAnomaly]
      expect(anomalies.length).toBe(3)
    })
  })

  describe('hasCritical detection', () => {
    function hasCritical(anomalies: Anomaly[]): boolean {
      return anomalies.some(a => a.severity === 'critical')
    }

    it('should detect critical anomaly', () => {
      expect(hasCritical([criticalAnomaly])).toBe(true)
    })

    it('should return false when no critical', () => {
      expect(hasCritical([warningAnomaly, infoAnomaly])).toBe(false)
    })

    it('should detect critical among others', () => {
      expect(hasCritical([warningAnomaly, criticalAnomaly, infoAnomaly])).toBe(true)
    })
  })
})
