/**
 * Deep Link URL Generators
 * Functions to generate direct URLs to source tools for quick investigation
 */

// Sentry URLs

/**
 * Link to Sentry issues list for a project
 */
export function sentryIssuesUrl(org: string, project: string): string {
  return `https://${org}.sentry.io/issues/?project=${project}`
}

/**
 * Link to a specific Sentry issue
 */
export function sentryIssueUrl(org: string, project: string, issueId: string): string {
  return `https://${org}.sentry.io/issues/${issueId}/?project=${project}`
}

/**
 * Link to Sentry project stats
 */
export function sentryStatsUrl(org: string, project: string): string {
  return `https://${org}.sentry.io/stats/?project=${project}`
}

// GitHub URLs

/**
 * Link to GitHub Dependabot alerts page
 */
export function githubDependabotUrl(org: string, repo: string): string {
  return `https://github.com/${org}/${repo}/security/dependabot`
}

/**
 * Link to a specific Dependabot alert
 */
export function githubDependabotAlertUrl(org: string, repo: string, alertNumber: number): string {
  return `https://github.com/${org}/${repo}/security/dependabot/${alertNumber}`
}

/**
 * Link to GitHub Actions page
 */
export function githubActionsUrl(org: string, repo: string): string {
  return `https://github.com/${org}/${repo}/actions`
}

/**
 * Link to GitHub commits page
 */
export function githubCommitsUrl(org: string, repo: string, branch: string = 'main'): string {
  return `https://github.com/${org}/${repo}/commits/${branch}`
}

/**
 * Link to a specific commit
 */
export function githubCommitUrl(org: string, repo: string, sha: string): string {
  return `https://github.com/${org}/${repo}/commit/${sha}`
}

/**
 * Link to a specific pull request
 */
export function githubPullRequestUrl(org: string, repo: string, prNumber: number): string {
  return `https://github.com/${org}/${repo}/pull/${prNumber}`
}

// DebugBear URLs

/**
 * Link to DebugBear project dashboard
 */
export function debugbearDashboardUrl(siteId: string): string {
  return `https://www.debugbear.com/project/${siteId}/overview`
}

/**
 * Link to DebugBear test results
 */
export function debugbearTestResultsUrl(siteId: string): string {
  return `https://www.debugbear.com/project/${siteId}/tests`
}

/**
 * Link to DebugBear Core Web Vitals report
 */
export function debugbearCwvUrl(siteId: string): string {
  return `https://www.debugbear.com/project/${siteId}/core-web-vitals`
}

// Codecov / Coverage URLs

/**
 * Link to Codecov repository coverage
 */
export function codecovUrl(org: string, repo: string): string {
  return `https://app.codecov.io/gh/${org}/${repo}`
}

// Helper to get config from runtime

export interface DeepLinkConfig {
  sentryOrg: string
  sentryProject: string
  githubOrg: string
  githubRepo: string
  debugbearSiteId: string
}

/**
 * Get deep link config from runtime config
 * Must be called in setup context
 */
export function useDeepLinkConfig(): DeepLinkConfig {
  const config = useRuntimeConfig()

  return {
    sentryOrg: config.public.sentryOrg || 'wamiz',
    sentryProject: config.public.sentryProject || 'wamiz-international',
    githubOrg: config.public.githubOrg || 'wamiz',
    githubRepo: config.public.githubRepo || 'wamiz-international',
    debugbearSiteId: config.public.debugbearSiteId || ''
  }
}
