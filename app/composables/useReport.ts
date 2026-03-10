/**
 * Report Aggregation Composable
 * Aggregates monthly data from all axes for the monthly report
 */

import type { Ref } from 'vue'
import type {
  ReportData,
  ReportSection,
  ReportMetric,
  ReportDeployment,
  ReportSummary,
  ReportTrend
} from '~/types/report'
import type { Anomaly } from '~/utils/anomalyEngine'

type Axis = 'stability' | 'performance' | 'security' | 'quality'

const AXIS_DISPLAY_NAMES: Record<Axis, string> = {
  stability: 'Stabilite (Sentry)',
  performance: 'Performance (CWV)',
  security: 'Securite (Dependabot)',
  quality: 'Qualite (Coverage)'
}

const AXES: Axis[] = ['stability', 'performance', 'security', 'quality']

/**
 * Get the first day of a month in YYYY-MM-DD format
 * Uses UTC to avoid timezone issues
 */
function getMonthStart(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 1))
  return date.toISOString().split('T')[0]
}

/**
 * Get the last day of a month in YYYY-MM-DD format
 * Uses UTC to avoid timezone issues
 */
function getMonthEnd(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month + 1, 0))
  return date.toISOString().split('T')[0]
}

/**
 * Format period as YYYY-MM
 */
function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

/**
 * Calculate delta percentage between current and previous values
 * Returns null if previous value is null or zero
 */
function calculateDelta(
  currentValue: number,
  previousValue: number | null
): number | null {
  if (previousValue === null || previousValue === 0) {
    return null
  }
  return ((currentValue - previousValue) / previousValue) * 100
}

/**
 * Get the top N problems (anomalies) sorted by severity
 */
function getTopProblems(anomalies: Anomaly[], count: number = 3): Anomaly[] {
  return anomalies.slice(0, count)
}

/**
 * Determine overall trend based on anomalies
 */
function determineTrend(anomalies: Anomaly[]): ReportTrend {
  if (anomalies.length === 0) {
    return 'stable'
  }

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length
  const warningCount = anomalies.filter(a => a.severity === 'warning').length

  if (criticalCount > 0 || warningCount > 2) {
    return 'degrading'
  }

  if (warningCount === 0 && anomalies.length <= 2) {
    return 'improving'
  }

  return 'stable'
}

/**
 * Main report composable
 * Aggregates data for M/M-1 comparison across all axes
 */
