import { describe, it, expect } from 'vitest'
import {
  sentryIssuesUrl,
  sentryIssueUrl,
  sentryStatsUrl,
  githubDependabotUrl,
  githubDependabotAlertUrl,
  githubActionsUrl,
  githubCommitsUrl,
  githubCommitUrl,
  githubPullRequestUrl,
  debugbearDashboardUrl,
  debugbearTestResultsUrl,
  debugbearCwvUrl,
  codecovUrl
} from '../../../app/utils/deepLinks'

describe('deepLinks', () => {
  describe('Sentry URLs', () => {
    it('should generate correct issues list URL', () => {
      const url = sentryIssuesUrl('wamiz', 'wamiz-international')
      expect(url).toBe('https://wamiz.sentry.io/issues/?project=wamiz-international')
    })

    it('should generate correct single issue URL', () => {
      const url = sentryIssueUrl('wamiz', 'wamiz-international', '12345')
      expect(url).toBe('https://wamiz.sentry.io/issues/12345/?project=wamiz-international')
    })

    it('should generate correct stats URL', () => {
      const url = sentryStatsUrl('wamiz', 'wamiz-international')
      expect(url).toBe('https://wamiz.sentry.io/stats/?project=wamiz-international')
    })
  })

  describe('GitHub URLs', () => {
    it('should generate correct Dependabot alerts URL', () => {
      const url = githubDependabotUrl('wamiz', 'wamiz-international')
      expect(url).toBe('https://github.com/wamiz/wamiz-international/security/dependabot')
    })

    it('should generate correct single Dependabot alert URL', () => {
      const url = githubDependabotAlertUrl('wamiz', 'wamiz-international', 42)
      expect(url).toBe('https://github.com/wamiz/wamiz-international/security/dependabot/42')
    })

    it('should generate correct Actions URL', () => {
      const url = githubActionsUrl('wamiz', 'wamiz-international')
      expect(url).toBe('https://github.com/wamiz/wamiz-international/actions')
    })

    it('should generate correct commits URL with default branch', () => {
      const url = githubCommitsUrl('wamiz', 'wamiz-international')
      expect(url).toBe('https://github.com/wamiz/wamiz-international/commits/main')
    })

    it('should generate correct commits URL with custom branch', () => {
      const url = githubCommitsUrl('wamiz', 'wamiz-international', 'develop')
      expect(url).toBe('https://github.com/wamiz/wamiz-international/commits/develop')
    })

    it('should generate correct single commit URL', () => {
      const url = githubCommitUrl('wamiz', 'wamiz-international', 'abc123')
      expect(url).toBe('https://github.com/wamiz/wamiz-international/commit/abc123')
    })

    it('should generate correct pull request URL', () => {
      const url = githubPullRequestUrl('wamiz', 'wamiz-international', 456)
      expect(url).toBe('https://github.com/wamiz/wamiz-international/pull/456')
    })
  })

  describe('DebugBear URLs', () => {
    it('should generate correct dashboard URL', () => {
      const url = debugbearDashboardUrl('site123')
      expect(url).toBe('https://www.debugbear.com/project/site123/overview')
    })

    it('should generate correct test results URL', () => {
      const url = debugbearTestResultsUrl('site123')
      expect(url).toBe('https://www.debugbear.com/project/site123/tests')
    })

    it('should generate correct Core Web Vitals URL', () => {
      const url = debugbearCwvUrl('site123')
      expect(url).toBe('https://www.debugbear.com/project/site123/core-web-vitals')
    })
  })

  describe('Codecov URLs', () => {
    it('should generate correct repository URL', () => {
      const url = codecovUrl('wamiz', 'wamiz-international')
      expect(url).toBe('https://app.codecov.io/gh/wamiz/wamiz-international')
    })
  })

  describe('URL escaping', () => {
    it('should handle special characters in org/repo names', () => {
      // GitHub allows hyphens and underscores
      const url = githubActionsUrl('my-org', 'my_repo-name')
      expect(url).toBe('https://github.com/my-org/my_repo-name/actions')
    })
  })
})
