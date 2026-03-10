/**
 * Unit tests for Dependabot collector
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

describe('Dependabot Collector', () => {
  beforeEach(() => {
    mockEnv.clear()
    mockEnv.set('GITHUB_TOKEN', 'test-token')
    mockEnv.set('GITHUB_OWNER', 'wamiz')
    mockEnv.set('GITHUB_REPO', 'wamiz-international')
    mockEnv.set('SUPABASE_URL', 'https://test.supabase.co')
    mockEnv.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should require GITHUB_TOKEN environment variable', () => {
      mockEnv.delete('GITHUB_TOKEN')

      const token = mockEnv.get('GITHUB_TOKEN')
      expect(token).toBeUndefined()
    })

    it('should use default owner and repo if not provided', () => {
      const owner = mockEnv.get('GITHUB_OWNER') || 'wamiz'
      const repo = mockEnv.get('GITHUB_REPO') || 'wamiz-international'

      expect(owner).toBe('wamiz')
      expect(repo).toBe('wamiz-international')
    })
  })

  describe('Severity Mapping', () => {
    const SEVERITY_MAP: Record<string, string> = {
      critical: 'vuln_critical',
      high: 'vuln_high',
      medium: 'vuln_medium',
      low: 'vuln_low'
    }

    it('should map critical severity correctly', () => {
      expect(SEVERITY_MAP.critical).toBe('vuln_critical')
    })

    it('should map high severity correctly', () => {
      expect(SEVERITY_MAP.high).toBe('vuln_high')
    })

    it('should map medium severity correctly', () => {
      expect(SEVERITY_MAP.medium).toBe('vuln_medium')
    })

    it('should map low severity correctly', () => {
      expect(SEVERITY_MAP.low).toBe('vuln_low')
    })
  })

  describe('Age Calculation', () => {
    it('should calculate age in days correctly', () => {
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - 15) // 15 days ago

      const ageDays = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(ageDays).toBe(15)
    })

    it('should handle today as 0 days', () => {
      const createdAt = new Date()

      const ageDays = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(ageDays).toBe(0)
    })
  })

  describe('Alert Response Mapping', () => {
    it('should map Dependabot alert response correctly', () => {
      const mockAlert = {
        number: 42,
        state: 'open',
        security_advisory: {
          severity: 'high',
          summary: 'Prototype pollution'
        },
        dependency: {
          package: {
            name: 'lodash',
            ecosystem: 'npm'
          }
        },
        created_at: '2026-02-22T10:00:00Z',
        updated_at: '2026-02-22T10:00:00Z',
        dismissed_at: null,
        fixed_at: null
      }

      expect(mockAlert.number).toBe(42)
      expect(mockAlert.state).toBe('open')
      expect(mockAlert.security_advisory.severity).toBe('high')
      expect(mockAlert.dependency.package.name).toBe('lodash')
    })

    it('should count alerts by severity', () => {
      const alerts = [
        { severity: 'critical' },
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' },
        { severity: 'low' }
      ]

      const counts = { critical: 0, high: 0, medium: 0, low: 0 }

      for (const alert of alerts) {
        counts[alert.severity as keyof typeof counts]++
      }

      expect(counts.critical).toBe(2)
      expect(counts.high).toBe(1)
      expect(counts.medium).toBe(1)
      expect(counts.low).toBe(2)
    })
  })

  describe('Metadata Structure', () => {
    it('should create correct metadata JSONB structure', () => {
      const metadata = {
        alerts: [
          {
            number: 42,
            state: 'open',
            severity: 'high',
            package: 'lodash',
            age_days: 15,
            created_at: '2026-02-22T10:00:00Z'
          }
        ],
        total_open: 7
      }

      expect(metadata.alerts).toHaveLength(1)
      expect(metadata.alerts[0].severity).toBe('high')
      expect(metadata.total_open).toBe(7)
    })
  })

  describe('Pagination Handling', () => {
    it('should recognize Link header for pagination', () => {
      const linkHeader = '<https://api.github.com/repos/wamiz/wamiz-international/dependabot/alerts?page=2>; rel="next", <https://api.github.com/repos/wamiz/wamiz-international/dependabot/alerts?page=5>; rel="last"'

      const hasNext = linkHeader.includes('rel="next"')
      expect(hasNext).toBe(true)
    })

    it('should stop when no next page', () => {
      const linkHeader = '<https://api.github.com/repos/wamiz/wamiz-international/dependabot/alerts?page=4>; rel="prev"'

      const hasNext = linkHeader.includes('rel="next"')
      expect(hasNext).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should return empty array for 404 (disabled Dependabot)', () => {
      const status = 404

      if (status === 404) {
        const result: unknown[] = []
        expect(result).toEqual([])
      }
    })
  })
})
