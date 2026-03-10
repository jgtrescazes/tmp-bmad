import { describe, it, expect } from 'vitest'
import { getDeltaColor } from '~/utils/metricPolarity'

/**
 * Tests for DeltaBadge component logic
 * Tests the computation functions without DOM rendering
 */

describe('DeltaBadge Logic', () => {
  // Simulate component computed functions
  function computeDelta(current: number | null, previous: number | null): number | null {
    if (current === null || previous === null) return null
    return current - previous
  }

  function computeDeltaPercent(
    current: number | null,
    previous: number | null
  ): number | null {
    if (current === null || previous === null || previous === 0) return null
    return ((current - previous) / Math.abs(previous)) * 100
  }

  function computeTrend(
    deltaPercent: number | null
  ): 'up' | 'down' | 'stable' | 'unknown' {
    if (deltaPercent === null) return 'unknown'
    if (Math.abs(deltaPercent) < 1) return 'stable'
    return deltaPercent > 0 ? 'up' : 'down'
  }

  function formatDelta(val: number, unit: string): string {
    const sign = val >= 0 ? '+' : ''
    switch (unit) {
      case 'percent':
        return `${sign}${val.toFixed(1)}%`
      case 'ms':
        return `${sign}${Math.round(val)}ms`
      case 'ratio':
        return `${sign}${val.toFixed(3)}`
      default:
        return `${sign}${val}`
    }
  }

  function computeColorClasses(color: 'success' | 'danger' | 'neutral'): string {
    switch (color) {
      case 'success':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'danger':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50'
    }
  }

  describe('delta computation', () => {
    it('should calculate positive delta correctly', () => {
      expect(computeDelta(100, 80)).toBe(20)
    })

    it('should calculate negative delta correctly', () => {
      expect(computeDelta(60, 80)).toBe(-20)
    })

    it('should return null when current is null', () => {
      expect(computeDelta(null, 80)).toBeNull()
    })

    it('should return null when previous is null', () => {
      expect(computeDelta(100, null)).toBeNull()
    })

    it('should return null when both are null', () => {
      expect(computeDelta(null, null)).toBeNull()
    })
  })

  describe('delta percent computation', () => {
    it('should calculate positive percentage correctly', () => {
      expect(computeDeltaPercent(100, 80)).toBe(25)
    })

    it('should calculate negative percentage correctly', () => {
      expect(computeDeltaPercent(60, 100)).toBe(-40)
    })

    it('should return null when previous is zero', () => {
      expect(computeDeltaPercent(100, 0)).toBeNull()
    })

    it('should return null when current is null', () => {
      expect(computeDeltaPercent(null, 80)).toBeNull()
    })

    it('should return null when previous is null', () => {
      expect(computeDeltaPercent(100, null)).toBeNull()
    })

    it('should handle 100% increase', () => {
      expect(computeDeltaPercent(200, 100)).toBe(100)
    })

    it('should handle 50% decrease', () => {
      expect(computeDeltaPercent(50, 100)).toBe(-50)
    })
  })

  describe('trend computation', () => {
    it('should return "up" for positive delta percentage', () => {
      expect(computeTrend(10)).toBe('up')
      expect(computeTrend(1.5)).toBe('up')
    })

    it('should return "down" for negative delta percentage', () => {
      expect(computeTrend(-10)).toBe('down')
      expect(computeTrend(-1.5)).toBe('down')
    })

    it('should return "stable" for small changes', () => {
      expect(computeTrend(0.5)).toBe('stable')
      expect(computeTrend(-0.8)).toBe('stable')
      expect(computeTrend(0)).toBe('stable')
    })

    it('should return "unknown" for null delta percentage', () => {
      expect(computeTrend(null)).toBe('unknown')
    })
  })

  describe('delta formatting', () => {
    describe('count unit', () => {
      it('should format positive count', () => {
        expect(formatDelta(20, 'count')).toBe('+20')
      })

      it('should format negative count', () => {
        expect(formatDelta(-20, 'count')).toBe('-20')
      })

      it('should format zero', () => {
        expect(formatDelta(0, 'count')).toBe('+0')
      })
    })

    describe('percent unit', () => {
      it('should format positive percentage', () => {
        expect(formatDelta(5.5, 'percent')).toBe('+5.5%')
      })

      it('should format negative percentage', () => {
        expect(formatDelta(-3.2, 'percent')).toBe('-3.2%')
      })
    })

    describe('ms unit', () => {
      it('should format positive milliseconds', () => {
        expect(formatDelta(500, 'ms')).toBe('+500ms')
      })

      it('should format negative milliseconds', () => {
        expect(formatDelta(-250, 'ms')).toBe('-250ms')
      })

      it('should round milliseconds', () => {
        expect(formatDelta(123.7, 'ms')).toBe('+124ms')
      })
    })

    describe('ratio unit', () => {
      it('should format positive ratio with 3 decimals', () => {
        expect(formatDelta(0.025, 'ratio')).toBe('+0.025')
      })

      it('should format negative ratio with 3 decimals', () => {
        expect(formatDelta(-0.015, 'ratio')).toBe('-0.015')
      })
    })
  })

  describe('color classes', () => {
    it('should return success classes for success color', () => {
      const classes = computeColorClasses('success')
      expect(classes).toContain('text-green')
      expect(classes).toContain('bg-green')
    })

    it('should return danger classes for danger color', () => {
      const classes = computeColorClasses('danger')
      expect(classes).toContain('text-red')
      expect(classes).toContain('bg-red')
    })

    it('should return neutral classes for neutral color', () => {
      const classes = computeColorClasses('neutral')
      expect(classes).toContain('text-gray')
      expect(classes).toContain('bg-gray')
    })
  })

  describe('integration with metricPolarity', () => {
    it('should determine correct color for inverted metric improvement', () => {
      // For new_errors, a decrease is good (success)
      const delta = computeDelta(10, 20) // -10 (improvement)
      const color = getDeltaColor(delta, 'new_errors')
      expect(color).toBe('success')
    })

    it('should determine correct color for inverted metric degradation', () => {
      // For new_errors, an increase is bad (danger)
      const delta = computeDelta(30, 20) // +10 (degradation)
      const color = getDeltaColor(delta, 'new_errors')
      expect(color).toBe('danger')
    })

    it('should determine correct color for normal metric improvement', () => {
      // For coverage_lines, an increase is good (success)
      const delta = computeDelta(90, 80) // +10 (improvement)
      const color = getDeltaColor(delta, 'coverage_lines')
      expect(color).toBe('success')
    })

    it('should determine correct color for normal metric degradation', () => {
      // For coverage_lines, a decrease is bad (danger)
      const delta = computeDelta(70, 80) // -10 (degradation)
      const color = getDeltaColor(delta, 'coverage_lines')
      expect(color).toBe('danger')
    })

    it('should return neutral for null delta', () => {
      const color = getDeltaColor(null, 'new_errors')
      expect(color).toBe('neutral')
    })

    it('should return neutral for very small delta', () => {
      const color = getDeltaColor(0.005, 'new_errors')
      expect(color).toBe('neutral')
    })
  })

  describe('N/A scenario (no previous data)', () => {
    it('should show N/A state when previous is null', () => {
      const delta = computeDelta(100, null)
      const deltaPercent = computeDeltaPercent(100, null)
      const trend = computeTrend(deltaPercent)

      expect(delta).toBeNull()
      expect(deltaPercent).toBeNull()
      expect(trend).toBe('unknown')
    })

    it('should show N/A state when both are null', () => {
      const delta = computeDelta(null, null)
      const deltaPercent = computeDeltaPercent(null, null)
      const trend = computeTrend(deltaPercent)

      expect(delta).toBeNull()
      expect(deltaPercent).toBeNull()
      expect(trend).toBe('unknown')
    })
  })
})
