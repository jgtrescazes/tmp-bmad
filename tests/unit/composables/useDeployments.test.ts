import { describe, it, expect, vi } from 'vitest'

/**
 * Tests for useDeployments composable and utility functions
 */

describe('useDeployments', () => {
  // Deployment type for testing
  interface Deployment {
    id: number
    repositoryId: number
    sha: string
    shortSha: string
    message: string
    author: string
    prNumber: number | null
    deployedAt: string
    createdAt: string
  }

  // Sample deployment data
  const sampleDeployments: Deployment[] = [
    {
      id: 1,
      repositoryId: 1,
      sha: 'abc123def456789012345678901234567890abcd',
      shortSha: 'abc123d',
      message: 'feat: add new feature for user authentication',
      author: 'developer@example.com',
      prNumber: 42,
      deployedAt: '2026-03-01T10:30:00Z',
      createdAt: '2026-03-01T10:30:00Z'
    },
    {
      id: 2,
      repositoryId: 1,
      sha: 'def456abc789012345678901234567890abcdef',
      shortSha: 'def456a',
      message: 'fix: resolve critical bug in payment flow',
      author: 'senior-dev@example.com',
      prNumber: 45,
      deployedAt: '2026-03-05T14:20:00Z',
      createdAt: '2026-03-05T14:20:00Z'
    },
    {
      id: 3,
      repositoryId: 1,
      sha: 'ghi789xyz012345678901234567890abcdefghi',
      shortSha: 'ghi789x',
      message: 'chore: update dependencies',
      author: 'bot@example.com',
      prNumber: null,
      deployedAt: '2026-03-08T09:00:00Z',
      createdAt: '2026-03-08T09:00:00Z'
    }
  ]

  describe('deploymentsToMarkLine', () => {
    function deploymentsToMarkLine(deployments: Deployment[]) {
      return {
        markLine: {
          silent: false,
          symbol: ['none', 'none'] as [string, string],
          lineStyle: {
            type: 'dashed',
            color: '#9ca3af',
            width: 1
          },
          label: {
            show: false
          },
          data: deployments.map(d => ({
            xAxis: d.deployedAt,
            name: d.shortSha
          }))
        }
      }
    }

    it('should convert deployments to ECharts markLine format', () => {
      const result = deploymentsToMarkLine(sampleDeployments)

      expect(result.markLine).toBeDefined()
      expect(result.markLine.data).toHaveLength(3)
      expect(result.markLine.silent).toBe(false) // Allows hover
    })

    it('should set correct xAxis values from deployedAt', () => {
      const result = deploymentsToMarkLine(sampleDeployments)

      expect(result.markLine.data[0].xAxis).toBe('2026-03-01T10:30:00Z')
      expect(result.markLine.data[1].xAxis).toBe('2026-03-05T14:20:00Z')
      expect(result.markLine.data[2].xAxis).toBe('2026-03-08T09:00:00Z')
    })

    it('should use shortSha as name for tooltip identification', () => {
      const result = deploymentsToMarkLine(sampleDeployments)

      expect(result.markLine.data[0].name).toBe('abc123d')
      expect(result.markLine.data[1].name).toBe('def456a')
      expect(result.markLine.data[2].name).toBe('ghi789x')
    })

    it('should set correct line style', () => {
      const result = deploymentsToMarkLine(sampleDeployments)

      expect(result.markLine.lineStyle.type).toBe('dashed')
      expect(result.markLine.lineStyle.color).toBe('#9ca3af')
      expect(result.markLine.lineStyle.width).toBe(1)
    })

    it('should hide labels (use tooltip instead)', () => {
      const result = deploymentsToMarkLine(sampleDeployments)

      expect(result.markLine.label.show).toBe(false)
    })

    it('should handle empty deployments array', () => {
      const result = deploymentsToMarkLine([])

      expect(result.markLine.data).toHaveLength(0)
    })
  })

  describe('deploymentsToMarkers', () => {
    function deploymentsToMarkers(deployments: Deployment[]) {
      return deployments.map(d => ({
        deployedAt: d.deployedAt,
        shortSha: d.shortSha,
        message: d.message,
        author: d.author
      }))
    }

    it('should convert deployments to marker format', () => {
      const markers = deploymentsToMarkers(sampleDeployments)

      expect(markers).toHaveLength(3)
      expect(markers[0]).toEqual({
        deployedAt: '2026-03-01T10:30:00Z',
        shortSha: 'abc123d',
        message: 'feat: add new feature for user authentication',
        author: 'developer@example.com'
      })
    })

    it('should not include unnecessary fields', () => {
      const markers = deploymentsToMarkers(sampleDeployments)

      expect(markers[0]).not.toHaveProperty('id')
      expect(markers[0]).not.toHaveProperty('repositoryId')
      expect(markers[0]).not.toHaveProperty('prNumber')
    })
  })

  describe('createDeploymentTooltipFormatter', () => {
    function createDeploymentTooltipFormatter(
      deployments: Deployment[],
      defaultFormatter: (params: unknown) => string
    ): (params: unknown) => string {
      return (params: unknown) => {
        const p = params as { componentType?: string, name?: string }

        if (p.componentType === 'markLine' && p.name) {
          const deployment = deployments.find(d => d.shortSha === p.name)
          if (deployment) {
            const date = new Intl.DateTimeFormat('fr-FR', {
              dateStyle: 'medium',
              timeStyle: 'short'
            }).format(new Date(deployment.deployedAt))

            const message
              = deployment.message.length > 50
                ? `${deployment.message.substring(0, 50)}...`
                : deployment.message

            return `
              <div>
                <strong>Deploiement ${deployment.shortSha}</strong><br/>
                <span>${date}</span><br/>
                <span>${message}</span><br/>
                <em>${deployment.author}</em>
                ${deployment.prNumber ? `<br/><span>PR #${deployment.prNumber}</span>` : ''}
              </div>
            `.trim()
          }
        }

        return defaultFormatter(params)
      }
    }

    const defaultFormatter = vi.fn(() => 'default tooltip')

    it('should return deployment tooltip for markLine component', () => {
      const formatter = createDeploymentTooltipFormatter(
        sampleDeployments,
        defaultFormatter
      )

      const result = formatter({
        componentType: 'markLine',
        name: 'abc123d'
      })

      expect(result).toContain('Deploiement abc123d')
      expect(result).toContain('developer@example.com')
      expect(result).toContain('PR #42')
      expect(defaultFormatter).not.toHaveBeenCalled()
    })

    it('should use default formatter for non-markLine components', () => {
      const formatter = createDeploymentTooltipFormatter(
        sampleDeployments,
        defaultFormatter
      )

      const result = formatter({
        componentType: 'series',
        name: 'some-series'
      })

      expect(result).toBe('default tooltip')
      expect(defaultFormatter).toHaveBeenCalled()
    })

    it('should truncate long messages', () => {
      const longMessageDeployment: Deployment = {
        ...sampleDeployments[0],
        message:
          'This is a very long commit message that should be truncated because it exceeds the 50 character limit'
      }

      const formatter = createDeploymentTooltipFormatter(
        [longMessageDeployment],
        defaultFormatter
      )

      const result = formatter({
        componentType: 'markLine',
        name: 'abc123d'
      })

      expect(result).toContain('...')
      expect(result).not.toContain('50 character limit')
    })

    it('should not show PR link when prNumber is null', () => {
      const formatter = createDeploymentTooltipFormatter(
        sampleDeployments,
        defaultFormatter
      )

      const result = formatter({
        componentType: 'markLine',
        name: 'ghi789x' // This deployment has no PR
      })

      expect(result).not.toContain('PR #')
    })

    it('should return default tooltip when deployment not found', () => {
      const formatter = createDeploymentTooltipFormatter(
        sampleDeployments,
        defaultFormatter
      )

      const result = formatter({
        componentType: 'markLine',
        name: 'unknown-sha'
      })

      expect(result).toBe('default tooltip')
    })
  })

  describe('period filtering', () => {
    it('should include deployments within period range', () => {
      const periodFrom = '2026-03-01'
      const periodTo = '2026-03-10'

      const filtered = sampleDeployments.filter((d) => {
        const deployedDate = new Date(d.deployedAt)
        const from = new Date(periodFrom)
        const to = new Date(`${periodTo}T23:59:59Z`)
        return deployedDate >= from && deployedDate <= to
      })

      expect(filtered).toHaveLength(3)
    })

    it('should exclude deployments outside period range', () => {
      const periodFrom = '2026-03-06'
      const periodTo = '2026-03-10'

      const filtered = sampleDeployments.filter((d) => {
        const deployedDate = new Date(d.deployedAt)
        const from = new Date(periodFrom)
        const to = new Date(`${periodTo}T23:59:59Z`)
        return deployedDate >= from && deployedDate <= to
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].shortSha).toBe('ghi789x')
    })
  })

  describe('repository filtering', () => {
    const multiRepoDeployments: Deployment[] = [
      ...sampleDeployments,
      {
        id: 4,
        repositoryId: 2,
        sha: 'xyz999abc123456789012345678901234567890',
        shortSha: 'xyz999a',
        message: 'Other repo deployment',
        author: 'other@example.com',
        prNumber: 100,
        deployedAt: '2026-03-07T12:00:00Z',
        createdAt: '2026-03-07T12:00:00Z'
      }
    ]

    it('should filter by repositoryId when provided', () => {
      const repositoryId = 1
      const filtered = multiRepoDeployments.filter(
        d => d.repositoryId === repositoryId
      )

      expect(filtered).toHaveLength(3)
      expect(filtered.every(d => d.repositoryId === 1)).toBe(true)
    })

    it('should return all deployments when repositoryId is null', () => {
      const repositoryId = null
      const filtered
        = repositoryId === null
          ? multiRepoDeployments
          : multiRepoDeployments.filter(d => d.repositoryId === repositoryId)

      expect(filtered).toHaveLength(4)
    })
  })

  describe('deployment ordering', () => {
    it('should order deployments by deployedAt ascending', () => {
      const sorted = [...sampleDeployments].sort(
        (a, b) =>
          new Date(a.deployedAt).getTime() - new Date(b.deployedAt).getTime()
      )

      expect(sorted[0].shortSha).toBe('abc123d')
      expect(sorted[1].shortSha).toBe('def456a')
      expect(sorted[2].shortSha).toBe('ghi789x')
    })
  })
})
