/**
 * Month-over-month comparison composable
 * Fetches and computes M/M-1 deltas for metrics
 */

import type { Period } from './usePeriod'
import { isInvertedMetric, getDeltaColor } from '~/utils/metricPolarity'

export interface ComparisonResult {
  metricName: string
  metricDisplayName: string
  unit: string
  currentValue: number | null
  previousValue: number | null
  deltaAbsolute: number | null
  deltaPercent: number | null
  trend: 'up' | 'down' | 'stable' | 'unknown'
  color: 'success' | 'danger' | 'neutral'
  isInverted: boolean
}

export interface MonthlyComparisonData {
  results: ComparisonResult[]
  currentMonth: { year: number, month: number }
  previousMonth: { year: number, month: number }
  hasCurrentData: boolean
  hasPreviousData: boolean
}

/**
 * Get the first day of a month
 */
function getMonthStart(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), 1)
    .toISOString()
    .split('T')[0]
}

/**
 * Get the last day of a month
 */
function getMonthEnd(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]
}

/**
 * Compute delta percentage safely
 */
function computeDeltaPercent(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null) return null
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Compute trend from delta
 */
function computeTrend(
  deltaPercent: number | null
): 'up' | 'down' | 'stable' | 'unknown' {
  if (deltaPercent === null) return 'unknown'
  if (Math.abs(deltaPercent) < 1) return 'stable'
  return deltaPercent > 0 ? 'up' : 'down'
}

/**
 * Fetch monthly comparison data for a specific axis
 * Uses metrics_monthly table for aggregated data
 */
export function useMonthlyComparison(
  axis: 'stability' | 'performance' | 'security' | 'quality',
  repositoryId?: Ref<number | null>
) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `monthly-comparison-${axis}-${repositoryId?.value ?? 'all'}`,
    async (): Promise<MonthlyComparisonData> => {
      const now = new Date()
      const currentMonthStart = getMonthStart(now)

      // Previous month
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthStart = getMonthStart(prevMonthDate)
      const prevMonthEnd = getMonthEnd(prevMonthDate)

      // Fetch current month from metrics_daily (month may not be complete)
      let currentQuery = supabase
        .from('metrics_daily')
        .select(
          `
          value_avg,
          dim_metric_types!inner(name, display_name, unit, axis)
        `
        )
        .eq('dim_metric_types.axis', axis)
        .gte('period_start', currentMonthStart)

      if (repositoryId?.value) {
        currentQuery = currentQuery.eq('repository_id', repositoryId.value)
      }

      const { data: currentData } = await currentQuery

      // Fetch previous month from metrics_monthly (complete month)
      let prevQuery = supabase
        .from('metrics_monthly')
        .select(
          `
          value_avg,
          dim_metric_types!inner(name, display_name, unit, axis)
        `
        )
        .eq('dim_metric_types.axis', axis)
        .gte('period_start', prevMonthStart)
        .lte('period_start', prevMonthEnd)

      if (repositoryId?.value) {
        prevQuery = prevQuery.eq('repository_id', repositoryId.value)
      }

      const { data: prevData } = await prevQuery

      // If no monthly data, fall back to daily
      let previousData = prevData
      if (!prevData || prevData.length === 0) {
        let fallbackQuery = supabase
          .from('metrics_daily')
          .select(
            `
            value_avg,
            dim_metric_types!inner(name, display_name, unit, axis)
          `
          )
          .eq('dim_metric_types.axis', axis)
          .gte('period_start', prevMonthStart)
          .lte('period_start', prevMonthEnd)

        if (repositoryId?.value) {
          fallbackQuery = fallbackQuery.eq('repository_id', repositoryId.value)
        }

        const { data: fallbackData } = await fallbackQuery
        previousData = fallbackData
      }

      // Group and average by metric
      const currentByMetric = groupAndAverage(currentData || [])
      const previousByMetric = groupAndAverage(previousData || [])

      // Build comparison results
      const results: ComparisonResult[] = []
      const allMetrics = new Set([
        ...Object.keys(currentByMetric),
        ...Object.keys(previousByMetric)
      ])

      for (const metricName of allMetrics) {
        const current = currentByMetric[metricName]
        const previous = previousByMetric[metricName]

        const currentValue = current?.avg ?? null
        const previousValue = previous?.avg ?? null
        const deltaAbsolute
          = currentValue !== null && previousValue !== null
            ? currentValue - previousValue
            : null
        const deltaPercent = computeDeltaPercent(currentValue, previousValue)
        const trend = computeTrend(deltaPercent)
        const inverted = isInvertedMetric(metricName)
        const color = getDeltaColor(deltaAbsolute, metricName)

        results.push({
          metricName,
          metricDisplayName:
            current?.displayName || previous?.displayName || metricName,
          unit: current?.unit || previous?.unit || '',
          currentValue,
          previousValue,
          deltaAbsolute,
          deltaPercent,
          trend,
          color,
          isInverted: inverted
        })
      }

      return {
        results,
        currentMonth: { year: now.getFullYear(), month: now.getMonth() + 1 },
        previousMonth: {
          year: prevMonthDate.getFullYear(),
          month: prevMonthDate.getMonth() + 1
        },
        hasCurrentData: Object.keys(currentByMetric).length > 0,
        hasPreviousData: Object.keys(previousByMetric).length > 0
      }
    },
    {
      watch: repositoryId ? [repositoryId] : undefined
    }
  )
}

