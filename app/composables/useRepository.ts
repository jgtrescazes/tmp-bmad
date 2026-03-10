/**
 * Repository Selection Composable
 * Global state for selected repository (MVP: mono-repo, but prepared for multi-repo)
 */

import type { Database } from '~/types/database.types'

type Repository = Database['public']['Tables']['dim_repositories']['Row']

export interface RepositoryState {
  current: Repository | null
  list: Repository[]
  loading: boolean
  initialized: boolean
}

/**
 * Global repository selection state
 * Uses useState for SSR-safe shared state
 */
export function useRepository() {
  // Shared state across the app
  const state = useState<RepositoryState>('repository-state', () => ({
    current: null,
    list: [],
    loading: false,
    initialized: false
  }))

  const supabase = useSupabaseClient<Database>()

  /**
   * Load all active repositories from database
   */
  async function loadRepositories(): Promise<Repository[]> {
    if (state.value.list.length > 0) {
      return state.value.list
    }

    state.value.loading = true

    try {
      const { data, error } = await supabase
        .from('dim_repositories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Failed to load repositories:', error)
        return []
      }

      state.value.list = data || []
      return state.value.list
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Initialize with default repository (international)
   * Should be called once in app setup or layout
   */
  async function init(): Promise<void> {
    if (state.value.initialized) {
      return
    }

    const repos = await loadRepositories()

    // Default to 'international' for MVP
    const defaultRepo = repos.find(r => r.name === 'international') ?? repos[0] ?? null

    if (!state.value.current) {
      state.value.current = defaultRepo
    }

    state.value.initialized = true
  }

  /**
   * Select a repository by ID
   */
  function selectRepository(id: number): void {
    const repo = state.value.list.find(r => r.id === id)
    if (repo) {
      state.value.current = repo
    }
  }

  /**
   * Select a repository by name
   */
  function selectRepositoryByName(name: string): void {
    const repo = state.value.list.find(r => r.name === name)
    if (repo) {
      state.value.current = repo
    }
  }

  // Computed values for convenience
  const currentRepo = computed(() => state.value.current)
  const currentRepoId = computed(() => state.value.current?.id ?? null)
  const repositories = computed(() => state.value.list)
  const isLoading = computed(() => state.value.loading)
  const isInitialized = computed(() => state.value.initialized)

  return {
    // State
    currentRepo,
    currentRepoId,
    repositories,
    isLoading,
    isInitialized,

    // Actions
    loadRepositories,
    init,
    selectRepository,
    selectRepositoryByName
  }
}
