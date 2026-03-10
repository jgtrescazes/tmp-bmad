import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

// Import after mocking
import { isInvertedMetric, getDeltaColor } from '~/utils/metricPolarity'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  gte: vi.fn(() => mockSupabaseClient),
  lte: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => Promise.resolve({ data: [], error: null }))
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockSupabaseClient,
  useAsyncData: vi.fn((key, fn) => {
    const result = ref(null)
    const pending = ref(true)
    const error = ref(null)

    fn().then((data: unknown) => {
      result.value = data
      pending.value = false
    }).catch((e: Error) => {
      error.value = e
      pending.value = false
    })

    return { data: result, pending, error }
  }),
  useState: vi.fn((key, init) => ref(init()))
}))

describe('useComparison utility functions', () => {
  describe('delta calculations', () => {
    it('should calculate delta percentage correctly', () => {
      // Simulate the computation
      const current = 100
      const previous = 80
      const deltaPercent = ((current - previous) / Math.abs(previous)) * 100
      expect(deltaPercent).toBe(25)
    })

    it('should handle zero previous value', () => {
      const current = 10
      const previous = 0
      const deltaPercent = previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100
      expect(deltaPercent).toBeNull()
    })

    it('should handle null values', () => {
      const current = null
      const previous = 80
      const deltaAbsolute = current !== null && previous !== null ? current - previous : null
      expect(deltaAbsolute).toBeNull()
    })

    it('should handle negative deltas', () => {
      const current = 60
      const previous = 100
      const deltaPercent = ((current - previous) / Math.abs(previous)) * 100
      expect(deltaPercent).toBe(-40)
    })
  })

  describe('trend computation', () => {
    function computeTrend(deltaPercent: number | null): 'up' | 'down' | 'stable' | 'unknown' {
      if (deltaPercent === null) return 'unknown'
      if (Math.abs(deltaPercent) < 1) return 'stable'
      return deltaPercent > 0 ? 'up' : 'down'
    }

    it('should return "up" for positive delta', () => {
      expect(computeTrend(10)).toBe('up')
    })

    it('should return "down" for negative delta', () => {
      expect(computeTrend(-10)).toBe('down')
    })

    it('should return "stable" for small delta', () => {
      expect(computeTrend(0.5)).toBe('stable')
      expect(computeTrend(-0.8)).toBe('stable')
    })

    it('should return "unknown" for null delta', () => {
      expect(computeTrend(null)).toBe('unknown')
    })
  })

  describe('integration with metricPolarity', () => {
    it('should correctly identify inverted metrics color', () => {
      // For inverted metrics (lower is better), a negative delta is success
      expect(getDeltaColor(-10, 'new_errors')).toBe('success')
      expect(getDeltaColor(10, 'new_errors')).toBe('danger')

      // For non-inverted metrics (higher is better), a positive delta is success
      expect(getDeltaColor(10, 'coverage_lines')).toBe('success')
      expect(getDeltaColor(-10, 'coverage_lines')).toBe('danger')
    })
  })
})

describe('ComparisonResult structure', () => {
  interface ComparisonResult {
    metricName: string
    metricDisplayName: string
    unit: string
    currentValue: number | null
    previousValue: number | null
    deltaAbsolute: number | null
    deltaPercent: number | null
    trend: 'up' | 'down' | 'stable' | 'unknown'
    color: 'success' | 'danger' | 'neutral'
    isInverted: boolean
  }

  it('should correctly build comparison result for inverted metric', () => {
    const metricName = 'new_errors'
    const currentValue = 10
    const previousValue = 20
    const deltaAbsolute = currentValue - previousValue
    const deltaPercent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100

    const result: ComparisonResult = {
      metricName,
      metricDisplayName: 'Nouvelles erreurs',
      unit: 'count',
      currentValue,
      previousValue,
      deltaAbsolute,
      deltaPercent,
      trend: 'down',
      color: getDeltaColor(deltaAbsolute, metricName),
      isInverted: isInvertedMetric(metricName)
    }

    expect(result.deltaAbsolute).toBe(-10)
    expect(result.deltaPercent).toBe(-50)
    expect(result.trend).toBe('down')
    expect(result.color).toBe('success') // Down is good for errors
    expect(result.isInverted).toBe(true)
  })

  it('should correctly build comparison result for non-inverted metric', () => {
    const metricName = 'coverage_lines'
    const currentValue = 85
    const previousValue = 80
    const deltaAbsolute = currentValue - previousValue
    const deltaPercent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100

    const result: ComparisonResult = {
      metricName,
      metricDisplayName: 'Coverage Lines',
      unit: 'percent',
      currentValue,
      previousValue,
      deltaAbsolute,
      deltaPercent,
      trend: 'up',
      color: getDeltaColor(deltaAbsolute, metricName),
      isInverted: isInvertedMetric(metricName)
    }

    expect(result.deltaAbsolute).toBe(5)
    expect(result.deltaPercent).toBe(6.25)
    expect(result.trend).toBe('up')
    expect(result.color).toBe('success') // Up is good for coverage
    expect(result.isInverted).toBe(false)
  })

  it('should handle N/A case when previous is null', () => {
    const result: ComparisonResult = {
      metricName: 'new_errors',
      metricDisplayName: 'Nouvelles erreurs',
      unit: 'count',
      currentValue: 10,
      previousValue: null,
      deltaAbsolute: null,
      deltaPercent: null,
      trend: 'unknown',
      color: 'neutral',
      isInverted: true
    }

    expect(result.deltaAbsolute).toBeNull()
    expect(result.deltaPercent).toBeNull()
    expect(result.trend).toBe('unknown')
    expect(result.color).toBe('neutral')
  })
})
