/**
 * Deployments composable
 * Fetches deployments for chart annotations (markLine)
 */

import type { Period } from './usePeriod'
import type { DeploymentMarker } from '~/utils/chartConfig'

export interface Deployment {
  id: number
  repositoryId: number
  sha: string
  shortSha: string
  message: string
  author: string
  prNumber: number | null
  deployedAt: string
  createdAt: string
}

/**
 * Fetch deployments for a given period
 */
export function useDeployments(
  period: Ref<Period>,
  repositoryId?: Ref<number | null>
) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `deployments-${period.value.from}-${period.value.to}-${repositoryId?.value ?? 'all'}`,
    async (): Promise<Deployment[]> => {
      let query = supabase
        .from('deployments')
        .select('id, repository_id, sha, short_sha, message, author, pr_number, deployed_at, created_at')
        .gte('deployed_at', period.value.from)
        .lte('deployed_at', `${period.value.to}T23:59:59Z`)
        .order('deployed_at', { ascending: true })

      if (repositoryId?.value) {
        query = query.eq('repository_id', repositoryId.value)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map(d => ({
        id: d.id as number,
        repositoryId: d.repository_id as number,
        sha: d.sha as string,
        shortSha: d.short_sha as string,
        message: d.message as string,
        author: d.author as string,
        prNumber: d.pr_number as number | null,
        deployedAt: d.deployed_at as string,
        createdAt: d.created_at as string
      }))
    },
    {
      watch: repositoryId ? [period, repositoryId] : [period]
    }
  )
}

/**
 * Convert deployments to ECharts markLine format
 */
export function deploymentsToMarkLine(deployments: Deployment[]): {
  markLine: {
    silent: boolean
    symbol: [string, string]
    lineStyle: { type: string, color: string, width: number }
    label: { show: boolean }
    data: Array<{ xAxis: string, name: string }>
  }
} {
  return {
    markLine: {
      silent: false, // Enable hover interaction
      symbol: ['none', 'none'],
      lineStyle: {
        type: 'dashed',
        color: '#9ca3af', // gray-400
        width: 1
      },
      label: {
        show: false // Use tooltip instead
      },
      data: deployments.map(d => ({
        xAxis: d.deployedAt,
        name: d.shortSha
      }))
    }
  }
}

/**
 * Convert deployments to DeploymentMarker format for chartConfig
 */
export function deploymentsToMarkers(deployments: Deployment[]): DeploymentMarker[] {
  return deployments.map(d => ({
    deployedAt: d.deployedAt,
    shortSha: d.shortSha,
    message: d.message,
    author: d.author
  }))
}

/**
 * Create tooltip formatter that handles deployment markLine hover
 */
export function createDeploymentTooltipFormatter(
  deployments: Deployment[],
  defaultFormatter: (params: unknown) => string
): (params: unknown) => string {
  return (params: unknown) => {
    const p = params as { componentType?: string, name?: string }

    // Check if hovering over a markLine (deployment)
    if (p.componentType === 'markLine' && p.name) {
      const deployment = deployments.find(d => d.shortSha === p.name)
      if (deployment) {
        const date = new Intl.DateTimeFormat('fr-FR', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date(deployment.deployedAt))

        const message = deployment.message.length > 50
          ? `${deployment.message.substring(0, 50)}...`
          : deployment.message

        return `
          <div style="padding: 4px 0;">
            <strong>Deploiement ${deployment.shortSha}</strong><br/>
            <span style="color: #9ca3af;">${date}</span><br/>
            <span>${message}</span><br/>
            <em style="color: #6b7280;">${deployment.author}</em>
            ${deployment.prNumber ? `<br/><span style="color: #3b82f6;">PR #${deployment.prNumber}</span>` : ''}
          </div>
        `.trim()
      }
    }

    // Default tooltip for data points
    return defaultFormatter(params)
  }
}

/**
 * Get latest deployment
 */
export function useLatestDeployment(repositoryId?: Ref<number | null>) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `latest-deployment-${repositoryId?.value ?? 'all'}`,
    async (): Promise<Deployment | null> => {
      let query = supabase
        .from('deployments')
        .select('id, repository_id, sha, short_sha, message, author, pr_number, deployed_at, created_at')
        .order('deployed_at', { ascending: false })
        .limit(1)

      if (repositoryId?.value) {
        query = query.eq('repository_id', repositoryId.value)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || data.length === 0) return null

      const d = data[0]
      return {
        id: d.id as number,
        repositoryId: d.repository_id as number,
        sha: d.sha as string,
        shortSha: d.short_sha as string,
        message: d.message as string,
        author: d.author as string,
        prNumber: d.pr_number as number | null,
        deployedAt: d.deployed_at as string,
        createdAt: d.created_at as string
      }
    },
    {
      watch: repositoryId ? [repositoryId] : undefined
    }
  )
}
