/**
 * Unit tests for useQualityMetrics composable
 */
import { describe, it, expect } from 'vitest'
import {
  COVERAGE_THRESHOLDS,
  getCoverageStatusColor,
  getCoverageStatus,
  formatCoverage
} from '~/composables/useQualityMetrics'

describe('useQualityMetrics', () => {
  describe('COVERAGE_THRESHOLDS', () => {
    it('should have correct good threshold (80%)', () => {
      expect(COVERAGE_THRESHOLDS.good).toBe(80)
    })

    it('should have correct acceptable threshold (60%)', () => {
      expect(COVERAGE_THRESHOLDS.acceptable).toBe(60)
    })

    it('should have correct poor threshold (40%)', () => {
      expect(COVERAGE_THRESHOLDS.poor).toBe(40)
    })
  })

  describe('getCoverageStatusColor', () => {
    it('should return success for good coverage (>= 80%)', () => {
      expect(getCoverageStatusColor(80)).toBe('success')
      expect(getCoverageStatusColor(90)).toBe('success')
      expect(getCoverageStatusColor(100)).toBe('success')
    })

    it('should return warning for acceptable coverage (60-79%)', () => {
      expect(getCoverageStatusColor(60)).toBe('warning')
      expect(getCoverageStatusColor(70)).toBe('warning')
      expect(getCoverageStatusColor(79)).toBe('warning')
    })

    it('should return error for poor coverage (< 60%)', () => {
      expect(getCoverageStatusColor(59)).toBe('error')
      expect(getCoverageStatusColor(40)).toBe('error')
      expect(getCoverageStatusColor(0)).toBe('error')
    })

    it('should return gray for null', () => {
      expect(getCoverageStatusColor(null)).toBe('gray')
    })
  })

  describe('getCoverageStatus', () => {
    it('should return "Bon" for good coverage (>= 80%)', () => {
      expect(getCoverageStatus(80)).toBe('Bon')
      expect(getCoverageStatus(100)).toBe('Bon')
    })

    it('should return "Acceptable" for acceptable coverage (60-79%)', () => {
      expect(getCoverageStatus(60)).toBe('Acceptable')
      expect(getCoverageStatus(79)).toBe('Acceptable')
    })

    it('should return "Faible" for poor coverage (40-59%)', () => {
      expect(getCoverageStatus(40)).toBe('Faible')
      expect(getCoverageStatus(59)).toBe('Faible')
    })

    it('should return "Insuffisant" for very poor coverage (< 40%)', () => {
      expect(getCoverageStatus(39)).toBe('Insuffisant')
      expect(getCoverageStatus(0)).toBe('Insuffisant')
    })

    it('should return "Inconnu" for null', () => {
      expect(getCoverageStatus(null)).toBe('Inconnu')
    })
  })

  describe('formatCoverage', () => {
    it('should return dash for null', () => {
      expect(formatCoverage(null)).toBe('—')
    })

    it('should format with one decimal place', () => {
      expect(formatCoverage(85)).toBe('85.0%')
      expect(formatCoverage(85.5)).toBe('85.5%')
      expect(formatCoverage(85.56)).toBe('85.6%') // rounds
    })

    it('should handle 0%', () => {
      expect(formatCoverage(0)).toBe('0.0%')
    })

    it('should handle 100%', () => {
      expect(formatCoverage(100)).toBe('100.0%')
    })
  })
})
