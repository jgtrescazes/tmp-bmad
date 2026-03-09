/**
 * Shared types for Supabase Edge Functions (collectors)
 */

export interface CollectResult {
  source: string
  repositoryId: number
  status: 'success' | 'failed' | 'partial'
  rowsCollected: number
  errorMessage?: string
  durationMs: number
}

export interface MetricInsert {
  source_id: number
  metric_type_id: number
  repository_id: number
  value: number
  metadata?: Record<string, unknown>
  collected_at: string // ISO 8601
}

export interface SourceConfig {
  sourceId: number
  name: string
  displayName: string
  frequencyMinutes: number
}

export interface MetricTypeConfig {
  metricTypeId: number
  name: string
  axis: string
  unit: string
  displayName: string
}

export interface CollectionLogInsert {
  source_id: number
  repository_id: number
  status: 'success' | 'failed' | 'partial'
  rows_collected: number
  error_message?: string
  duration_ms: number
  started_at: string // ISO 8601
}

// Sentry API types
export interface SentryIssue {
  id: string
  shortId: string
  title: string
  count: number
  userCount: number
  firstSeen: string
  lastSeen: string
  status: 'resolved' | 'unresolved' | 'ignored'
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  metadata: {
    type?: string
    value?: string
    filename?: string
    function?: string
  }
}

export interface SentryStatsResponse {
  start: string
  end: string
  intervals: string[]
  groups: Array<{
    by: Record<string, string>
    totals: Record<string, number>
    series: Record<string, number[]>
  }>
}
