/**
 * Coverage Collector Edge Function
 * Collects PHPUnit coverage data from GitHub Actions artifacts
 * Metrics: coverage_lines, coverage_functions, coverage_classes (percentages)
 *
 * Frequency: Daily (1440 minutes)
 */

import { getSupabaseClient } from '../_shared/supabaseClient.ts'
import { retryWithBackoff } from '../_shared/retry.ts'
import { logCollection, createCollectResult } from '../_shared/logger.ts'
import type { MetricInsert, CollectResult } from '../_shared/types.ts'

// Constants
const GITHUB_API_BASE = 'https://api.github.com'
const SOURCE_NAME = 'coverage'
const ARTIFACT_NAME = 'coverage-report'

interface GitHubConfig {
  token: string
  owner: string
  repo: string
}

interface MetricTypeMap {
  coverage_lines: number
  coverage_functions: number
  coverage_classes: number
}

interface CoverageData {
  lines: { total: number, covered: number, pct: number }
  functions: { total: number, covered: number, pct: number }
  classes: { total: number, covered: number, pct: number }
  modules?: Array<{ name: string, lines_pct: number }>
  format: 'clover.xml' | 'coverage-summary.json'
  artifactId: number
}

interface GitHubArtifact {
  id: number
  name: string
  created_at: string
  archive_download_url: string
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
  const config = getGitHubConfig()
  const supabase = getSupabaseClient()

  // Get source and metric type IDs
  const sourceId = await getSourceId()
  const metricTypes = await getMetricTypeIds()
  const repositoryId = await getRepositoryId()

  // Collect coverage data with retry
  const coverage = await retryWithBackoff(
    () => fetchCoverageData(config),
    {
      maxRetries: 3,
      baseDelayMs: 1000
    }
  )

  if (!coverage) {
    return createCollectResult(
      SOURCE_NAME,
      repositoryId,
      'partial',
      0,
      startedAt,
      'No coverage artifact found'
    )
  }

  // Prepare metrics for insertion
  const now = new Date().toISOString()
  const metadata = {
    artifact_id: coverage.artifactId,
    format: coverage.format,
    modules: coverage.modules || []
  }

