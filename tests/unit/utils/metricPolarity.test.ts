import { describe, it, expect } from 'vitest'
import {
  isInvertedMetric,
  getDeltaColor,
  isImprovement,
  INVERTED_METRICS
} from '~/utils/metricPolarity'

describe('metricPolarity', () => {
  describe('INVERTED_METRICS', () => {
    it('should include error metrics', () => {
      expect(INVERTED_METRICS).toContain('new_errors')
      expect(INVERTED_METRICS).toContain('error_count')
      expect(INVERTED_METRICS).toContain('error_rate')
    })

    it('should include CWV metrics', () => {
      expect(INVERTED_METRICS).toContain('lcp')
      expect(INVERTED_METRICS).toContain('cls')
      expect(INVERTED_METRICS).toContain('inp')
    })

    it('should include vulnerability metrics', () => {
      expect(INVERTED_METRICS).toContain('vuln_critical')
      expect(INVERTED_METRICS).toContain('vuln_high')
      expect(INVERTED_METRICS).toContain('vuln_medium')
      expect(INVERTED_METRICS).toContain('vuln_low')
    })
  })

  describe('isInvertedMetric', () => {
    it('should return true for inverted metrics', () => {
      expect(isInvertedMetric('new_errors')).toBe(true)
      expect(isInvertedMetric('lcp')).toBe(true)
      expect(isInvertedMetric('vuln_critical')).toBe(true)
    })

    it('should return false for non-inverted metrics', () => {
      expect(isInvertedMetric('coverage_lines')).toBe(false)
      expect(isInvertedMetric('resolved_errors')).toBe(false)
      expect(isInvertedMetric('unknown_metric')).toBe(false)
    })
  })

  describe('getDeltaColor', () => {
    describe('for inverted metrics (lower is better)', () => {
      it('should return success when delta is negative (improvement)', () => {
        expect(getDeltaColor(-10, 'new_errors')).toBe('success')
        expect(getDeltaColor(-500, 'lcp')).toBe('success')
        expect(getDeltaColor(-5, 'vuln_critical')).toBe('success')
      })

      it('should return danger when delta is positive (degradation)', () => {
        expect(getDeltaColor(10, 'new_errors')).toBe('danger')
        expect(getDeltaColor(500, 'lcp')).toBe('danger')
        expect(getDeltaColor(5, 'vuln_critical')).toBe('danger')
      })
    })

    describe('for non-inverted metrics (higher is better)', () => {
      it('should return success when delta is positive (improvement)', () => {
        expect(getDeltaColor(5, 'coverage_lines')).toBe('success')
        expect(getDeltaColor(10, 'resolved_errors')).toBe('success')
      })

      it('should return danger when delta is negative (degradation)', () => {
        expect(getDeltaColor(-5, 'coverage_lines')).toBe('danger')
        expect(getDeltaColor(-10, 'resolved_errors')).toBe('danger')
      })
    })

    it('should return neutral for null delta', () => {
      expect(getDeltaColor(null, 'new_errors')).toBe('neutral')
    })

    it('should return neutral for very small delta', () => {
      expect(getDeltaColor(0.001, 'new_errors')).toBe('neutral')
      expect(getDeltaColor(-0.005, 'lcp')).toBe('neutral')
    })
  })

  describe('isImprovement', () => {
    describe('for inverted metrics', () => {
      it('should return true when trend is down', () => {
        expect(isImprovement('down', 'new_errors')).toBe(true)
        expect(isImprovement('down', 'lcp')).toBe(true)
      })

      it('should return false when trend is up', () => {
        expect(isImprovement('up', 'new_errors')).toBe(false)
        expect(isImprovement('up', 'lcp')).toBe(false)
      })
    })

    describe('for non-inverted metrics', () => {
      it('should return true when trend is up', () => {
        expect(isImprovement('up', 'coverage_lines')).toBe(true)
      })

      it('should return false when trend is down', () => {
        expect(isImprovement('down', 'coverage_lines')).toBe(false)
      })
    })

    it('should return null for stable or unknown trends', () => {
      expect(isImprovement('stable', 'new_errors')).toBe(null)
      expect(isImprovement('unknown', 'coverage_lines')).toBe(null)
    })
  })
})