export function useReport(
  year: Ref<number>,
  month: Ref<number>, // 0-indexed (January = 0)
  repositoryId: Ref<number | null>
) {
  const supabase = useSupabaseClient()

  // Calculate previous month
  const prevMonth = computed(() => {
    const m = month.value - 1
    if (m < 0) {
      return { year: year.value - 1, month: 11 }
    }
    return { year: year.value, month: m }
  })

  // Build cache key function (evaluated on each fetch)
  const getCacheKey = () =>
    `report-${year.value}-${month.value}-${repositoryId.value ?? 'all'}`

  return useAsyncData(
    getCacheKey,
    async (): Promise<ReportData> => {
      const currentPeriodStart = getMonthStart(year.value, month.value)
      const currentPeriodEnd = getMonthEnd(year.value, month.value)
      const previousPeriodStart = getMonthStart(
        prevMonth.value.year,
        prevMonth.value.month
      )

      // Fetch current month metrics
      let currentQuery = supabase
        .from('metrics_monthly')
        .select(
          `
          value_avg,
          dim_metric_types!inner(name, display_name, unit, axis)
        `
        )
        .eq('period_start', currentPeriodStart)

      if (repositoryId.value) {
        currentQuery = currentQuery.eq('repository_id', repositoryId.value)
      }

      const { data: currentMetrics, error: currentError } = await currentQuery

      if (currentError) {
        console.error('Failed to fetch current metrics:', currentError)
      }

      // Fetch previous month metrics (M-1)
      let previousQuery = supabase
        .from('metrics_monthly')
        .select(
          `
          value_avg,
          dim_metric_types!inner(name, display_name, unit, axis)
        `
        )
        .eq('period_start', previousPeriodStart)

      if (repositoryId.value) {
        previousQuery = previousQuery.eq('repository_id', repositoryId.value)
      }

      const { data: previousMetrics, error: previousError }
        = await previousQuery

      if (previousError) {
        console.error('Failed to fetch previous metrics:', previousError)
      }

      // Fetch deployments for the month
      let deploymentsQuery = supabase
        .from('deployments')
        .select(
          'sha, short_sha, message, author, pr_number, deployed_at'
        )
        .gte('deployed_at', currentPeriodStart)
        .lte('deployed_at', `${currentPeriodEnd}T23:59:59Z`)
        .order('deployed_at', { ascending: false })

      if (repositoryId.value) {
        deploymentsQuery = deploymentsQuery.eq(
          'repository_id',
          repositoryId.value
        )
      }

      const { data: deploymentsData, error: deploymentsError }
        = await deploymentsQuery

      if (deploymentsError) {
        console.error('Failed to fetch deployments:', deploymentsError)
      }

      // Index metrics by axis and name
      const currentByAxis = indexMetricsByAxis(currentMetrics || [])
      const previousByAxis = indexMetricsByAxis(previousMetrics || [])

      // Generate report sections for each axis
      const sections: ReportSection[] = []
      const allAnomalies: Anomaly[] = []

      for (const axis of AXES) {
        const currentAxisMetrics = currentByAxis[axis] || []
        const previousAxisMetrics = previousByAxis[axis] || []

        // Build metrics with deltas
        const metrics: ReportMetric[] = buildReportMetrics(
          currentAxisMetrics,
          previousAxisMetrics
        )

        // Detect anomalies for this axis (based on M/M-1 delta)
        const axisAnomalies = detectAxisAnomalies(
          axis,
          currentAxisMetrics,
          previousAxisMetrics
        )

        allAnomalies.push(...axisAnomalies)

        sections.push({
          axis,
          displayName: AXIS_DISPLAY_NAMES[axis],
          metrics,
          anomalies: axisAnomalies,
          topProblems: getTopProblems(axisAnomalies)
        })
      }

      // Transform deployments
      const deployments: ReportDeployment[] = (deploymentsData || []).map(
        d => ({
          sha: d.sha as string,
          shortSha: d.short_sha as string,
          message: d.message as string,
          author: d.author as string,
          prNumber: d.pr_number as number | null,
          deployedAt: d.deployed_at as string
        })
      )

      // Get repository name
      let repositoryName = 'Tous les repositories'
      if (repositoryId.value) {
        const { data: repoData } = await supabase
          .from('dim_repositories')
          .select('display_name')
          .eq('id', repositoryId.value)
          .single()

        if (repoData) {
          repositoryName = repoData.display_name as string
        }
      }

      return {
        period: formatPeriod(year.value, month.value),
        previousPeriod: formatPeriod(
          prevMonth.value.year,
          prevMonth.value.month
        ),
        repositoryName,
        generatedAt: new Date().toISOString(),
        sections,
        deployments,
        totalAnomalies: allAnomalies.length
      }
    },
    {
      watch: [year, month, repositoryId]
    }
  )
}

/**
 * Calculate report summary for executive section
 */
export function useReportSummary(reportData: Ref<ReportData | null>) {
  return computed((): ReportSummary | null => {
    if (!reportData.value) return null

    const allAnomalies = reportData.value.sections.flatMap(s => s.anomalies)

    const criticalCount = allAnomalies.filter(
      a => a.severity === 'critical'
    ).length
    const warningCount = allAnomalies.filter(
      a => a.severity === 'warning'
    ).length

    return {
      totalAnomalies: allAnomalies.length,
      criticalCount,
      warningCount,
      trend: determineTrend(allAnomalies),
      deploymentCount: reportData.value.deployments.length
    }
  })
}

/**
 * Index metrics by axis for easier lookup
 */
interface IndexedMetric {
  name: string
  displayName: string
  unit: string
  value: number
}

function indexMetricsByAxis(
  data: Record<string, unknown>[]
): Record<Axis, IndexedMetric[]> {
  const result: Record<Axis, IndexedMetric[]> = {
    stability: [],
    performance: [],
    security: [],
    quality: []
  }

  for (const row of data) {
    const metricType = row.dim_metric_types as Record<string, string>
    const axis = metricType.axis as Axis

    if (result[axis]) {
      result[axis].push({
        name: metricType.name,
        displayName: metricType.display_name || metricType.name,
        unit: metricType.unit || '',
        value: row.value_avg as number
      })
    }
  }

  return result
}

