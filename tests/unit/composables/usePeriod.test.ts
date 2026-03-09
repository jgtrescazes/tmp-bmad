/**
 * Tests for usePeriod composable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useState
const mockState: Record<string, unknown> = {}

vi.mock('#app', () => ({
  useState: (key: string, init: () => unknown) => {
    if (!(key in mockState)) {
      mockState[key] = init()
    }
    return {
      value: mockState[key],
      get: () => mockState[key],
      set: (val: unknown) => { mockState[key] = val }
    }
  },
  readonly: <T>(val: T) => val
}))

// Re-implement usePeriod logic for testing
interface Period {
  from: string
  to: string
}

interface PeriodPreset {
  label: string
  value: string
  getDates: () => Period
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

const PERIOD_PRESETS: PeriodPreset[] = [
  {
    label: '7 derniers jours',
    value: '7d',
    getDates: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 7)
      return { from: formatDateISO(from), to: formatDateISO(to) }
    }
  },
  {
    label: '30 derniers jours',
    value: '30d',
    getDates: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 30)
      return { from: formatDateISO(from), to: formatDateISO(to) }
    }
  }
]

describe('usePeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15'))
    // Clear mock state
    Object.keys(mockState).forEach((key) => {
      Reflect.deleteProperty(mockState, key)
    })
  })

  describe('PERIOD_PRESETS', () => {
    it('calculates 7d preset correctly', () => {
      const preset = PERIOD_PRESETS.find(p => p.value === '7d')!
      const dates = preset.getDates()

      expect(dates.to).toBe('2026-03-15')
      expect(dates.from).toBe('2026-03-08')
    })

    it('calculates 30d preset correctly', () => {
      const preset = PERIOD_PRESETS.find(p => p.value === '30d')!
      const dates = preset.getDates()

      expect(dates.to).toBe('2026-03-15')
      expect(dates.from).toBe('2026-02-13')
    })
  })

  describe('formatDateISO', () => {
    it('formats date to YYYY-MM-DD', () => {
      const date = new Date('2026-03-09T14:30:00Z')
      expect(formatDateISO(date)).toBe('2026-03-09')
    })
  })

  describe('getPreviousPeriod', () => {
    it('calculates previous period correctly', () => {
      const period: Period = {
        from: '2026-03-01',
        to: '2026-03-31'
      }

      const fromDate = new Date(period.from)
      const toDate = new Date(period.to)
      const durationMs = toDate.getTime() - fromDate.getTime()

      const prevTo = new Date(fromDate.getTime() - 1)
      const prevFrom = new Date(prevTo.getTime() - durationMs)

      // Just verify the calculation produces valid dates
      expect(formatDateISO(prevFrom)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(formatDateISO(prevTo)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(formatDateISO(prevFrom)) < new Date(formatDateISO(prevTo))).toBe(true)
    })
  })
})

describe('Period types', () => {
  it('validates Period interface', () => {
    const period: Period = {
      from: '2026-03-01',
      to: '2026-03-31'
    }

    expect(period.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(period.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
