/**
 * GitHub Deployments Collector Edge Function
 * Collects merge commits on main branch as deployment events
 * Data stored in `deployments` table for correlation with metrics
 *
 * Frequency: Every 15 minutes
 */

import { getSupabaseClient } from '../_shared/supabaseClient.ts'
import { retryWithBackoff } from '../_shared/retry.ts'
import { logCollection, createCollectResult } from '../_shared/logger.ts'
import type { CollectResult, CollectRequest, BackfillParams } from '../_shared/types.ts'

// Constants
const GITHUB_API_BASE = 'https://api.github.com'
const SOURCE_NAME = 'github'
const COMMITS_PER_PAGE = 30
const MAX_BACKFILL_PAGES = 50 // Limit pagination for backfill

interface GitHubConfig {
  token: string
  owner: string
  repo: string
}

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
  author: {
    login: string
  } | null
}

interface DeploymentInsert {
  repository_id: number
  sha: string
  message: string
  author: string
  pr_number: number | null
  deployed_at: string
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

  // Get repository ID
  const repositoryId = request.repositoryId || await getRepositoryId()

  const isBackfill = !!request.backfill

  // Fetch commits based on mode
  let commits: GitHubCommit[]

  if (isBackfill && request.backfill) {
    // Backfill mode: fetch historical commits with date range
    commits = await fetchHistoricalCommits(config, request.backfill)
  } else {
    // Normal mode: fetch recent commits
    commits = await retryWithBackoff(
      () => fetchRecentCommits(config),
      {
        maxRetries: 3,
        baseDelayMs: 1000
      }
    )
  }

  if (commits.length === 0) {
    const result = createCollectResult(
      SOURCE_NAME,
      repositoryId,
      'success',
      0,
      startedAt
    )
    result.isBackfill = isBackfill
    return result
  }

  // Map commits to deployments
  const deployments: DeploymentInsert[] = commits.map(commit => ({
    repository_id: repositoryId,
    sha: commit.sha,
    message: commit.commit.message.split('\n')[0], // First line only
    author: commit.author?.login || commit.commit.author.name,
    pr_number: extractPrNumber(commit.commit.message),
    deployed_at: commit.commit.author.date
  }))

  // Upsert deployments (ON CONFLICT DO NOTHING)
  const { error, count } = await supabase
    .from('deployments')
    .upsert(deployments, {
      onConflict: 'repository_id,sha',
      ignoreDuplicates: true,
      count: 'exact'
    })

  if (error) {
    throw new Error(`Failed to insert deployments: ${error.message}`)
  }

  const result = createCollectResult(
    SOURCE_NAME,
    repositoryId,
    'success',
    count || 0,
    startedAt
  )
  result.isBackfill = isBackfill

  return result
}

/**
 * Fetch historical commits for backfill
 * Uses GitHub Commits API with since/until parameters
 */
async function fetchHistoricalCommits(
  config: GitHubConfig,
  backfill: BackfillParams
): Promise<GitHubCommit[]> {
  const headers = {
    'Authorization': `Bearer ${config.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  const since = new Date(backfill.from).toISOString()
  const until = new Date(`${backfill.to}T23:59:59Z`).toISOString()

  const allCommits: GitHubCommit[] = []
  let page = 1

  while (page <= MAX_BACKFILL_PAGES) {
    const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/commits?sha=main&since=${since}&until=${until}&per_page=100&page=${page}`

    const response = await retryWithBackoff(
      () => fetch(url, { headers }),
      { maxRetries: 3, baseDelayMs: 1000 }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }

    const commits: GitHubCommit[] = await response.json()
    allCommits.push(...commits)

    // Check if there are more pages
    const linkHeader = response.headers.get('Link')
    if (!linkHeader || !linkHeader.includes('rel="next"') || commits.length < 100) {
      break
    }
    page++
  }

  return allCommits
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

async function fetchRecentCommits(config: GitHubConfig): Promise<GitHubCommit[]> {
  const headers = {
    'Authorization': `Bearer ${config.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.repo}/commits?sha=main&per_page=${COMMITS_PER_PAGE}`
  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }

  const commits: GitHubCommit[] = await response.json()
  return commits
}

/**
 * Extract PR number from merge commit message
 * Pattern: "Merge pull request #123 from org/branch"
 */
function extractPrNumber(message: string): number | null {
  const match = message.match(/Merge pull request #(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

// Cache for dimension IDs
let cachedSourceId: number | null = null
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
