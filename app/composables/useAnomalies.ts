/**
 * Anomaly detection composable
 * Orchestrates the anomaly engine with dashboard data
 */

import type { Ref } from 'vue'
import type { Period } from './usePeriod'
import {
  detectThresholdAnomalies,
  detectDeltaAnomalies,
  detectTrendAnomalies,
  calculateVulnerabilityScore,
  combineAndSortAnomalies,
  type Anomaly,
  type PerformanceMetricInput,
  type MonthlyDataPoint,
  type VulnerabilityAlertInput,
  type ScoredVulnerability
} from '~/utils/anomalyEngine'

export interface AnomalyDetectionResult {
  anomalies: Anomaly[]
  scoredVulnerabilities: ScoredVulnerability[]
  thresholdCount: number
  deltaCount: number
  trendCount: number
  totalCount: number
  hasCritical: boolean
}

/**
 * Main anomaly detection composable
 * Combines data from all axes to detect anomalies
 */
export function useAnomalies(
  period: Ref<Period>,
  repositoryId?: Ref<number | null>
) {
  const supabase = useSupabaseClient()

  // Build reactive cache key
  const cacheKey = computed(() =>
    `anomalies-${period.value.from}-${period.value.to}-${repositoryId?.value ?? 'all'}`
  )

  return useAsyncData(
    cacheKey.value,
    async (): Promise<AnomalyDetectionResult> => {
      // Fetch current performance metrics
      let perfQuery = supabase
        .from('metrics_raw')
        .select(`
          value,
          dim_metric_types!inner(name, axis)
        `)
        .eq('dim_metric_types.axis', 'performance')
        .gte('collected_at', period.value.from)
        .lte('collected_at', period.value.to)
        .order('collected_at', { ascending: false })
        .limit(10)

      // Apply repository filter if provided
      if (repositoryId?.value) {
        perfQuery = perfQuery.eq('repository_id', repositoryId.value)
      }

      const { data: perfData, error: perfError } = await perfQuery

      if (perfError) {
        console.error('Failed to fetch performance metrics:', perfError)
      }

      // Fetch previous period performance metrics (M-1)
      const fromDate = new Date(period.value.from)
      const toDate = new Date(period.value.to)
      const durationMs = toDate.getTime() - fromDate.getTime()
      const prevTo = new Date(fromDate.getTime() - 1)
      const prevFrom = new Date(prevTo.getTime() - durationMs)

      let prevPerfQuery = supabase
        .from('metrics_raw')
        .select(`
          value,
          dim_metric_types!inner(name, axis)
        `)
        .eq('dim_metric_types.axis', 'performance')
        .gte('collected_at', prevFrom.toISOString().split('T')[0])
        .lte('collected_at', prevTo.toISOString().split('T')[0])
        .order('collected_at', { ascending: false })
        .limit(10)

      if (repositoryId?.value) {
        prevPerfQuery = prevPerfQuery.eq('repository_id', repositoryId.value)
      }

      const { data: prevPerfData, error: prevPerfError } = await prevPerfQuery

      if (prevPerfError) {
        console.error('Failed to fetch previous performance metrics:', prevPerfError)
      }

      // Fetch monthly data for trend analysis (last 3 months)
      // Create new Date instance to avoid mutation
      const now = new Date()
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)

      let monthlyQuery = supabase
        .from('metrics_monthly')
        .select(`
          period_start,
          value_avg,
          dim_metric_types!inner(name, axis)
        `)
        .gte('period_start', threeMonthsAgo.toISOString().split('T')[0])
        .order('period_start', { ascending: true })

      if (repositoryId?.value) {
        monthlyQuery = monthlyQuery.eq('repository_id', repositoryId.value)
      }

      const { data: monthlyData, error: monthlyError } = await monthlyQuery

      if (monthlyError) {
        console.error('Failed to fetch monthly data:', monthlyError)
      }

      // Fetch security alerts for vulnerability scoring
      let securityQuery = supabase
        .from('metrics_raw')
        .select(`
          metadata,
          dim_metric_types!inner(name, axis)
        `)
        .eq('dim_metric_types.axis', 'security')
        .order('collected_at', { ascending: false })
        .limit(1)

      if (repositoryId?.value) {
        securityQuery = securityQuery.eq('repository_id', repositoryId.value)
      }

      const { data: securityData, error: securityError } = await securityQuery

      if (securityError) {
        console.error('Failed to fetch security data:', securityError)
      }

      // Transform data for anomaly engine
      const currentPerf = transformPerformanceData(perfData)
      const previousPerf = transformPerformanceData(prevPerfData)
      const monthlyPoints = transformMonthlyData(monthlyData)
      const vulnAlerts = extractVulnerabilityAlerts(securityData)

      // Run anomaly detection
      const thresholdAnomalies = detectThresholdAnomalies(currentPerf)
      const deltaAnomalies = detectDeltaAnomalies(currentPerf, previousPerf)
      const trendAnomalies = detectTrendAnomalies(monthlyPoints)
      const scoredVulnerabilities = calculateVulnerabilityScore(vulnAlerts)

      // Combine and sort all anomalies
      const anomalies = combineAndSortAnomalies(
        thresholdAnomalies,
        deltaAnomalies,
        trendAnomalies
      )

      return {
        anomalies,
        scoredVulnerabilities,
        thresholdCount: thresholdAnomalies.length,
        deltaCount: deltaAnomalies.length,
        trendCount: trendAnomalies.length,
        totalCount: anomalies.length,
        hasCritical: anomalies.some(a => a.severity === 'critical')
      }
    },
    {
      watch: repositoryId ? [period, repositoryId] : [period]
    }
  )
}

