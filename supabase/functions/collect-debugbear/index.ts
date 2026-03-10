/**
 * DebugBear Collector Edge Function
 * Collects Core Web Vitals (LCP, CLS, INP) from DebugBear API
 * Metrics collected separately for lab and field data
 *
 * Frequency: Weekly (10080 minutes)
 */

import { getSupabaseClient } from '../_shared/supabaseClient.ts'
import { retryWithBackoff } from '../_shared/retry.ts'
import { logCollection, createCollectResult } from '../_shared/logger.ts'
import type { MetricInsert, CollectResult } from '../_shared/types.ts'

// Constants
const DEBUGBEAR_API_BASE = 'https://www.debugbear.com/api/v1'
const SOURCE_NAME = 'debugbear'

interface DebugBearConfig {
  apiKey: string
}

interface MetricTypeMap {
  lcp: number
  cls: number
  inp: number
}

interface DebugBearPage {
  id: string
  name: string
  url: string
}

interface DebugBearTest {
  id: string
  createdAt: string
  // Lab metrics
  lcp?: number
  cls?: number
  inp?: number
  // Field metrics (CrUX data)
  fieldLcp?: number
  fieldCls?: number
  fieldInp?: number
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
  const config = getDebugBearConfig()
  const supabase = getSupabaseClient()

  // Get source and metric type IDs
  const sourceId = await getSourceId()
  const metricTypes = await getMetricTypeIds()
  const repositoryId = await getRepositoryId()

  // Collect metrics with retry
  const metrics = await retryWithBackoff(
    () => fetchDebugBearMetrics(config),
    {
      maxRetries: 3,
      baseDelayMs: 1000
    }
  )

  // Prepare metrics for insertion
  const now = new Date().toISOString()
  const metricsToInsert: MetricInsert[] = []

  // Add lab metrics
  if (metrics.lab.lcp !== null) {
    metricsToInsert.push({
      source_id: sourceId,
      metric_type_id: metricTypes.lcp,
      repository_id: repositoryId,
      value: metrics.lab.lcp,
      metadata: { data_source: 'lab', page_url: metrics.pageUrl },
      collected_at: now
    })
  }
  if (metrics.lab.cls !== null) {
    metricsToInsert.push({
      source_id: sourceId,
      metric_type_id: metricTypes.cls,
      repository_id: repositoryId,
      value: metrics.lab.cls,
      metadata: { data_source: 'lab', page_url: metrics.pageUrl },
      collected_at: now
    })
  }
  if (metrics.lab.inp !== null) {
    metricsToInsert.push({
      source_id: sourceId,
      metric_type_id: metricTypes.inp,
      repository_id: repositoryId,
      value: metrics.lab.inp,
      metadata: { data_source: 'lab', page_url: metrics.pageUrl },
      collected_at: now
    })
  }

  // Add field metrics (CrUX)
  if (metrics.field.lcp !== null) {
    metricsToInsert.push({
      source_id: sourceId,
      metric_type_id: metricTypes.lcp,
      repository_id: repositoryId,
      value: metrics.field.lcp,
      metadata: { data_source: 'field', page_url: metrics.pageUrl },
      collected_at: now
    })
  }
  if (metrics.field.cls !== null) {
    metricsToInsert.push({
      source_id: sourceId,
      metric_type_id: metricTypes.cls,
      repository_id: repositoryId,
      value: metrics.field.cls,
      metadata: { data_source: 'field', page_url: metrics.pageUrl },
      collected_at: now
    })
  }
  if (metrics.field.inp !== null) {
    metricsToInsert.push({
      source_id: sourceId,
      metric_type_id: metricTypes.inp,
      repository_id: repositoryId,
      value: metrics.field.inp,
      metadata: { data_source: 'field', page_url: metrics.pageUrl },
      collected_at: now
    })
  }

  if (metricsToInsert.length === 0) {
    return createCollectResult(
      SOURCE_NAME,
      repositoryId,
      'partial',
      0,
      startedAt,
      'No metrics available from DebugBear'
    )
  }

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

function getDebugBearConfig(): DebugBearConfig {
  const apiKey = Deno.env.get('DEBUGBEAR_API_KEY')

  if (!apiKey) {
    throw new Error('Missing DebugBear configuration: DEBUGBEAR_API_KEY')
  }

  return { apiKey }
}

interface DebugBearMetrics {
  pageUrl: string
  lab: {
    lcp: number | null
    cls: number | null
    inp: number | null
  }
  field: {
    lcp: number | null
    cls: number | null
    inp: number | null
  }
}

async function fetchDebugBearMetrics(config: DebugBearConfig): Promise<DebugBearMetrics> {
  const headers = {
    'x-api-key': config.apiKey,
    'Content-Type': 'application/json'
  }

  // Fetch pages
  const pagesUrl = `${DEBUGBEAR_API_BASE}/pages`
  const pagesResponse = await fetch(pagesUrl, { headers })

  if (!pagesResponse.ok) {
    throw new Error(`DebugBear API error (pages): ${pagesResponse.status} ${pagesResponse.statusText}`)
  }

  const pages: DebugBearPage[] = await pagesResponse.json()

  if (pages.length === 0) {
    return {
      pageUrl: '',
      lab: { lcp: null, cls: null, inp: null },
      field: { lcp: null, cls: null, inp: null }
    }
  }

  // Use first page (MVP assumption)
  const page = pages[0]

  // Fetch latest test for this page
  const testsUrl = `${DEBUGBEAR_API_BASE}/pages/${page.id}/tests?limit=1`
  const testsResponse = await fetch(testsUrl, { headers })

  if (!testsResponse.ok) {
    throw new Error(`DebugBear API error (tests): ${testsResponse.status} ${testsResponse.statusText}`)
  }

  const tests: DebugBearTest[] = await testsResponse.json()

  if (tests.length === 0) {
    return {
      pageUrl: page.url,
      lab: { lcp: null, cls: null, inp: null },
      field: { lcp: null, cls: null, inp: null }
    }
  }

  const latestTest = tests[0]

  return {
    pageUrl: page.url,
    lab: {
      lcp: latestTest.lcp ?? null,
      cls: latestTest.cls ?? null,
      inp: latestTest.inp ?? null
    },
    field: {
      lcp: latestTest.fieldLcp ?? null,
      cls: latestTest.fieldCls ?? null,
      inp: latestTest.fieldInp ?? null
    }
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
    .eq('axis', 'performance')

  if (error || !data) {
    throw new Error('Failed to fetch metric types from dim_metric_types')
  }

  const metricMap: Record<string, number> = {}
  for (const row of data) {
    metricMap[row.name] = row.id
  }

  cachedMetricTypes = {
    lcp: metricMap['lcp'],
    cls: metricMap['cls'],
    inp: metricMap['inp']
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
