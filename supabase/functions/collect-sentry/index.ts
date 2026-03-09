/**
 * Sentry Collector Edge Function
 * Collects error metrics from Sentry API and inserts into metrics_raw
 *
 * Metrics collected:
 * - new_errors: Count of new issues in the collection window
 * - resolved_errors: Count of resolved issues
 * - error_rate: Ratio of errors to total events
 * - avg_resolution_time: Average time to resolve issues (ms)
 */

import { getSupabaseClient } from '../_shared/supabaseClient.ts'
import { retryWithBackoff } from '../_shared/retry.ts'
import { logCollection, createCollectResult } from '../_shared/logger.ts'
import type { MetricInsert, SentryIssue, CollectResult } from '../_shared/types.ts'

// Constants
const SENTRY_API_BASE = 'https://sentry.io/api/0'
const COLLECTION_WINDOW_MINUTES = 5
const SOURCE_NAME = 'sentry'

interface SentryConfig {
  authToken: string
  org: string
  project: string
}

interface MetricTypeMap {
  new_errors: number
  resolved_errors: number
  error_rate: number
  avg_resolution_time: number
}

// Main handler
Deno.serve(async (_req: Request) => {
  const startedAt = new Date()
  let result: CollectResult

  try {
    result = await collect(startedAt)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    result = createCollectResult(SOURCE_NAME, 1, 'failed', 0, startedAt, errorMessage)
  }

  // Always log the result
  await logCollection(
    await getSourceId(),
    result.repositoryId,
    result.status,
    result.rowsCollected,
    startedAt,
    result.errorMessage
  )

  // Always return 200 to prevent pg_cron retries
  return new Response(JSON.stringify({ data: result, error: null }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200
  })
})

async function collect(startedAt: Date): Promise<CollectResult> {
  const config = getSentryConfig()
  const supabase = getSupabaseClient()

  // Get source and metric type IDs
  const sourceId = await getSourceId()
  const metricTypes = await getMetricTypeIds()
  const repositoryId = await getRepositoryId()

  // Collect metrics with retry (silent retries - failures logged to collection_logs)
  const metrics = await retryWithBackoff(
    () => fetchSentryMetrics(config),
    {
      maxRetries: 3,
      baseDelayMs: 1000
    }
  )

  // Prepare metrics for insertion
  const now = new Date().toISOString()
  const metricsToInsert: MetricInsert[] = [
    {
      source_id: sourceId,
      metric_type_id: metricTypes.new_errors,
      repository_id: repositoryId,
      value: metrics.newErrors,
      collected_at: now
    },
    {
      source_id: sourceId,
      metric_type_id: metricTypes.resolved_errors,
      repository_id: repositoryId,
      value: metrics.resolvedErrors,
      collected_at: now
    },
    {
      source_id: sourceId,
      metric_type_id: metricTypes.error_rate,
      repository_id: repositoryId,
      value: metrics.errorRate,
      collected_at: now
    },
    {
      source_id: sourceId,
      metric_type_id: metricTypes.avg_resolution_time,
      repository_id: repositoryId,
      value: metrics.avgResolutionTime,
      collected_at: now
    }
  ]

  // Insert metrics
  const { error } = await supabase
    .from('metrics_raw')
    .insert(metricsToInsert)

  if (error) {
    throw new Error(`Failed to insert metrics: ${error.message}`)
  }

  return createCollectResult(
    SOURCE_NAME,
    repositoryId,
    'success',
    metricsToInsert.length,
    startedAt
  )
}

function getSentryConfig(): SentryConfig {
  const authToken = Deno.env.get('SENTRY_AUTH_TOKEN')
  const org = Deno.env.get('SENTRY_ORG')
  const project = Deno.env.get('SENTRY_PROJECT')

  if (!authToken || !org || !project) {
    throw new Error('Missing Sentry configuration: SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT')
  }

  return { authToken, org, project }
}

interface SentryMetrics {
  newErrors: number
  resolvedErrors: number
  errorRate: number
  avgResolutionTime: number
}

