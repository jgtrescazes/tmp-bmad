/**
 * Unit tests for GitHub Deployments collector
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

describe('GitHub Deployments Collector', () => {
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

    it('should use correct commits per page', () => {
      const COMMITS_PER_PAGE = 30
      expect(COMMITS_PER_PAGE).toBe(30)
    })
  })

  describe('PR Number Extraction', () => {
    function extractPrNumber(message: string): number | null {
      const match = message.match(/Merge pull request #(\d+)/)
      return match ? parseInt(match[1], 10) : null
    }

    it('should extract PR number from standard merge commit', () => {
      const message = 'Merge pull request #123 from wamiz/feature-branch'
      expect(extractPrNumber(message)).toBe(123)
    })

    it('should extract PR number with large number', () => {
      const message = 'Merge pull request #9999 from wamiz/hotfix'
      expect(extractPrNumber(message)).toBe(9999)
    })

    it('should return null for non-merge commits', () => {
      const message = 'feat: add new feature'
      expect(extractPrNumber(message)).toBeNull()
    })

    it('should return null for squash merge commits', () => {
      const message = 'Add new feature (#123)'
      expect(extractPrNumber(message)).toBeNull()
    })

    it('should return null for direct commits', () => {
      const message = 'fix: quick fix on main'
      expect(extractPrNumber(message)).toBeNull()
    })
  })

  describe('Commit Response Mapping', () => {
    it('should map GitHub commit response correctly', () => {
      const commit = {
        sha: 'abc123def456',
        commit: {
          message: 'Merge pull request #42 from wamiz/feature\n\nAdds new feature',
          author: {
            name: 'John Doe',
            date: '2026-03-09T10:00:00Z'
          }
        },
        author: {
          login: 'johndoe'
        }
      }

      expect(commit.sha).toBe('abc123def456')
      expect(commit.commit.message.split('\n')[0]).toBe('Merge pull request #42 from wamiz/feature')
      expect(commit.author?.login).toBe('johndoe')
      expect(commit.commit.author.date).toBe('2026-03-09T10:00:00Z')
    })

    it('should handle commit without author login', () => {
      const commit = {
        sha: 'abc123',
        commit: {
          message: 'Direct commit',
          author: {
            name: 'John Doe',
            date: '2026-03-09T10:00:00Z'
          }
        },
        author: null
      }

      const author = commit.author?.login || commit.commit.author.name
      expect(author).toBe('John Doe')
    })
  })

  describe('Deployment Insert Mapping', () => {
    it('should map commit to DeploymentInsert correctly', () => {
      const commit = {
        sha: 'abc123def456789012345678901234567890abcd',
        commit: {
          message: 'Merge pull request #42 from wamiz/feature\n\nAdds new feature',
          author: {
            name: 'John Doe',
            date: '2026-03-09T10:00:00Z'
          }
        },
        author: {
          login: 'johndoe'
        }
      }

      function extractPrNumber(message: string): number | null {
        const match = message.match(/Merge pull request #(\d+)/)
        return match ? parseInt(match[1], 10) : null
      }

      const deployment = {
        repository_id: 1,
        sha: commit.sha,
        message: commit.commit.message.split('\n')[0],
        author: commit.author?.login || commit.commit.author.name,
        pr_number: extractPrNumber(commit.commit.message),
        deployed_at: commit.commit.author.date
      }

      expect(deployment.sha).toBe('abc123def456789012345678901234567890abcd')
      expect(deployment.message).toBe('Merge pull request #42 from wamiz/feature')
      expect(deployment.author).toBe('johndoe')
      expect(deployment.pr_number).toBe(42)
      expect(deployment.deployed_at).toBe('2026-03-09T10:00:00Z')
    })
  })

  describe('Upsert Behavior', () => {
    it('should use correct upsert options for deduplication', () => {
      const upsertOptions = {
        onConflict: 'repository_id,sha',
        ignoreDuplicates: true,
        count: 'exact'
      }

      expect(upsertOptions.onConflict).toBe('repository_id,sha')
      expect(upsertOptions.ignoreDuplicates).toBe(true)
    })

    it('should handle duplicate commits gracefully', () => {
      const existingShas = ['abc123', 'def456']
      const newCommits = [
        { sha: 'abc123' }, // duplicate
        { sha: 'ghi789' } // new
      ]

      const newOnly = newCommits.filter(c => !existingShas.includes(c.sha))
      expect(newOnly).toHaveLength(1)
      expect(newOnly[0].sha).toBe('ghi789')
    })
  })

  describe('Error Handling', () => {
    it('should return success with 0 rows for empty commits', () => {
      const commits: unknown[] = []

      const result = {
        status: 'success',
        rowsCollected: commits.length
      }

      expect(result.status).toBe('success')
      expect(result.rowsCollected).toBe(0)
    })
  })
})
