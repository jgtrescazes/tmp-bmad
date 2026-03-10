import { describe, it, expect } from 'vitest'

/**
 * Tests for backfill API endpoint logic
 */

describe('backfill API', () => {
  describe('date validation', () => {
    function isValidISODate(dateString: string): boolean {
      const regex = /^\d{4}-\d{2}-\d{2}$/
      if (!regex.test(dateString)) return false

      const date = new Date(dateString)
      if (isNaN(date.getTime())) return false

      // Verify the parsed date matches the input (catches Feb 30 → Mar 2 issues)
      const [year, month, day] = dateString.split('-').map(Number)
      return (
        date.getUTCFullYear() === year
        && date.getUTCMonth() + 1 === month
        && date.getUTCDate() === day
      )
    }

    it('should accept valid ISO date format', () => {
      expect(isValidISODate('2026-03-01')).toBe(true)
      expect(isValidISODate('2025-12-31')).toBe(true)
      expect(isValidISODate('2026-01-15')).toBe(true)
    })

    it('should reject invalid date formats', () => {
      expect(isValidISODate('03-01-2026')).toBe(false)
      expect(isValidISODate('2026/03/01')).toBe(false)
      expect(isValidISODate('March 1, 2026')).toBe(false)
      expect(isValidISODate('2026-3-1')).toBe(false)
    })

    it('should reject invalid dates', () => {
      expect(isValidISODate('2026-13-01')).toBe(false) // Invalid month
      expect(isValidISODate('2026-02-30')).toBe(false) // Invalid day
      expect(isValidISODate('not-a-date')).toBe(false)
    })
  })

  describe('date range validation', () => {
    const MAX_RANGE_DAYS = 90

    function validateDateRange(from: string, to: string): { valid: boolean, error?: string } {
      const fromDate = new Date(from)
      const toDate = new Date(to)

      if (fromDate > toDate) {
        return { valid: false, error: `'from' must be before 'to'` }
      }

      const rangeDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      if (rangeDays > MAX_RANGE_DAYS) {
        return { valid: false, error: `Range too large: ${rangeDays} days. Max: ${MAX_RANGE_DAYS}` }
      }

      return { valid: true }
    }

    it('should accept valid date ranges', () => {
      expect(validateDateRange('2026-02-01', '2026-03-01').valid).toBe(true)
      expect(validateDateRange('2026-01-01', '2026-03-01').valid).toBe(true)
      expect(validateDateRange('2026-03-01', '2026-03-01').valid).toBe(true) // Same day
    })

    it('should reject when from > to', () => {
      const result = validateDateRange('2026-03-15', '2026-03-01')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('before')
    })

    it('should reject ranges exceeding max days', () => {
      const result = validateDateRange('2026-01-01', '2026-06-01')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too large')
    })
  })

  describe('source validation', () => {
    const VALID_SOURCES = ['sentry', 'github', 'debugbear', 'dependabot', 'coverage']

    function isValidSource(source: string): boolean {
      return VALID_SOURCES.includes(source)
    }

    it('should accept valid sources', () => {
      expect(isValidSource('sentry')).toBe(true)
      expect(isValidSource('github')).toBe(true)
      expect(isValidSource('debugbear')).toBe(true)
      expect(isValidSource('dependabot')).toBe(true)
      expect(isValidSource('coverage')).toBe(true)
    })

    it('should reject invalid sources', () => {
      expect(isValidSource('unknown')).toBe(false)
      expect(isValidSource('datadog')).toBe(false)
      expect(isValidSource('')).toBe(false)
    })
  })

  describe('backfill request structure', () => {
    interface BackfillRequest {
      source?: string
      from: string
      to: string
      repositoryId?: number
    }

    function validateRequest(body: Partial<BackfillRequest>): { valid: boolean, errors: string[] } {
      const errors: string[] = []

      if (!body.from) errors.push('Missing required parameter: from')
      if (!body.to) errors.push('Missing required parameter: to')

      return {
        valid: errors.length === 0,
        errors
      }
    }

    it('should accept complete request', () => {
      const result = validateRequest({
        source: 'sentry',
        from: '2026-02-01',
        to: '2026-03-01',
        repositoryId: 1
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should accept request without optional source', () => {
      const result = validateRequest({
        from: '2026-02-01',
        to: '2026-03-01'
      })
      expect(result.valid).toBe(true)
    })

    it('should reject request missing from', () => {
      const result = validateRequest({
        to: '2026-03-01'
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing required parameter: from')
    })

    it('should reject request missing to', () => {
      const result = validateRequest({
        from: '2026-02-01'
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Missing required parameter: to')
    })
  })

  describe('backfill result structure', () => {
    interface BackfillResult {
      source: string
      status: 'success' | 'failed' | 'partial' | 'skipped'
      rowsCollected?: number
      errorMessage?: string
    }

    it('should structure success result correctly', () => {
      const result: BackfillResult = {
        source: 'sentry',
        status: 'success',
        rowsCollected: 120
      }
      expect(result.status).toBe('success')
      expect(result.rowsCollected).toBe(120)
    })

    it('should structure failed result correctly', () => {
      const result: BackfillResult = {
        source: 'debugbear',
        status: 'failed',
        errorMessage: 'API rate limit exceeded'
      }
      expect(result.status).toBe('failed')
      expect(result.errorMessage).toBeDefined()
    })

    it('should structure partial result correctly (e.g., Dependabot)', () => {
      const result: BackfillResult = {
        source: 'dependabot',
        status: 'partial',
        rowsCollected: 4,
        errorMessage: 'Backfill not fully supported: API provides current state only'
      }
      expect(result.status).toBe('partial')
      expect(result.rowsCollected).toBe(4)
      expect(result.errorMessage).toContain('not fully supported')
    })
  })

  describe('summary calculation', () => {
    interface BackfillResult {
      source: string
      status: 'success' | 'failed' | 'partial' | 'skipped'
      rowsCollected?: number
    }

    function calculateSummary(results: BackfillResult[]): {
      sources: number
      success: number
      failed: number
      partial: number
      totalRows: number
    } {
      return {
        sources: results.length,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        partial: results.filter(r => r.status === 'partial').length,
        totalRows: results.reduce((sum, r) => sum + (r.rowsCollected || 0), 0)
      }
    }

    it('should calculate summary correctly', () => {
      const results: BackfillResult[] = [
        { source: 'sentry', status: 'success', rowsCollected: 120 },
        { source: 'github', status: 'success', rowsCollected: 45 },
        { source: 'dependabot', status: 'partial', rowsCollected: 4 },
        { source: 'debugbear', status: 'failed' },
        { source: 'coverage', status: 'success', rowsCollected: 30 }
      ]

      const summary = calculateSummary(results)

      expect(summary.sources).toBe(5)
      expect(summary.success).toBe(3)
      expect(summary.failed).toBe(1)
      expect(summary.partial).toBe(1)
      expect(summary.totalRows).toBe(199)
    })

    it('should handle empty results', () => {
      const summary = calculateSummary([])

      expect(summary.sources).toBe(0)
      expect(summary.totalRows).toBe(0)
    })
  })
})

describe('CollectRequest types', () => {
  interface BackfillParams {
    from: string
    to: string
  }

  interface CollectRequest {
    time?: string
    backfill?: BackfillParams
    repositoryId?: number
  }

  it('should support normal collection mode', () => {
    const request: CollectRequest = {
      time: '2026-03-09T12:00:00Z'
    }
    expect(request.backfill).toBeUndefined()
  })

  it('should support backfill mode', () => {
    const request: CollectRequest = {
      backfill: {
        from: '2026-02-01',
        to: '2026-03-01'
      }
    }
    expect(request.backfill).toBeDefined()
    expect(request.backfill?.from).toBe('2026-02-01')
  })

  it('should support repository override', () => {
    const request: CollectRequest = {
      backfill: {
        from: '2026-02-01',
        to: '2026-03-01'
      },
      repositoryId: 2
    }
    expect(request.repositoryId).toBe(2)
  })
})
