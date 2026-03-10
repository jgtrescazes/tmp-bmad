/**
 * Dependabot Collector Edge Function
 * Collects vulnerability alerts from GitHub Dependabot API
 * Metrics: vuln_critical, vuln_high, vuln_medium, vuln_low counts
 *
 * Frequency: Daily (1440 minutes)
 */

import { getSupabaseClient } from '../_shared/supabaseClient.ts'
import { retryWithBackoff } from '../_shared/retry.ts'
import { logCollection, createCollectResult } from '../_shared/logger.ts'
import type { MetricInsert, CollectResult, CollectRequest } from '../_shared/types.ts'

// Constants
const GITHUB_API_BASE = 'https://api.github.com'
const SOURCE_NAME = 'dependabot'
const BACKFILL_WARNING = 'Backfill not fully supported: Dependabot API provides current state only, no historical snapshots available'

interface GitHubConfig {
  token: string
  owner: string
  repo: string
}

interface MetricTypeMap {
  vuln_critical: number
  vuln_high: number
  vuln_medium: number
  vuln_low: number
}

interface DependabotAlert {
  number: number
  state: 'open' | 'dismissed' | 'fixed' | 'auto_dismissed'
  security_advisory: {
    severity: 'critical' | 'high' | 'medium' | 'low'
    summary: string
  }
  dependency: {
    package: {
      name: string
      ecosystem: string
    }
  }
  created_at: string
  updated_at: string
  dismissed_at: string | null
  fixed_at: string | null
}

// Main handler
Deno.serve(async (req: Request) => {
  const startedAt = new Date()
  let result: CollectResult

  try {
    // Parse request body for backfill parameters
    let collectRequest: CollectRequest = {}
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        collectRequest = body as CollectRequest
      } catch {
        // No body or invalid JSON - use defaults
      }
    }

    result = await collect(startedAt, collectRequest)
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

async function collect(startedAt: Date, request: CollectRequest = {}): Promise<CollectResult> {
  const config = getGitHubConfig()
  const supabase = getSupabaseClient()

  // Get source and metric type IDs
  const sourceId = await getSourceId()
  const metricTypes = await getMetricTypeIds()
  const repositoryId = request.repositoryId || await getRepositoryId()

  const isBackfill = !!request.backfill

  // Log warning if backfill is requested (API doesn't support historical data)
  if (isBackfill) {
    // Log as partial with warning
    await supabase.from('collection_logs').insert({
      source_id: sourceId,
      repository_id: repositoryId,
      status: 'partial',
      rows_collected: 0,
      error_message: BACKFILL_WARNING,
      duration_ms: 0,
      started_at: startedAt.toISOString()
    })

    // Still proceed with current snapshot (best effort for backfill)
  }

  // Collect alerts with retry
  const alerts = await retryWithBackoff(
    () => fetchDependabotAlerts(config),
    {
      maxRetries: 3,
      baseDelayMs: 1000
    }
  )

  // Count by severity
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }

  const alertDetails: Array<{
    number: number
    state: string
    severity: string
    package: string
    age_days: number
    created_at: string
  }> = []

  for (const alert of alerts) {
    const severity = alert.security_advisory.severity
    counts[severity]++

    // Calculate age in days
    const ageDays = Math.floor(
      (Date.now() - new Date(alert.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    alertDetails.push({
      number: alert.number,
      state: alert.state,
      severity,
      package: alert.dependency.package.name,
      age_days: ageDays,
      created_at: alert.created_at
    })
  }

  // Prepare metrics for insertion
  const now = new Date().toISOString()
  const metadata = {
    alerts: alertDetails,
    total_open: alerts.length
  }

  const metricsToInsert: MetricInsert[] = [
    {
      source_id: sourceId,
      metric_type_id: metricTypes.vuln_critical,
      repository_id: repositoryId,
      value: counts.critical,
      metadata,
      collected_at: now
    },
    {
      source_id: sourceId,
      metric_type_id: metricTypes.vuln_high,
      repository_id: repositoryId,
      value: counts.high,
      metadata,
      collected_at: now
    },
    {
      source_id: sourceId,
      metric_type_id: metricTypes.vuln_medium,
      repository_id: repositoryId,
      value: counts.medium,
      metadata,
      collected_at: now
    },
    {
      source_id: sourceId,
      metric_type_id: metricTypes.vuln_low,
      repository_id: repositoryId,
      value: counts.low,
      metadata,
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

  const result = createCollectResult(
    SOURCE_NAME,
    repositoryId,
    isBackfill ? 'partial' : 'success', // Partial for backfill since no historical data
    metricsToInsert.length,
    startedAt,
    isBackfill ? BACKFILL_WARNING : undefined
  )
  result.isBackfill = isBackfill

  return result
}

function getGitHubConfig(): GitHubConfig {
  const token = Deno.env.get('GITHUB_TOKEN')
  const owner = Deno.env.get('GITHUB_OWNER') || 'wamiz'
  const repo = Deno.env.get('GITHUB_REPO') || 'wamiz-international'

  if (!token) {
    throw new Error('Missing GitHub configuration: GITHUB_TOKEN')
  }

  return { token, owner, repo }
}

async function fetchDependabotAlerts(config: GitHubConfig): Promise<DependabotAlert[]> {
  const headers = {
    'Authorization': `Bearer ${config.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  const allAlerts: DependabotAlert[] = []
  const perPage = 100
  const maxPages = 10

  // Paginate through all open alerts (with safety limit)
  for (let page = 1; page <= maxPages; page++) {
    const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/dependabot/alerts?state=open&per_page=${perPage}&page=${page}`
    const response = await fetch(url, { headers })

    if (!response.ok) {
      if (response.status === 404) {
        // Dependabot alerts might be disabled
        return []
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const alerts: DependabotAlert[] = await response.json()
    allAlerts.push(...alerts)

    // Check if there are more pages
    const linkHeader = response.headers.get('Link')
    if (!linkHeader || !linkHeader.includes('rel="next"') || alerts.length < perPage) {
      break
    }
  }

  return allAlerts
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
    .eq('axis', 'security')

  if (error || !data) {
    throw new Error('Failed to fetch metric types from dim_metric_types')
  }

  const metricMap: Record<string, number> = {}
  for (const row of data) {
    metricMap[row.name] = row.id
  }

  cachedMetricTypes = {
    vuln_critical: metricMap['vuln_critical'],
    vuln_high: metricMap['vuln_high'],
    vuln_medium: metricMap['vuln_medium'],
    vuln_low: metricMap['vuln_low']
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
  // MVP: Default to 'wamiz-int' repository
  const { data, error } = await supabase
    .from('dim_repositories')
    .select('id')
    .eq('name', 'wamiz-int')
    .single()

  if (error || !data) {
    throw new Error('Repository \'international\' not found in dim_repositories')
  }

  cachedRepositoryId = data.id
  return cachedRepositoryId
}
