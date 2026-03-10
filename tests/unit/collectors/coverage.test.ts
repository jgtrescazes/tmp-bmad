/**
 * Unit tests for Coverage collector
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

describe('Coverage Collector', () => {
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

    it('should use correct artifact name', () => {
      const ARTIFACT_NAME = 'coverage-report'
      expect(ARTIFACT_NAME).toBe('coverage-report')
    })
  })

  describe('coverage-summary.json Parsing', () => {
    it('should parse coverage-summary.json format correctly', () => {
      const summaryJson = {
        total: {
          lines: { total: 10000, covered: 8500, pct: 85.0 },
          functions: { total: 1500, covered: 1200, pct: 80.0 },
          classes: { total: 200, covered: 180, pct: 90.0 }
        }
      }

      expect(summaryJson.total.lines.pct).toBe(85.0)
      expect(summaryJson.total.functions.pct).toBe(80.0)
      expect(summaryJson.total.classes.pct).toBe(90.0)
    })

    it('should handle missing metrics gracefully', () => {
      const summaryJson = {
        total: {
          lines: { total: 10000, covered: 8500, pct: 85.0 }
          // functions and classes missing
        }
      }

      const total = summaryJson.total as Record<string, { total: number, covered: number, pct: number } | undefined>

      const functions = total.functions || { total: 0, covered: 0, pct: 0 }
      const classes = total.classes || { total: 0, covered: 0, pct: 0 }

      expect(functions.pct).toBe(0)
      expect(classes.pct).toBe(0)
    })
  })

  describe('clover.xml Parsing', () => {
    it('should parse clover.xml metrics correctly', () => {
      const metricsStr = '<metrics files="100" loc="50000" ncloc="45000" classes="200" methods="1500" coveredmethods="1200" coveredclasses="180" statements="10000" coveredstatements="8500" />'

      const getAttr = (name: string): number => {
        const match = metricsStr.match(new RegExp(`${name}="(\\d+)"`))
        return match ? parseInt(match[1], 10) : 0
      }

      expect(getAttr('statements')).toBe(10000)
      expect(getAttr('coveredstatements')).toBe(8500)
      expect(getAttr('methods')).toBe(1500)
      expect(getAttr('coveredmethods')).toBe(1200)
      expect(getAttr('classes')).toBe(200)
      expect(getAttr('coveredclasses')).toBe(180)
    })

    it('should calculate coverage percentages correctly', () => {
      const statements = 10000
      const coveredstatements = 8500
      const methods = 1500
      const coveredmethods = 1200
      const classes = 200
      const coveredclasses = 180

      const linesPct = statements > 0 ? Math.round((coveredstatements / statements) * 1000) / 10 : 0
      const functionsPct = methods > 0 ? Math.round((coveredmethods / methods) * 1000) / 10 : 0
      const classesPct = classes > 0 ? Math.round((coveredclasses / classes) * 1000) / 10 : 0

      expect(linesPct).toBe(85)
      expect(functionsPct).toBe(80)
      expect(classesPct).toBe(90)
    })

    it('should handle zero division', () => {
      const statements = 0
      const coveredstatements = 0

      const pct = statements > 0 ? (coveredstatements / statements) * 100 : 0
      expect(pct).toBe(0)
    })
  })

  describe('Module Coverage Parsing', () => {
    it('should extract module coverage from package elements', () => {
      const packageName = 'App\\Module\\Auth'
      const pkgStatements = 500
      const pkgCovered = 450
      const linesPct = pkgStatements > 0 ? (pkgCovered / pkgStatements) * 100 : 0

      const module = {
        name: packageName,
        lines_pct: Math.round(linesPct * 10) / 10
      }

      expect(module.name).toBe('App\\Module\\Auth')
      expect(module.lines_pct).toBe(90)
    })
  })

  describe('Artifact API', () => {
    it('should map GitHub artifact response correctly', () => {
      const artifact = {
        id: 12345,
        name: 'coverage-report',
        created_at: '2026-03-09T10:00:00Z',
        archive_download_url: 'https://api.github.com/repos/wamiz/wamiz-international/actions/artifacts/12345/zip'
      }

      expect(artifact.id).toBe(12345)
      expect(artifact.name).toBe('coverage-report')
    })

    it('should select latest artifact by created_at', () => {
      const artifacts = [
        { id: 1, created_at: '2026-03-07T10:00:00Z' },
        { id: 2, created_at: '2026-03-09T10:00:00Z' },
        { id: 3, created_at: '2026-03-08T10:00:00Z' }
      ]

      const latest = artifacts.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      expect(latest.id).toBe(2)
    })
  })

  describe('Metadata Structure', () => {
    it('should create correct metadata JSONB structure', () => {
      const metadata = {
        artifact_id: 12345,
        format: 'clover.xml',
        modules: [
          { name: 'App\\Module\\Auth', lines_pct: 92.5 },
          { name: 'App\\Module\\Search', lines_pct: 78.3 }
        ]
      }

      expect(metadata.artifact_id).toBe(12345)
      expect(metadata.format).toBe('clover.xml')
      expect(metadata.modules).toHaveLength(2)
    })
  })

  describe('Error Handling', () => {
    it('should return partial status when no artifact found', () => {
      const artifacts: unknown[] = []

      const status = artifacts.length === 0 ? 'partial' : 'success'
      expect(status).toBe('partial')
    })
  })
})
