/**
 * Unit tests for useSecurityMetrics composable
 */
import { describe, it, expect } from 'vitest'
import {
  SEVERITY_COLORS,
  SEVERITY_ORDER,
  getSeverityBadgeColor,
  formatAge
} from '~/composables/useSecurityMetrics'

describe('useSecurityMetrics', () => {
  describe('SEVERITY_COLORS', () => {
    it('should have correct color for critical severity', () => {
      expect(SEVERITY_COLORS.critical).toBe('#ef4444')
    })

    it('should have correct color for high severity', () => {
      expect(SEVERITY_COLORS.high).toBe('#f97316')
    })

    it('should have correct color for medium severity', () => {
      expect(SEVERITY_COLORS.medium).toBe('#eab308')
    })

    it('should have correct color for low severity', () => {
      expect(SEVERITY_COLORS.low).toBe('#3b82f6')
    })
  })

  describe('SEVERITY_ORDER', () => {
    it('should have correct order (critical first)', () => {
      expect(SEVERITY_ORDER).toEqual(['critical', 'high', 'medium', 'low'])
    })

    it('should have critical at index 0', () => {
      expect(SEVERITY_ORDER.indexOf('critical')).toBe(0)
    })

    it('should have low at index 3', () => {
      expect(SEVERITY_ORDER.indexOf('low')).toBe(3)
    })
  })

  describe('getSeverityBadgeColor', () => {
    it('should return error for critical severity', () => {
      expect(getSeverityBadgeColor('critical')).toBe('error')
    })

    it('should return warning for high severity', () => {
      expect(getSeverityBadgeColor('high')).toBe('warning')
    })

    it('should return warning for medium severity', () => {
      expect(getSeverityBadgeColor('medium')).toBe('warning')
    })

    it('should return info for low severity', () => {
      expect(getSeverityBadgeColor('low')).toBe('info')
    })

    it('should return neutral for unknown severity', () => {
      // @ts-expect-error Testing invalid input
      expect(getSeverityBadgeColor('unknown')).toBe('neutral')
    })
  })

  describe('formatAge', () => {
    it('should return "Aujourd\'hui" for 0 days', () => {
      expect(formatAge(0)).toBe('Aujourd\'hui')
    })

    it('should return "1 jour" for 1 day', () => {
      expect(formatAge(1)).toBe('1 jour')
    })

    it('should return "X jours" for 2-6 days', () => {
      expect(formatAge(3)).toBe('3 jours')
      expect(formatAge(6)).toBe('6 jours')
    })

    it('should return "X semaine(s)" for 7-29 days', () => {
      expect(formatAge(7)).toBe('1 semaine')
      expect(formatAge(14)).toBe('2 semaines')
      expect(formatAge(21)).toBe('3 semaines')
    })

    it('should return "X mois" for 30-364 days', () => {
      expect(formatAge(30)).toBe('1 mois')
      expect(formatAge(60)).toBe('2 mois')
      expect(formatAge(180)).toBe('6 mois')
    })

    it('should return "X an(s)" for 365+ days', () => {
      expect(formatAge(365)).toBe('1 an')
      expect(formatAge(730)).toBe('2 ans')
    })
  })
})
