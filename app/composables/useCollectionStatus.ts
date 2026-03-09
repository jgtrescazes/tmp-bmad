/**
 * Collection status composable
 * Fetches and computes status for each data source collector
 */

export interface SourceStatus {
  sourceId: number
  sourceName: string
  displayName: string
  currentStatus: 'success' | 'failed' | 'partial' | 'unknown'
  lastSuccess: string | null // ISO 8601
  lastFailure: string | null // ISO 8601
  lastRunAt: string | null // ISO 8601
  rowsCollected: number | null
  durationMs: number | null
  errorMessage: string | null
}

export function useCollectionStatus() {
  const supabase = useSupabaseClient()

  const { data: sources, pending, error, refresh } = useAsyncData(
    'collection-status',
    async (): Promise<SourceStatus[]> => {
      // Fetch all collection logs with source info
      const { data, error } = await supabase
        .from('collection_logs')
        .select(`
          id,
          source_id,
          status,
          rows_collected,
          error_message,
          duration_ms,
          completed_at,
          dim_sources!inner(name, display_name)
        `)
        .order('completed_at', { ascending: false })
        .limit(100) // Get enough to cover all sources

      if (error) throw error

      // Group by source_id and compute status
      const statusBySource = new Map<number, SourceStatus>()

      for (const row of data || []) {
        const sourceId = row.source_id as number
        const source = row.dim_sources as { name: string, display_name: string }

        if (!statusBySource.has(sourceId)) {
          statusBySource.set(sourceId, {
            sourceId,
            sourceName: source.name,
            displayName: source.display_name,
            currentStatus: 'unknown',
            lastSuccess: null,
            lastFailure: null,
            lastRunAt: null,
            rowsCollected: null,
            durationMs: null,
            errorMessage: null
          })
        }

        const status = statusBySource.get(sourceId)!
        const completedAt = row.completed_at as string
        const rowStatus = row.status as 'success' | 'failed' | 'partial'

        // Update last run if this is more recent
        if (!status.lastRunAt || completedAt > status.lastRunAt) {
          status.lastRunAt = completedAt
          status.currentStatus = rowStatus
          status.rowsCollected = row.rows_collected as number
          status.durationMs = row.duration_ms as number
          status.errorMessage = row.error_message as string | null
        }

        // Track last success
        if (rowStatus === 'success' && (!status.lastSuccess || completedAt > status.lastSuccess)) {
          status.lastSuccess = completedAt
        }

        // Track last failure
        if (rowStatus === 'failed' && (!status.lastFailure || completedAt > status.lastFailure)) {
          status.lastFailure = completedAt
        }
      }

      // Fetch all sources to include ones with no logs yet
      const { data: allSources } = await supabase
        .from('dim_sources')
        .select('id, name, display_name')

      for (const source of allSources || []) {
        if (!statusBySource.has(source.id)) {
          statusBySource.set(source.id, {
            sourceId: source.id,
            sourceName: source.name,
            displayName: source.display_name,
            currentStatus: 'unknown',
            lastSuccess: null,
            lastFailure: null,
            lastRunAt: null,
            rowsCollected: null,
            durationMs: null,
            errorMessage: null
          })
        }
      }

      return Array.from(statusBySource.values())
        .sort((a, b) => a.sourceName.localeCompare(b.sourceName))
    }
  )

  const failedCount = computed(() =>
    sources.value?.filter(s => s.currentStatus === 'failed').length ?? 0
  )

  const hasFailures = computed(() => failedCount.value > 0)

  return {
    sources,
    pending,
    error,
    refresh,
    failedCount,
    hasFailures
  }
}
