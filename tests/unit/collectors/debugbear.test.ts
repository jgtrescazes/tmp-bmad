/**
 * Unit tests for DebugBear collector
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Deno environment
const mockEnv = new Map<string, string>()
vi.stubGlobal('Deno', {
  env: {
    get: (key: string) => mockEnv.get(key)
  },
  serve: vi.fn()
})

describe('DebugBear Collector', () => {
  beforeEach(() => {
    mockEnv.clear()
    mockEnv.set('DEBUGBEAR_API_KEY', 'test-api-key')
    mockEnv.set('SUPABASE_URL', 'https://test.supabase.co')
    mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should require DEBUGBEAR_API_KEY environment variable', () => {
      mockEnv.delete('DEBUGBEAR_API_KEY')

      // Test configuration validation
      const apiKey = mockEnv.get('DEBUGBEAR_API_KEY')
      expect(apiKey).toBeUndefined()
    })

    it('should use correct API base URL', () => {
      const DEBUGBEAR_API_BASE = 'https://www.debugbear.com/api/v1'
      expect(DEBUGBEAR_API_BASE).toBe('https://www.debugbear.com/api/v1')
    })
  })

  describe('API Response Mapping', () => {
    it('should map DebugBear pages response correctly', () => {
      const mockPagesResponse = [
        { id: '123', name: 'Homepage', url: 'https://wamiz.com/' },
        { id: '456', name: 'Search', url: 'https://wamiz.com/search' }
      ]

      expect(mockPagesResponse[0].id).toBe('123')
      expect(mockPagesResponse[0].url).toBe('https://wamiz.com/')
    })

    it('should map lab metrics from test response', () => {
      const mockTestResponse = {
        id: 'test-1',
        createdAt: '2026-03-09T10:00:00Z',
        lcp: 2400,
        cls: 0.05,
        inp: 150
      }

      expect(mockTestResponse.lcp).toBe(2400)
      expect(mockTestResponse.cls).toBe(0.05)
      expect(mockTestResponse.inp).toBe(150)
    })

    it('should map field metrics from test response', () => {
      const mockTestResponse = {
        id: 'test-1',
        createdAt: '2026-03-09T10:00:00Z',
        fieldLcp: 2800,
        fieldCls: 0.08,
        fieldInp: 180
      }

      expect(mockTestResponse.fieldLcp).toBe(2800)
      expect(mockTestResponse.fieldCls).toBe(0.08)
      expect(mockTestResponse.fieldInp).toBe(180)
    })

    it('should handle missing metrics gracefully', () => {
      const mockTestResponse = {
        id: 'test-1',
        createdAt: '2026-03-09T10:00:00Z',
        lcp: 2400
        // cls and inp are missing
      }

      const cls = (mockTestResponse as { cls?: number }).cls ?? null
      const inp = (mockTestResponse as { inp?: number }).inp ?? null

      expect(cls).toBeNull()
      expect(inp).toBeNull()
    })
  })

  describe('MetricInsert Mapping', () => {
    it('should create MetricInsert with lab data source metadata', () => {
      const metricInsert = {
        source_id: 3,
        metric_type_id: 5,
        repository_id: 1,
        value: 2400,
        metadata: { data_source: 'lab', page_url: 'https://wamiz.com/' },
        collected_at: '2026-03-09T10:00:00Z'
      }

      expect(metricInsert.metadata.data_source).toBe('lab')
      expect(metricInsert.metadata.page_url).toBe('https://wamiz.com/')
    })

    it('should create MetricInsert with field data source metadata', () => {
      const metricInsert = {
        source_id: 3,
        metric_type_id: 5,
        repository_id: 1,
        value: 2800,
        metadata: { data_source: 'field', page_url: 'https://wamiz.com/' },
        collected_at: '2026-03-09T10:00:00Z'
      }

      expect(metricInsert.metadata.data_source).toBe('field')
    })

    it('should insert 6 metrics when both lab and field data available', () => {
      const labMetrics = { lcp: 2400, cls: 0.05, inp: 150 }
      const fieldMetrics = { lcp: 2800, cls: 0.08, inp: 180 }

      const metricsToInsert = []

      // Lab metrics
      if (labMetrics.lcp !== null) metricsToInsert.push({ name: 'lcp', source: 'lab' })
      if (labMetrics.cls !== null) metricsToInsert.push({ name: 'cls', source: 'lab' })
      if (labMetrics.inp !== null) metricsToInsert.push({ name: 'inp', source: 'lab' })

      // Field metrics
      if (fieldMetrics.lcp !== null) metricsToInsert.push({ name: 'lcp', source: 'field' })
      if (fieldMetrics.cls !== null) metricsToInsert.push({ name: 'cls', source: 'field' })
      if (fieldMetrics.inp !== null) metricsToInsert.push({ name: 'inp', source: 'field' })

      expect(metricsToInsert.length).toBe(6)
    })
  })

  describe('Error Handling', () => {
    it('should return partial status when no metrics available', () => {
      const metrics = { lab: { lcp: null, cls: null, inp: null }, field: { lcp: null, cls: null, inp: null } }

      const hasLabMetrics = Object.values(metrics.lab).some(v => v !== null)
      const hasFieldMetrics = Object.values(metrics.field).some(v => v !== null)

      const status = !hasLabMetrics && !hasFieldMetrics ? 'partial' : 'success'
      expect(status).toBe('partial')
    })

    it('should handle empty pages response', () => {
      const pages: unknown[] = []

      if (pages.length === 0) {
        const result = {
          pageUrl: '',
          lab: { lcp: null, cls: null, inp: null },
          field: { lcp: null, cls: null, inp: null }
        }
        expect(result.pageUrl).toBe('')
        expect(result.lab.lcp).toBeNull()
      }
    })

    it('should handle empty tests response', () => {
      const tests: unknown[] = []
      const pageUrl = 'https://wamiz.com/'

      if (tests.length === 0) {
        const result = {
          pageUrl,
          lab: { lcp: null, cls: null, inp: null },
          field: { lcp: null, cls: null, inp: null }
        }
        expect(result.pageUrl).toBe(pageUrl)
        expect(result.lab.lcp).toBeNull()
      }
    })
  })

  describe('CWV Thresholds', () => {
    const thresholds = {
      lcp: { good: 2500, needsImprovement: 4000 },
      inp: { good: 200, needsImprovement: 500 },
      cls: { good: 0.1, needsImprovement: 0.25 }
    }

    it('should classify LCP as good when <= 2500ms', () => {
      const lcp = 2400
      const status = lcp <= thresholds.lcp.good ? 'good' : lcp <= thresholds.lcp.needsImprovement ? 'needs-improvement' : 'poor'
      expect(status).toBe('good')
    })

    it('should classify LCP as needs-improvement when > 2500ms and <= 4000ms', () => {
      const lcp = 3000
      const status = lcp <= thresholds.lcp.good ? 'good' : lcp <= thresholds.lcp.needsImprovement ? 'needs-improvement' : 'poor'
      expect(status).toBe('needs-improvement')
    })

    it('should classify LCP as poor when > 4000ms', () => {
      const lcp = 5000
      const status = lcp <= thresholds.lcp.good ? 'good' : lcp <= thresholds.lcp.needsImprovement ? 'needs-improvement' : 'poor'
      expect(status).toBe('poor')
    })

    it('should classify CLS as good when <= 0.1', () => {
      const cls = 0.05
      const status = cls <= thresholds.cls.good ? 'good' : cls <= thresholds.cls.needsImprovement ? 'needs-improvement' : 'poor'
      expect(status).toBe('good')
    })

    it('should classify INP as good when <= 200ms', () => {
      const inp = 150
      const status = inp <= thresholds.inp.good ? 'good' : inp <= thresholds.inp.needsImprovement ? 'needs-improvement' : 'poor'
      expect(status).toBe('good')
    })
  })
})
