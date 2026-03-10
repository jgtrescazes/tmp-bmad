/**
 * Unit tests for usePerformanceMetrics composable
 */
import { describe, it, expect } from 'vitest'
import {
  CWV_THRESHOLDS,
  getCWVStatusColor,
  formatCWVValue
} from '~/composables/usePerformanceMetrics'

describe('usePerformanceMetrics', () => {
  describe('CWV_THRESHOLDS', () => {
    it('should have correct LCP thresholds', () => {
      expect(CWV_THRESHOLDS.lcp.good).toBe(2500)
      expect(CWV_THRESHOLDS.lcp.needsImprovement).toBe(4000)
    })

    it('should have correct CLS thresholds', () => {
      expect(CWV_THRESHOLDS.cls.good).toBe(0.1)
      expect(CWV_THRESHOLDS.cls.needsImprovement).toBe(0.25)
    })

    it('should have correct INP thresholds', () => {
      expect(CWV_THRESHOLDS.inp.good).toBe(200)
      expect(CWV_THRESHOLDS.inp.needsImprovement).toBe(500)
    })
  })

  describe('getCWVStatusColor', () => {
    it('should return success for good LCP', () => {
      expect(getCWVStatusColor('lcp', 2000)).toBe('success')
      expect(getCWVStatusColor('lcp', 2500)).toBe('success')
    })

    it('should return warning for needs-improvement LCP', () => {
      expect(getCWVStatusColor('lcp', 3000)).toBe('warning')
      expect(getCWVStatusColor('lcp', 4000)).toBe('warning')
    })

    it('should return error for poor LCP', () => {
      expect(getCWVStatusColor('lcp', 5000)).toBe('error')
    })

    it('should return success for good CLS', () => {
      expect(getCWVStatusColor('cls', 0.05)).toBe('success')
      expect(getCWVStatusColor('cls', 0.1)).toBe('success')
    })

    it('should return warning for needs-improvement CLS', () => {
      expect(getCWVStatusColor('cls', 0.15)).toBe('warning')
      expect(getCWVStatusColor('cls', 0.25)).toBe('warning')
    })

    it('should return error for poor CLS', () => {
      expect(getCWVStatusColor('cls', 0.5)).toBe('error')
    })

    it('should return success for good INP', () => {
      expect(getCWVStatusColor('inp', 100)).toBe('success')
      expect(getCWVStatusColor('inp', 200)).toBe('success')
    })

    it('should return warning for needs-improvement INP', () => {
      expect(getCWVStatusColor('inp', 300)).toBe('warning')
      expect(getCWVStatusColor('inp', 500)).toBe('warning')
    })

    it('should return error for poor INP', () => {
      expect(getCWVStatusColor('inp', 600)).toBe('error')
    })

    it('should return gray for null value', () => {
      expect(getCWVStatusColor('lcp', null)).toBe('gray')
      expect(getCWVStatusColor('cls', null)).toBe('gray')
      expect(getCWVStatusColor('inp', null)).toBe('gray')
    })

    it('should return gray for unknown metric', () => {
      expect(getCWVStatusColor('unknown', 100)).toBe('gray')
    })
  })

  describe('formatCWVValue', () => {
    it('should return dash for null value', () => {
      expect(formatCWVValue('lcp', null)).toBe('—')
      expect(formatCWVValue('cls', null)).toBe('—')
      expect(formatCWVValue('inp', null)).toBe('—')
    })

    it('should format CLS with 3 decimal places', () => {
      expect(formatCWVValue('cls', 0.1)).toBe('0.100')
      expect(formatCWVValue('cls', 0.05)).toBe('0.050')
      expect(formatCWVValue('cls', 0.123)).toBe('0.123')
    })

    it('should format LCP in ms for values under 1000', () => {
      expect(formatCWVValue('lcp', 500)).toBe('500ms')
      expect(formatCWVValue('lcp', 999)).toBe('999ms')
    })

    it('should format LCP in seconds for values >= 1000', () => {
      expect(formatCWVValue('lcp', 1000)).toBe('1.00s')
      expect(formatCWVValue('lcp', 2500)).toBe('2.50s')
      expect(formatCWVValue('lcp', 3456)).toBe('3.46s')
    })

    it('should format INP in ms for values under 1000', () => {
      expect(formatCWVValue('inp', 150)).toBe('150ms')
      expect(formatCWVValue('inp', 200)).toBe('200ms')
    })

    it('should format INP in seconds for values >= 1000', () => {
      expect(formatCWVValue('inp', 1200)).toBe('1.20s')
    })
  })
})