/**
 * Transform raw performance data to engine input format
 */
function transformPerformanceData(
  data: Record<string, unknown>[] | null
): PerformanceMetricInput[] {
  if (!data) return []

  // Get latest value per metric
  const byMetric = new Map<string, PerformanceMetricInput>()

  for (const row of data) {
    const metricType = row.dim_metric_types as Record<string, string>
    const metricName = metricType.name

    // Only take first (most recent) value for each metric
    if (!byMetric.has(metricName)) {
      byMetric.set(metricName, {
        metricName,
        value: row.value as number,
        source: 'performance'
      })
    }
  }

  return Array.from(byMetric.values())
}

/**
 * Transform monthly data to engine input format
 */
function transformMonthlyData(
  data: Record<string, unknown>[] | null
): MonthlyDataPoint[] {
  if (!data) return []

  return data.map((row) => {
    const metricType = row.dim_metric_types as Record<string, string>
    return {
      periodStart: row.period_start as string,
      value: row.value_avg as number,
      metricName: metricType.name,
      source: metricType.axis
    }
  })
}

/**
 * Extract vulnerability alerts from security metrics metadata
 */
function extractVulnerabilityAlerts(
  data: Record<string, unknown>[] | null
): VulnerabilityAlertInput[] {
  if (!data || data.length === 0) return []

  const metadata = data[0].metadata as Record<string, unknown> | null
  if (!metadata?.alerts) return []

  const rawAlerts = metadata.alerts as Array<{
    number: number
    state: string
    severity: string
    package: string
    created_at: string
    title?: string
  }>

  return rawAlerts
    .filter(a => a.state === 'open')
    .map(a => ({
      id: String(a.number),
      severity: a.severity as 'critical' | 'high' | 'medium' | 'low',
      createdAt: a.created_at,
      package: a.package,
      title: a.title || `Vulnerability in ${a.package}`
    }))
}

/**
 * Get anomaly route for navigation
 */
export function getAnomalyRoute(anomaly: Anomaly): string {
  const axisRoutes: Record<string, string> = {
    stability: '/stability',
    performance: '/performance',
    security: '/security',
    quality: '/quality'
  }

  return axisRoutes[anomaly.source] || '/'
}

/**
 * Get badge color for anomaly severity
 */
export function getAnomalySeverityColor(
  severity: Anomaly['severity']
): 'error' | 'warning' | 'info' {
  switch (severity) {
    case 'critical':
      return 'error'
    case 'warning':
      return 'warning'
    case 'info':
      return 'info'
  }
}

/**
 * Format anomaly type for display
 */
export function formatAnomalyType(type: Anomaly['type']): string {
  switch (type) {
    case 'threshold':
      return 'Seuil dépassé'
    case 'delta':
      return 'Variation M/M-1'
    case 'trend':
      return 'Tendance 3 mois'
  }
}
