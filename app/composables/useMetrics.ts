/**
 * Metrics data composable
 * Fetches metrics from Supabase via PostgREST
 */

import type { Period } from './usePeriod'

export type Axis = 'stability' | 'performance' | 'security' | 'quality'

export interface MetricRow {
  id: number
  valueAvg: number
  valueMin: number | null
  valueMax: number | null
  sampleCount: number
  periodStart: string
  metricName: string
  metricDisplayName: string
  metricUnit: string
  sourceName: string
}

export interface MetricSummary {
  axis: Axis
  currentValue: number | null
  previousValue: number | null
  delta: number | null
  deltaPercent: number | null
  trend: 'up' | 'down' | 'stable' | 'unknown'
  unit: string
  label: string
}

export function useMetrics(axis: Axis, period: Ref<Period>) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `metrics-${axis}-${period.value.from}-${period.value.to}`,
    async (): Promise<MetricRow[]> => {
      const { data, error } = await supabase
        .from('metrics_daily')
        .select(`
          id,
          value_avg,
          value_min,
          value_max,
          sample_count,
          period_start,
          dim_metric_types!inner(name, display_name, unit, axis),
          dim_sources!inner(name)
        `)
        .eq('dim_metric_types.axis', axis)
        .gte('period_start', period.value.from)
        .lte('period_start', period.value.to)
        .order('period_start', { ascending: true })

      if (error) throw error

      // Map to MetricRow structure
      return (data || []).map((row: Record<string, unknown>) => {
        const metricType = row.dim_metric_types as Record<string, string>
        const source = row.dim_sources as Record<string, string>
        return {
          id: row.id as number,
          valueAvg: row.value_avg as number,
          valueMin: row.value_min as number | null,
          valueMax: row.value_max as number | null,
          sampleCount: row.sample_count as number,
          periodStart: row.period_start as string,
          metricName: metricType.name,
          metricDisplayName: metricType.display_name,
          metricUnit: metricType.unit,
          sourceName: source.name
        }
      })
    },
    { watch: [period] }
  )
}

export function useMetricsSummary(axis: Axis, period: Ref<Period>) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `metrics-summary-${axis}-${period.value.from}-${period.value.to}`,
    async (): Promise<MetricSummary[]> => {
      // Get current period metrics
      const { data: currentData, error: currentError } = await supabase
        .from('metrics_daily')
        .select(`
          value_avg,
          dim_metric_types!inner(name, display_name, unit, axis)
        `)
        .eq('dim_metric_types.axis', axis)
        .gte('period_start', period.value.from)
        .lte('period_start', period.value.to)

      if (currentError) throw currentError

      // Calculate previous period
      const fromDate = new Date(period.value.from)
      const toDate = new Date(period.value.to)
      const durationMs = toDate.getTime() - fromDate.getTime()
      const prevTo = new Date(fromDate.getTime() - 1)
      const prevFrom = new Date(prevTo.getTime() - durationMs)

      // Get previous period metrics
      const { data: previousData } = await supabase
        .from('metrics_daily')
        .select(`
          value_avg,
          dim_metric_types!inner(name, display_name, unit, axis)
        `)
        .eq('dim_metric_types.axis', axis)
        .gte('period_start', prevFrom.toISOString().split('T')[0])
        .lte('period_start', prevTo.toISOString().split('T')[0])

      // Group by metric type and calculate averages
      const currentByMetric = groupAndAverage(currentData || [])
      const previousByMetric = groupAndAverage(previousData || [])

      // Build summaries
      const summaries: MetricSummary[] = []
      for (const [metricName, current] of Object.entries(currentByMetric)) {
        const previous = previousByMetric[metricName]
        const delta = previous ? current.avg - previous.avg : null
        const deltaPercent = previous && previous.avg !== 0
          ? ((current.avg - previous.avg) / previous.avg) * 100
          : null

        let trend: MetricSummary['trend'] = 'unknown'
        if (deltaPercent !== null) {
          if (Math.abs(deltaPercent) < 1) trend = 'stable'
          else if (deltaPercent > 0) trend = 'up'
          else trend = 'down'
        }

        summaries.push({
          axis,
          currentValue: current.avg,
          previousValue: previous?.avg || null,
          delta,
          deltaPercent,
          trend,
          unit: current.unit,
          label: current.displayName
        })
      }

      return summaries
    },
    { watch: [period] }
  )
}

interface GroupedMetric {
  avg: number
  unit: string
  displayName: string
}

function groupAndAverage(data: Record<string, unknown>[]): Record<string, GroupedMetric> {
  const groups: Record<string, { sum: number, count: number, unit: string, displayName: string }> = {}

  for (const row of data) {
    const metricType = row.dim_metric_types as Record<string, string>
    const name = metricType.name
    const value = row.value_avg as number

    if (!groups[name]) {
      groups[name] = {
        sum: 0,
        count: 0,
        unit: metricType.unit,
        displayName: metricType.display_name
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

export function useLatestMetrics(axis: Axis) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `latest-metrics-${axis}`,
    async () => {
      // Get the most recent metrics for this axis
      const { data, error } = await supabase
        .from('metrics_raw')
        .select(`
          id,
          value,
          collected_at,
          dim_metric_types!inner(name, display_name, unit, axis),
          dim_sources!inner(name)
        `)
        .eq('dim_metric_types.axis', axis)
        .order('collected_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data
    }
  )
}
