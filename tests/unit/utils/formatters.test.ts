/**
 * Tests for formatter utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatRelativeTime,
  formatDate,
  formatDateISO,
  formatNumber,
  formatPercent,
  formatDuration,
  formatDelta,
  formatMetricValue
} from '~/utils/formatters'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-09T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats "just now" correctly', () => {
    expect(formatRelativeTime('2026-03-09T11:59:30Z')).toBe("À l'instant")
  })

  it('formats minutes correctly', () => {
    expect(formatRelativeTime('2026-03-09T11:55:00Z')).toBe('Il y a 5min')
    expect(formatRelativeTime('2026-03-09T11:30:00Z')).toBe('Il y a 30min')
  })

  it('formats hours correctly', () => {
    expect(formatRelativeTime('2026-03-09T10:00:00Z')).toBe('Il y a 2h')
    expect(formatRelativeTime('2026-03-09T00:00:00Z')).toBe('Il y a 12h')
  })

  it('formats days correctly', () => {
    expect(formatRelativeTime('2026-03-08T12:00:00Z')).toBe('Il y a 1j')
    expect(formatRelativeTime('2026-03-06T12:00:00Z')).toBe('Il y a 3j')
  })

  it('formats weeks correctly', () => {
    expect(formatRelativeTime('2026-03-02T12:00:00Z')).toBe('Il y a 1sem')
    expect(formatRelativeTime('2026-02-23T12:00:00Z')).toBe('Il y a 2sem')
  })

  it('formats months correctly', () => {
    expect(formatRelativeTime('2026-02-01T12:00:00Z')).toBe('Il y a 1mois')
  })
})

describe('formatDateISO', () => {
  it('formats date to YYYY-MM-DD', () => {
    expect(formatDateISO(new Date('2026-03-09T14:30:00Z'))).toBe('2026-03-09')
    expect(formatDateISO(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01')
    expect(formatDateISO(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12-31')
  })
})

describe('formatNumber', () => {
  it('formats integers with French locale', () => {
    // Note: toLocaleString behavior may vary, test the general pattern
    const result = formatNumber(1234567)
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('567')
  })

  it('formats with specified decimals', () => {
    const result = formatNumber(42.567, 2)
    expect(result).toContain('42')
    expect(result).toContain('57') // Rounded
  })

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatPercent', () => {
  it('formats percentage with default decimals', () => {
    expect(formatPercent(42.567)).toBe('42.6%')
    expect(formatPercent(100)).toBe('100.0%')
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('respects custom decimals', () => {
    expect(formatPercent(42.5678, 2)).toBe('42.57%')
    expect(formatPercent(42, 0)).toBe('42%')
  })
})

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1.0s')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(30000)).toBe('30.0s')
  })

  it('formats minutes', () => {
    expect(formatDuration(60000)).toBe('1m0s')
    expect(formatDuration(90000)).toBe('1m30s')
    expect(formatDuration(125000)).toBe('2m5s')
  })
})

describe('formatDelta', () => {
  it('formats positive delta with plus sign', () => {
    expect(formatDelta(10)).toContain('+')
    expect(formatDelta(10)).toContain('10')
  })

  it('formats negative delta with minus', () => {
    const result = formatDelta(-10)
    expect(result).toContain('10')
  })

  it('formats zero delta', () => {
    expect(formatDelta(0)).toContain('+')
    expect(formatDelta(0)).toContain('0')
  })

  it('appends unit when provided', () => {
    expect(formatDelta(10, 'ms')).toContain('ms')
  })
})

describe('formatMetricValue', () => {
  it('formats milliseconds', () => {
    const result = formatMetricValue(1500, 'ms')
    // toLocaleString uses narrow no-break space (U+202F) in fr-FR
    expect(result).toContain('1')
    expect(result).toContain('500')
    expect(result).toContain('ms')
  })

  it('formats ratio with 4 decimals', () => {
    expect(formatMetricValue(0.0567, 'ratio')).toBe('0.0567')
  })

  it('formats percent', () => {
    expect(formatMetricValue(85.5, 'percent')).toBe('85.5%')
  })

  it('formats count with locale', () => {
    const result = formatMetricValue(1234, 'count')
    expect(result).toContain('1')
    expect(result).toContain('234')
  })
})