interface GroupedMetric {
  avg: number
  unit: string
  displayName: string
}

function groupAndAverage(
  data: Record<string, unknown>[]
): Record<string, GroupedMetric> {
  const groups: Record<
    string,
    { sum: number, count: number, unit: string, displayName: string }
  > = {}

  for (const row of data) {
    const metricType = row.dim_metric_types as Record<string, string>
    const name = metricType.name
    const value = row.value_avg as number

    if (!groups[name]) {
      groups[name] = {
        sum: 0,
        count: 0,
        unit: metricType.unit || '',
        displayName: metricType.display_name || name
      }
    }

    groups[name].sum += value
    groups[name].count += 1
  }

  const result: Record<string, GroupedMetric> = {}
  for (const [name, group] of Object.entries(groups)) {
    result[name] = {
      avg: group.count > 0 ? group.sum / group.count : 0,
      unit: group.unit,
      displayName: group.displayName
    }
  }

  return result
}

/**
 * Comparison data for chart overlay (M-1 as dashed line)
 */
export function useComparisonChartData(
  axis: 'stability' | 'performance' | 'security' | 'quality',
  metricName: string,
  period: Ref<Period>,
  repositoryId?: Ref<number | null>
) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `comparison-chart-${axis}-${metricName}-${period.value.from}-${repositoryId?.value ?? 'all'}`,
    async () => {
      const { from, to } = period.value
      const fromDate = new Date(from)
      const toDate = new Date(to)
      const durationMs = toDate.getTime() - fromDate.getTime()

      // Calculate previous period
      const prevTo = new Date(fromDate.getTime() - 1)
      const prevFrom = new Date(prevTo.getTime() - durationMs)

      // Fetch current period
      let currentQuery = supabase
        .from('metrics_daily')
        .select(
          `
          value_avg,
          period_start,
          dim_metric_types!inner(name)
        `
        )
        .eq('dim_metric_types.name', metricName)
        .gte('period_start', from)
        .lte('period_start', to)
        .order('period_start', { ascending: true })

      if (repositoryId?.value) {
        currentQuery = currentQuery.eq('repository_id', repositoryId.value)
      }

      const { data: currentData } = await currentQuery

      // Fetch previous period
      let previousQuery = supabase
        .from('metrics_daily')
        .select(
          `
          value_avg,
          period_start,
          dim_metric_types!inner(name)
        `
        )
        .eq('dim_metric_types.name', metricName)
        .gte('period_start', prevFrom.toISOString().split('T')[0])
        .lte('period_start', prevTo.toISOString().split('T')[0])
        .order('period_start', { ascending: true })

      if (repositoryId?.value) {
        previousQuery = previousQuery.eq('repository_id', repositoryId.value)
      }

      const { data: previousData } = await previousQuery

      return {
        current: (currentData || []).map(d => ({
          date: d.period_start as string,
          value: d.value_avg as number
        })),
        previous: (previousData || []).map(d => ({
          date: d.period_start as string,
          value: d.value_avg as number
        }))
      }
    },
    {
      watch: repositoryId ? [period, repositoryId] : [period]
    }
  )
}