  const metricsToInsert: MetricInsert[] = [
    {
      source_id: sourceId,
      metric_type_id: metricTypes.coverage_lines,
      repository_id: repositoryId,
      value: coverage.lines.pct,
      metadata,
      collected_at: now
    },
    {
      source_id: sourceId,
      metric_type_id: metricTypes.coverage_functions,
      repository_id: repositoryId,
      value: coverage.functions.pct,
      metadata,
      collected_at: now
    },
    {
      source_id: sourceId,
      metric_type_id: metricTypes.coverage_classes,
      repository_id: repositoryId,
      value: coverage.classes.pct,
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

  return createCollectResult(
    SOURCE_NAME,
    repositoryId,
    'success',
    metricsToInsert.length,
    startedAt
  )
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

async function fetchCoverageData(config: GitHubConfig): Promise<CoverageData | null> {
  const headers = {
    'Authorization': `Bearer ${config.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  // List artifacts
  const artifactsUrl = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/actions/artifacts?name=${ARTIFACT_NAME}&per_page=5`
  const artifactsResponse = await fetch(artifactsUrl, { headers })

  if (!artifactsResponse.ok) {
    throw new Error(`GitHub API error (artifacts): ${artifactsResponse.status} ${artifactsResponse.statusText}`)
  }

  const { artifacts }: { artifacts: GitHubArtifact[] } = await artifactsResponse.json()

  if (artifacts.length === 0) {
    return null
  }

  // Get latest artifact
  const latestArtifact = artifacts.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]

  // Download artifact (ZIP)
  const downloadUrl = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/actions/artifacts/${latestArtifact.id}/zip`
  const downloadResponse = await fetch(downloadUrl, { headers })

  if (!downloadResponse.ok) {
    throw new Error(`GitHub API error (download): ${downloadResponse.status} ${downloadResponse.statusText}`)
  }

  // Get ZIP content
  const zipBuffer = await downloadResponse.arrayBuffer()

  // Parse coverage data from ZIP
  const coverage = await parseCoverageFromZip(zipBuffer, latestArtifact.id)
  return coverage
}

async function parseCoverageFromZip(zipBuffer: ArrayBuffer, artifactId: number): Promise<CoverageData | null> {
  // Simple ZIP parsing - look for clover.xml or coverage-summary.json
  // Note: In production, use a proper ZIP library like JSZip or @std/archive

  const textDecoder = new TextDecoder()
  const zipContent = textDecoder.decode(zipBuffer)

  // Try to find coverage-summary.json content
  const jsonMatch = zipContent.match(/\{[\s\S]*"total"[\s\S]*"lines"[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const summaryJson = JSON.parse(jsonMatch[0])
      return parseCoverageSummaryJson(summaryJson, artifactId)
    } catch {
      // Continue to try clover.xml
    }
  }

  // Try to parse clover.xml
  const cloverMatch = zipContent.match(/<coverage[\s\S]*<\/coverage>/)
  if (cloverMatch) {
    return parseCloverXml(cloverMatch[0], artifactId)
  }

  return null
}

function parseCoverageSummaryJson(json: Record<string, unknown>, artifactId: number): CoverageData {
  const total = json.total as Record<string, { total: number, covered: number, pct: number }>

  return {
    lines: {
      total: total.lines?.total || 0,
      covered: total.lines?.covered || 0,
      pct: total.lines?.pct || 0
    },
    functions: {
      total: total.functions?.total || 0,
      covered: total.functions?.covered || 0,
      pct: total.functions?.pct || 0
    },
    classes: {
      total: total.classes?.total || 0,
      covered: total.classes?.covered || 0,
      pct: total.classes?.pct || 0
    },
    format: 'coverage-summary.json',
    artifactId
  }
}

function parseCloverXml(xml: string, artifactId: number): CoverageData {
  // Parse clover.xml metrics
  // Example: <metrics files="100" loc="50000" ncloc="45000"
  //           classes="200" methods="1500"
  //           coveredmethods="1200" coveredclasses="180"
  //           statements="10000" coveredstatements="8500" />

  const metricsMatch = xml.match(/<metrics[^>]*>/)
  if (!metricsMatch) {
    throw new Error('Invalid clover.xml: no metrics element found')
  }

  const metricsStr = metricsMatch[0]

  const getAttr = (name: string): number => {
    const match = metricsStr.match(new RegExp(`${name}="(\\d+)"`))
    return match ? parseInt(match[1], 10) : 0
  }

  const statements = getAttr('statements')
  const coveredstatements = getAttr('coveredstatements')
  const methods = getAttr('methods')
  const coveredmethods = getAttr('coveredmethods')
  const classes = getAttr('classes')
  const coveredclasses = getAttr('coveredclasses')

  // Parse module coverage from package elements
  const modules: Array<{ name: string, lines_pct: number }> = []
  const packageMatches = xml.matchAll(/<package\s+name="([^"]+)"[\s\S]*?<metrics[^>]*>/g)

  for (const match of packageMatches) {
    const packageName = match[1]
    const pkgMetrics = match[0]

    const pkgStmtMatch = pkgMetrics.match(/statements="(\d+)"/)
    const pkgCovStmtMatch = pkgMetrics.match(/coveredstatements="(\d+)"/)

    if (pkgStmtMatch && pkgCovStmtMatch) {
      const pkgStatements = parseInt(pkgStmtMatch[1], 10)
      const pkgCovered = parseInt(pkgCovStmtMatch[1], 10)
      const linesPct = pkgStatements > 0 ? (pkgCovered / pkgStatements) * 100 : 0
      modules.push({ name: packageName, lines_pct: Math.round(linesPct * 10) / 10 })
    }
  }

  return {
    lines: {
      total: statements,
      covered: coveredstatements,
      pct: statements > 0 ? Math.round((coveredstatements / statements) * 1000) / 10 : 0
    },
    functions: {
      total: methods,
      covered: coveredmethods,
      pct: methods > 0 ? Math.round((coveredmethods / methods) * 1000) / 10 : 0
    },
    classes: {
      total: classes,
      covered: coveredclasses,
      pct: classes > 0 ? Math.round((coveredclasses / classes) * 1000) / 10 : 0
    },
    modules,
    format: 'clover.xml',
    artifactId
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
    .eq('axis', 'quality')

  if (error || !data) {
    throw new Error('Failed to fetch metric types from dim_metric_types')
  }

  const metricMap: Record<string, number> = {}
  for (const row of data) {
    metricMap[row.name] = row.id
  }

  cachedMetricTypes = {
    coverage_lines: metricMap['coverage_lines'],
    coverage_functions: metricMap['coverage_functions'],
    coverage_classes: metricMap['coverage_classes']
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