async function fetchSentryMetrics(config: SentryConfig): Promise<SentryMetrics> {
  const headers = {
    'Authorization': `Bearer ${config.authToken}`,
    'Content-Type': 'application/json'
  }

  // Calculate time window
  const now = new Date()
  const windowStart = new Date(now.getTime() - COLLECTION_WINDOW_MINUTES * 60 * 1000)
  const statsPeriod = `${COLLECTION_WINDOW_MINUTES}m`

  // Fetch unresolved issues (new errors)
  const issuesUrl = `${SENTRY_API_BASE}/projects/${config.org}/${config.project}/issues/?query=is:unresolved&statsPeriod=${statsPeriod}`
  const issuesResponse = await fetch(issuesUrl, { headers })

  if (!issuesResponse.ok) {
    throw new Error(`Sentry API error (issues): ${issuesResponse.status} ${issuesResponse.statusText}`)
  }

  const issues: SentryIssue[] = await issuesResponse.json()

  // Count new issues (firstSeen within window)
  const newErrors = issues.filter((issue) => {
    const firstSeen = new Date(issue.firstSeen)
    return firstSeen >= windowStart
  }).length

  // Fetch resolved issues
  const resolvedUrl = `${SENTRY_API_BASE}/projects/${config.org}/${config.project}/issues/?query=is:resolved&statsPeriod=${statsPeriod}`
  const resolvedResponse = await fetch(resolvedUrl, { headers })

  if (!resolvedResponse.ok) {
    throw new Error(`Sentry API error (resolved): ${resolvedResponse.status} ${resolvedResponse.statusText}`)
  }

  const resolvedIssues: SentryIssue[] = await resolvedResponse.json()
  const resolvedErrors = resolvedIssues.length

  // Fetch event stats for error rate calculation
  const statsUrl = `${SENTRY_API_BASE}/projects/${config.org}/${config.project}/stats/?stat=received&resolution=1h`
  const statsResponse = await fetch(statsUrl, { headers })

  let errorRate = 0
  if (statsResponse.ok) {
    const stats: Array<[number, number]> = await statsResponse.json()
    // Calculate error rate from recent stats
    if (stats.length > 0) {
      const totalEvents = stats.reduce((sum, [_ts, count]) => sum + count, 0)
      const totalErrors = issues.reduce((sum, issue) => sum + issue.count, 0)
      errorRate = totalEvents > 0 ? totalErrors / totalEvents : 0
    }
  }

  // Calculate average resolution time for resolved issues
  let avgResolutionTime = 0
  if (resolvedIssues.length > 0) {
    const resolutionTimes = resolvedIssues
      .filter(issue => issue.firstSeen && issue.lastSeen)
      .map((issue) => {
        const firstSeen = new Date(issue.firstSeen).getTime()
        const lastSeen = new Date(issue.lastSeen).getTime()
        return lastSeen - firstSeen
      })

    if (resolutionTimes.length > 0) {
      avgResolutionTime = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    }
  }

  return {
    newErrors,
    resolvedErrors,
    errorRate,
    avgResolutionTime
  }
}

// Cache for dimension IDs
let cachedSourceId: number | null = null
let cachedMetricTypes: MetricTypeMap | null = null
let cachedRepositoryId: number | null = null

async function getSourceId(): Promise<number> {
  if (cachedSourceId) return cachedSourceId

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('dim_sources')
    .select('id')
    .eq('name', SOURCE_NAME)
    .single()

  if (error || !data) {
    throw new Error(`Source '${SOURCE_NAME}' not found in dim_sources`)
  }

  cachedSourceId = data.id
  return cachedSourceId
}

async function getMetricTypeIds(): Promise<MetricTypeMap> {
  if (cachedMetricTypes) return cachedMetricTypes

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('dim_metric_types')
    .select('id, name')
    .eq('axis', 'stability')

  if (error || !data) {
    throw new Error('Failed to fetch metric types from dim_metric_types')
  }

  const metricMap: Record<string, number> = {}
  for (const row of data) {
    metricMap[row.name] = row.id
  }

  cachedMetricTypes = {
    new_errors: metricMap['new_errors'],
    resolved_errors: metricMap['resolved_errors'],
    error_rate: metricMap['error_rate'],
    avg_resolution_time: metricMap['avg_resolution_time']
  }

  // Validate all required metrics exist
  for (const [name, id] of Object.entries(cachedMetricTypes)) {
    if (!id) {
      throw new Error(`Metric type '${name}' not found in dim_metric_types`)
    }
  }

  return cachedMetricTypes
}

async function getRepositoryId(): Promise<number> {
  if (cachedRepositoryId) return cachedRepositoryId

  const supabase = getSupabaseClient()
  // MVP: Default to 'international' repository
  const { data, error } = await supabase
    .from('dim_repositories')
    .select('id')
    .eq('name', 'international')
    .single()

  if (error || !data) {
    throw new Error('Repository \'international\' not found in dim_repositories')
  }

  cachedRepositoryId = data.id
  return cachedRepositoryId
}
