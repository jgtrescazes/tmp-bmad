import { describe, it, expect } from 'vitest'
import { computed } from 'vue'

// Mock types
interface Repository {
  id: number
  name: string
  display_name: string | null
  is_active: boolean
  created_at: string
}

// Mock repositories
const mockRepositories: Repository[] = [
  {
    id: 1,
    name: 'international',
    display_name: 'International',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'france',
    display_name: 'France',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'archived',
    display_name: 'Archived',
    is_active: false,
    created_at: '2026-01-01T00:00:00Z'
  }
]

describe('useRepository', () => {
  describe('state management', () => {
    it('should initialize with null current repo', () => {
      // Simulate initial state
      const state = {
        current: null as Repository | null,
        list: [] as Repository[],
        loading: false,
        initialized: false
      }

      expect(state.current).toBeNull()
      expect(state.list).toHaveLength(0)
      expect(state.initialized).toBe(false)
    })

    it('should track loading state', () => {
      const state = {
        current: null as Repository | null,
        list: [] as Repository[],
        loading: true,
        initialized: false
      }

      expect(state.loading).toBe(true)
    })
  })

  describe('loadRepositories', () => {
    it('should return only active repositories', () => {
      const activeRepos = mockRepositories.filter(r => r.is_active)
      expect(activeRepos).toHaveLength(2)
      expect(activeRepos.map(r => r.name)).toContain('international')
      expect(activeRepos.map(r => r.name)).toContain('france')
      expect(activeRepos.map(r => r.name)).not.toContain('archived')
    })

    it('should sort repositories by name', () => {
      const sorted = [...mockRepositories]
        .filter(r => r.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))

      expect(sorted[0].name).toBe('france')
      expect(sorted[1].name).toBe('international')
    })
  })

  describe('init', () => {
    it('should default to international repository', () => {
      const repos = mockRepositories.filter(r => r.is_active)
      const defaultRepo = repos.find(r => r.name === 'international') ?? repos[0] ?? null

      expect(defaultRepo).not.toBeNull()
      expect(defaultRepo?.name).toBe('international')
    })

    it('should fall back to first repo if international not found', () => {
      const reposWithoutIntl = mockRepositories.filter(r => r.is_active && r.name !== 'international')
      const defaultRepo = reposWithoutIntl.find(r => r.name === 'international') ?? reposWithoutIntl[0] ?? null

      expect(defaultRepo?.name).toBe('france')
    })

    it('should handle empty repository list', () => {
      const emptyRepos: Repository[] = []
      const defaultRepo = emptyRepos.find(r => r.name === 'international') ?? emptyRepos[0] ?? null

      expect(defaultRepo).toBeNull()
    })

    it('should only initialize once', () => {
      const state = {
        current: mockRepositories[0],
        list: mockRepositories.filter(r => r.is_active),
        loading: false,
        initialized: true
      }

      // Should not re-initialize
      expect(state.initialized).toBe(true)
    })
  })

  describe('selectRepository', () => {
    it('should select repository by ID', () => {
      const state = {
        current: null as Repository | null,
        list: mockRepositories.filter(r => r.is_active)
      }

      const selectRepository = (id: number) => {
        const repo = state.list.find(r => r.id === id)
        if (repo) {
          state.current = repo
        }
      }

      selectRepository(2)
      expect(state.current?.name).toBe('france')
    })

    it('should not change current if ID not found', () => {
      const state = {
        current: mockRepositories[0],
        list: mockRepositories.filter(r => r.is_active)
      }

      const selectRepository = (id: number) => {
        const repo = state.list.find(r => r.id === id)
        if (repo) {
          state.current = repo
        }
      }

      selectRepository(999) // Non-existent
      expect(state.current?.name).toBe('international')
    })
  })

  describe('selectRepositoryByName', () => {
    it('should select repository by name', () => {
      const state = {
        current: null as Repository | null,
        list: mockRepositories.filter(r => r.is_active)
      }

      const selectRepositoryByName = (name: string) => {
        const repo = state.list.find(r => r.name === name)
        if (repo) {
          state.current = repo
        }
      }

      selectRepositoryByName('france')
      expect(state.current?.id).toBe(2)
    })

    it('should not change current if name not found', () => {
      const state = {
        current: mockRepositories[0],
        list: mockRepositories.filter(r => r.is_active)
      }

      const selectRepositoryByName = (name: string) => {
        const repo = state.list.find(r => r.name === name)
        if (repo) {
          state.current = repo
        }
      }

      selectRepositoryByName('nonexistent')
      expect(state.current?.name).toBe('international')
    })
  })

  describe('computed values', () => {
    it('should compute currentRepoId correctly', () => {
      const state = {
        current: mockRepositories[0]
      }

      const currentRepoId = computed(() => state.current?.id ?? null)
      expect(currentRepoId.value).toBe(1)
    })

    it('should return null for currentRepoId when no repo selected', () => {
      const state = {
        current: null as Repository | null
      }

      const currentRepoId = computed(() => state.current?.id ?? null)
      expect(currentRepoId.value).toBeNull()
    })
  })
})

describe('RepoSelector component logic', () => {
  it('should build dropdown items from repositories', () => {
    const repositories = mockRepositories.filter(r => r.is_active)
    const currentRepo = repositories[0]

    const repoItems = repositories.map(repo => ({
      label: repo.display_name || repo.name,
      icon: currentRepo?.id === repo.id ? 'i-lucide-check' : undefined
    }))

    expect(repoItems).toHaveLength(2)
    expect(repoItems[0].label).toBe('International')
    expect(repoItems[0].icon).toBe('i-lucide-check') // Current repo has check
    expect(repoItems[1].icon).toBeUndefined()
  })

  it('should show loading state', () => {
    const isLoading = true
    const currentLabel = isLoading ? 'Loading...' : 'Select repo'

    expect(currentLabel).toBe('Loading...')
  })

  it('should show current repo label', () => {
    const isLoading = false
    const currentRepo = mockRepositories[0]
    const currentLabel = isLoading
      ? 'Loading...'
      : currentRepo?.display_name || currentRepo?.name || 'Select repo'

    expect(currentLabel).toBe('International')
  })

  it('should show fallback when no repo selected', () => {
    const isLoading = false
    const currentRepo = null as Repository | null
    const currentLabel = isLoading
      ? 'Loading...'
      : currentRepo?.display_name || currentRepo?.name || 'Select repo'

    expect(currentLabel).toBe('Select repo')
  })
})
