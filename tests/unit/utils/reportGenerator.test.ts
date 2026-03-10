import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateMarkdownReport,
  generateReportFilename,
  downloadMarkdown
} from '~/utils/reportGenerator'
import type { ReportData, ReportSection, ReportDeployment } from '~/types/report'
import type { Anomaly } from '~/utils/anomalyEngine'

// Mock document and URL for download tests
const mockCreateElement = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()

describe('reportGenerator', () => {
  // Sample test data
  const sampleAnomalies: Anomaly[] = [
    {
      type: 'threshold',
      source: 'performance',
      metric: 'lcp',
      currentValue: 3000,
      expectedValue: 2500,
      severity: 'critical'
    },
    {
      type: 'delta',
      source: 'stability',
      metric: 'new_errors',
      currentValue: 150,
      expectedValue: 100,
      severity: 'warning'
    }
  ]

  const sampleSection: ReportSection = {
    axis: 'stability',
    displayName: 'Stabilite (Sentry)',
    metrics: [
      {
        name: 'new_errors',
        displayName: 'Nouvelles erreurs',
        currentValue: 42,
        previousValue: 38,
        delta: 10.5,
        unit: ''
      },
      {
        name: 'error_rate',
        displayName: 'Taux d\'erreurs',
        currentValue: 0.05,
        previousValue: 0.04,
        delta: 25,
        unit: 'ratio'
      }
    ],
    anomalies: sampleAnomalies.filter(a => a.source === 'stability'),
    topProblems: sampleAnomalies.filter(a => a.source === 'stability')
  }

  const sampleDeployments: ReportDeployment[] = [
    {
      sha: 'abc1234567890',
      shortSha: 'abc1234',
      message: 'Fix: resolve CLS issue in homepage',
      author: 'dev@example.com',
      prNumber: 123,
      deployedAt: '2026-02-15T14:30:00Z'
    },
    {
      sha: 'def5678901234',
      shortSha: 'def5678',
      message: 'feat: add new dashboard component',
      author: 'dev2@example.com',
      prNumber: null,
      deployedAt: '2026-02-10T10:00:00Z'
    }
  ]

  const sampleReportData: ReportData = {
    period: '2026-02',
    previousPeriod: '2026-01',
    repositoryName: 'international',
    generatedAt: '2026-02-28T12:00:00Z',
    sections: [
      sampleSection,
      {
        axis: 'performance',
        displayName: 'Performance (CWV)',
        metrics: [
          {
            name: 'lcp',
            displayName: 'LCP',
            currentValue: 2800,
            previousValue: 2500,
            delta: 12,
            unit: 'ms'
          }
        ],
        anomalies: sampleAnomalies.filter(a => a.source === 'performance'),
        topProblems: sampleAnomalies.filter(a => a.source === 'performance')
      },
      {
        axis: 'security',
        displayName: 'Securite (Dependabot)',
        metrics: [],
        anomalies: [],
        topProblems: []
      },
      {
        axis: 'quality',
        displayName: 'Qualite (Coverage)',
        metrics: [
          {
            name: 'coverage',
            displayName: 'Couverture',
            currentValue: 85.5,
            previousValue: null,
            delta: null,
            unit: '%'
          }
        ],
        anomalies: [],
        topProblems: []
      }
    ],
    deployments: sampleDeployments,
    totalAnomalies: sampleAnomalies.length
  }

  describe('generateMarkdownReport', () => {
    it('should generate a valid markdown string', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(typeof markdown).toBe('string')
      expect(markdown.length).toBeGreaterThan(0)
    })

    it('should include the header with repository and period', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(markdown).toContain('# Rapport Mensuel')
      expect(markdown).toContain('international')
      expect(markdown).toContain('février 2026') // Month in French (with accent)
    })

    it('should include the executive summary', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(markdown).toContain('## Resume Executif')
      expect(markdown).toContain('anomalie(s)')
      expect(markdown).toContain('deploiement(s)')
      expect(markdown).toContain('Tendance generale')
    })

    it('should include all axis sections', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(markdown).toContain('## Stabilite (Sentry)')
      expect(markdown).toContain('## Performance (CWV)')
      expect(markdown).toContain('## Securite (Dependabot)')
      expect(markdown).toContain('## Qualite (Coverage)')
    })

    it('should include metrics tables with headers', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(markdown).toContain('| Metrique |')
      expect(markdown).toContain('| Delta |')
      expect(markdown).toContain('|----')
    })

    it('should include metric values with formatting', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(markdown).toContain('Nouvelles erreurs')
      expect(markdown).toContain('2800 ms') // LCP value
    })

    it('should include delta percentages with signs', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(markdown).toContain('+10.5%') // new_errors delta
      expect(markdown).toContain('+12.0%') // lcp delta with warning
    })

    it('should include top problems when present', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(markdown).toContain('### Top problemes')
      expect(markdown).toContain('🔴') // Critical emoji
    })

    it('should include deployments section', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(markdown).toContain('## Deploiements du mois')
      expect(markdown).toContain('abc1234')
      expect(markdown).toContain('dev@example.com')
      expect(markdown).toContain('#123')
    })

    it('should include footer', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      expect(markdown).toContain('Rapport genere automatiquement par Watchtower')
    })

    it('should handle N/A for missing previous values', () => {
      const markdown = generateMarkdownReport(sampleReportData)

      // Quality section has null previousValue for coverage
      expect(markdown).toContain('N/A')
    })

    it('should handle empty metrics section', () => {
      const emptyReport: ReportData = {
        ...sampleReportData,
        sections: [{
          axis: 'stability',
          displayName: 'Stabilite (Sentry)',
          metrics: [],
          anomalies: [],
          topProblems: []
        }]
      }

      const markdown = generateMarkdownReport(emptyReport)

      expect(markdown).toContain('Aucune metrique disponible')
    })

    it('should handle empty deployments', () => {
      const noDeploymentsReport: ReportData = {
        ...sampleReportData,
        deployments: []
      }

      const markdown = generateMarkdownReport(noDeploymentsReport)

      expect(markdown).toContain('Aucun deploiement ce mois')
    })

    it('should truncate long deployment messages', () => {
      const longMessageReport: ReportData = {
        ...sampleReportData,
        deployments: [{
          ...sampleDeployments[0],
          message: 'This is a very long commit message that should be truncated to prevent the markdown table from breaking due to excessive width'
        }]
      }

      const markdown = generateMarkdownReport(longMessageReport)

      expect(markdown).toContain('...')
      expect(markdown).not.toContain('excessive width')
    })
  })

  describe('generateReportFilename', () => {
    it('should generate correct filename format', () => {
      const filename = generateReportFilename(sampleReportData)

      expect(filename).toBe('rapport-international-2026-02.md')
    })

    it('should slugify repository names with spaces', () => {
      const reportWithSpaces: ReportData = {
        ...sampleReportData,
        repositoryName: 'My Project Name'
      }

      const filename = generateReportFilename(reportWithSpaces)

      expect(filename).toBe('rapport-my-project-name-2026-02.md')
    })

    it('should handle special characters in repository name', () => {
      const reportWithSpecialChars: ReportData = {
        ...sampleReportData,
        repositoryName: 'Project@2.0 (Beta)'
      }

      const filename = generateReportFilename(reportWithSpecialChars)

      expect(filename).toBe('rapport-project-2-0-beta-2026-02.md')
    })

    it('should handle different periods', () => {
      const decemberReport: ReportData = {
        ...sampleReportData,
        period: '2025-12'
      }

      const filename = generateReportFilename(decemberReport)

      expect(filename).toBe('rapport-international-2025-12.md')
    })
  })

  describe('downloadMarkdown', () => {
    let mockLink: {
      href: string
      download: string
      style: { display: string }
      click: ReturnType<typeof vi.fn>
    }

    beforeEach(() => {
      mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      }

      mockCreateElement.mockReturnValue(mockLink)
      mockCreateObjectURL.mockReturnValue('blob:http://localhost/mock-url')

      // Mock document
      vi.stubGlobal('document', {
        createElement: mockCreateElement,
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild
        }
      })

      // Mock URL
      vi.stubGlobal('URL', {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.resetAllMocks()
    })

    it('should create a Blob with markdown content', () => {
      const content = '# Test Report'
      const filename = 'test.md'

      downloadMarkdown(content, filename)

      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.any(Blob)
      )
    })

    it('should create an anchor element with correct attributes', () => {
      const content = '# Test Report'
      const filename = 'rapport-test.md'

      downloadMarkdown(content, filename)

      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockLink.href).toBe('blob:http://localhost/mock-url')
      expect(mockLink.download).toBe('rapport-test.md')
    })

    it('should trigger click on the link', () => {
      downloadMarkdown('content', 'file.md')

      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should append and remove link from document body', () => {
      downloadMarkdown('content', 'file.md')

      expect(mockAppendChild).toHaveBeenCalledWith(mockLink)
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink)
    })

    it('should revoke object URL to prevent memory leak', () => {
      downloadMarkdown('content', 'file.md')

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-url')
    })
  })

  describe('edge cases', () => {
    it('should handle report with zero anomalies', () => {
      const noAnomaliesReport: ReportData = {
        ...sampleReportData,
        sections: sampleReportData.sections.map(s => ({
          ...s,
          anomalies: [],
          topProblems: []
        })),
        totalAnomalies: 0
      }

      const markdown = generateMarkdownReport(noAnomaliesReport)

      expect(markdown).toContain('**0 anomalie(s)**')
      expect(markdown).toContain('Stable') // Trend should be stable
    })

    it('should handle report with only critical anomalies', () => {
      const criticalOnlyReport: ReportData = {
        ...sampleReportData,
        sections: [{
          axis: 'performance',
          displayName: 'Performance (CWV)',
          metrics: [],
          anomalies: [{
            type: 'threshold',
            source: 'performance',
            metric: 'lcp',
            currentValue: 5000,
            expectedValue: 2500,
            severity: 'critical'
          }],
          topProblems: [{
            type: 'threshold',
            source: 'performance',
            metric: 'lcp',
            currentValue: 5000,
            expectedValue: 2500,
            severity: 'critical'
          }]
        }],
        totalAnomalies: 1
      }

      const markdown = generateMarkdownReport(criticalOnlyReport)

      expect(markdown).toContain('Degradation') // Trend should be degrading
      expect(markdown).toContain('1 critique(s)')
    })

    it('should handle deployment without PR number', () => {
      const directCommitReport: ReportData = {
        ...sampleReportData,
        deployments: [{
          sha: 'abc1234567890',
          shortSha: 'abc1234',
          message: 'Direct commit without PR',
          author: 'dev@example.com',
          prNumber: null,
          deployedAt: '2026-02-15T14:30:00Z'
        }]
      }

      const markdown = generateMarkdownReport(directCommitReport)

      // Should show '-' for PR column when null
      expect(markdown).toContain('| - |')
    })

    it('should format milliseconds correctly', () => {
      const msReport: ReportData = {
        ...sampleReportData,
        sections: [{
          axis: 'performance',
          displayName: 'Performance (CWV)',
          metrics: [{
            name: 'lcp',
            displayName: 'LCP',
            currentValue: 1234,
            previousValue: 1000,
            delta: 23.4,
            unit: 'ms'
          }],
          anomalies: [],
          topProblems: []
        }]
      }

      const markdown = generateMarkdownReport(msReport)

      expect(markdown).toContain('1234 ms')
    })

    it('should format percentages correctly', () => {
      const percentReport: ReportData = {
        ...sampleReportData,
        sections: [{
          axis: 'quality',
          displayName: 'Qualite (Coverage)',
          metrics: [{
            name: 'coverage',
            displayName: 'Couverture',
            currentValue: 87.5,
            previousValue: 85.0,
            delta: 2.94,
            unit: '%'
          }],
          anomalies: [],
          topProblems: []
        }]
      }

      const markdown = generateMarkdownReport(percentReport)

      expect(markdown).toContain('87.5%')
    })

    it('should format ratios correctly', () => {
      const ratioReport: ReportData = {
        ...sampleReportData,
        sections: [{
          axis: 'performance',
          displayName: 'Performance (CWV)',
          metrics: [{
            name: 'cls',
            displayName: 'CLS',
            currentValue: 0.123,
            previousValue: 0.1,
            delta: 23,
            unit: 'ratio'
          }],
          anomalies: [],
          topProblems: []
        }]
      }

      const markdown = generateMarkdownReport(ratioReport)

      expect(markdown).toContain('0.123')
    })
  })
})