/**
 * Build report metrics with M/M-1 deltas
 */
function buildReportMetrics(
  current: IndexedMetric[],
  previous: IndexedMetric[]
): ReportMetric[] {
  // Index previous by name
  const previousByName = new Map<string, IndexedMetric>()
  for (const m of previous) {
    previousByName.set(m.name, m)
  }

  // Build metrics with deltas
  const metrics: ReportMetric[] = []

  for (const currentMetric of current) {
    const previousMetric = previousByName.get(currentMetric.name)
    const previousValue = previousMetric?.value ?? null

    metrics.push({
      name: currentMetric.name,
      displayName: currentMetric.displayName,
      currentValue: currentMetric.value,
      previousValue,
      delta: calculateDelta(currentMetric.value, previousValue),
      unit: currentMetric.unit
    })
  }

  // Add metrics that only exist in previous period (disappeared)
  for (const previousMetric of previous) {
    if (!current.find(c => c.name === previousMetric.name)) {
      metrics.push({
        name: previousMetric.name,
        displayName: previousMetric.displayName,
        currentValue: 0,
        previousValue: previousMetric.value,
        delta: -100, // Completely gone
        unit: previousMetric.unit
      })
    }
  }

  return metrics
}

/**
 * Detect anomalies for a specific axis
 * Uses simplified detection based on delta thresholds
 */
function detectAxisAnomalies(
  axis: Axis,
  current: IndexedMetric[],
  previous: IndexedMetric[]
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Index previous by name
  const previousByName = new Map<string, IndexedMetric>()
  for (const m of previous) {
    previousByName.set(m.name, m)
  }

  // Detect delta anomalies (significant M/M-1 changes)
  for (const currentMetric of current) {
    const previousMetric = previousByName.get(currentMetric.name)

    if (!previousMetric || previousMetric.value === 0) continue

    const deltaPercent
      = ((currentMetric.value - previousMetric.value)
        / Math.abs(previousMetric.value))
      * 100

    // Check for significant degradation
    // For inverted metrics (errors, LCP), increase = worse
    // For normal metrics (coverage), decrease = worse
    const isInverted = isInvertedMetricByAxis(axis, currentMetric.name)
    const isDegradation = isInverted
      ? deltaPercent > 10 // >10% increase for inverted metrics
      : deltaPercent < -10 // >10% decrease for normal metrics

    if (isDegradation) {
      let severity: Anomaly['severity'] = 'info'
      const absDelta = Math.abs(deltaPercent)

      if (absDelta > 50) {
        severity = 'critical'
      } else if (absDelta > 20) {
        severity = 'warning'
      }

      anomalies.push({
        type: 'delta',
        source: axis,
        metric: currentMetric.name,
        currentValue: currentMetric.value,
        expectedValue: previousMetric.value,
        severity
      })
    }
  }

  // Sort by severity
  const severityOrder: Record<Anomaly['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2
  }

  return anomalies.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  )
}

/**
 * Determine if a metric is inverted (higher = worse)
 */
function isInvertedMetricByAxis(axis: Axis, metricName: string): boolean {
  // Stability: all error counts are inverted
  if (axis === 'stability') return true

  // Performance: all latency metrics are inverted
  if (axis === 'performance') return true

  // Security: vulnerability counts are inverted
  if (axis === 'security') return true

  // Quality: coverage is normal (higher = better)
  if (axis === 'quality') {
    return !metricName.includes('coverage')
  }

  return false
}

/**
 * Get report for a specific month (helper for simpler usage)
 * Uses current year/month by default
 */
export function useCurrentMonthReport(repositoryId: Ref<number | null>) {
  const now = new Date()
  const year = ref(now.getFullYear())
  const month = ref(now.getMonth())

  const result = useReport(year, month, repositoryId)

  return {
    ...result,
    year,
    month,
    setMonth: (y: number, m: number) => {
      year.value = y
      month.value = m
    }
  }
}
