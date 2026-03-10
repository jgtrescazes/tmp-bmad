/**
 * Performance metrics composable
 * Fetches Core Web Vitals (LCP, CLS, INP) from metrics_raw
 * Supports both lab and field data sources
 */

import type { Period } from './usePeriod'

export type DataSource = 'lab' | 'field' | 'all'

export interface PerformanceMetricRow {
  id: number
  value: number
  collectedAt: string
  metricName: string
  metricDisplayName: string
  metricUnit: string
  dataSource: DataSource
  pageUrl?: string
}

export interface CWVThresholds {
  good: number
  needsImprovement: number
}

// Google Core Web Vitals thresholds
export const CWV_THRESHOLDS: Record<string, CWVThresholds> = {
  lcp: { good: 2500, needsImprovement: 4000 },
  inp: { good: 200, needsImprovement: 500 },
  cls: { good: 0.1, needsImprovement: 0.25 }
}

export function usePerformanceMetrics(period: Ref<Period>, dataSource: Ref<DataSource> = ref('all')) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `performance-metrics-${period.value.from}-${period.value.to}-${dataSource.value}`,
    async (): Promise<PerformanceMetricRow[]> => {
      const query = supabase
        .from('metrics_raw')
        .select(`
          id,
          value,
          collected_at,
          metadata,
          dim_metric_types!inner(name, display_name, unit, axis),
          dim_sources!inner(name)
        `)
        .eq('dim_metric_types.axis', 'performance')
        .eq('dim_sources.name', 'debugbear')
        .gte('collected_at', period.value.from)
        .lte('collected_at', period.value.to)
        .order('collected_at', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      // Map and filter by data source
      const rows = (data || []).map((row: Record<string, unknown>) => {
        const metricType = row.dim_metric_types as Record<string, string>
        const metadata = row.metadata as Record<string, unknown> | null

        return {
          id: row.id as number,
          value: row.value as number,
          collectedAt: row.collected_at as string,
          metricName: metricType.name,
          metricDisplayName: metricType.display_name,
          metricUnit: metricType.unit,
          dataSource: (metadata?.data_source as DataSource) || 'lab',
          pageUrl: metadata?.page_url as string | undefined
        }
      })

      // Filter by data source if not 'all'
      if (dataSource.value !== 'all') {
        return rows.filter(row => row.dataSource === dataSource.value)
      }

      return rows
    },
    { watch: [period, dataSource] }
  )
}

export interface PerformanceChartData {
  metricName: string
  displayName: string
  unit: string
  labData: Array<{ date: string, value: number }>
  fieldData: Array<{ date: string, value: number }>
  thresholds: CWVThresholds
}

export function usePerformanceChartData(period: Ref<Period>) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `performance-chart-${period.value.from}-${period.value.to}`,
    async (): Promise<PerformanceChartData[]> => {
      const { data, error } = await supabase
        .from('metrics_raw')
        .select(`
          id,
          value,
          collected_at,
          metadata,
          dim_metric_types!inner(name, display_name, unit, axis)
        `)
        .eq('dim_metric_types.axis', 'performance')
        .gte('collected_at', period.value.from)
        .lte('collected_at', period.value.to)
        .order('collected_at', { ascending: true })

      if (error) throw error

      // Group by metric name
      const metricGroups: Record<string, {
        displayName: string
        unit: string
        labData: Array<{ date: string, value: number }>
        fieldData: Array<{ date: string, value: number }>
      }> = {}

      for (const row of (data || [])) {
        const metricType = row.dim_metric_types as Record<string, string>
        const metadata = row.metadata as Record<string, unknown> | null
        const metricName = metricType.name
        const dataSource = (metadata?.data_source as string) || 'lab'

        if (!metricGroups[metricName]) {
          metricGroups[metricName] = {
            displayName: metricType.display_name,
            unit: metricType.unit,
            labData: [],
            fieldData: []
          }
        }

        const dataPoint = {
          date: row.collected_at as string,
          value: row.value as number
        }

        if (dataSource === 'lab') {
          metricGroups[metricName].labData.push(dataPoint)
        } else if (dataSource === 'field') {
          metricGroups[metricName].fieldData.push(dataPoint)
        }
      }

      // Convert to array with thresholds
      return Object.entries(metricGroups).map(([metricName, group]) => ({
        metricName,
        displayName: group.displayName,
        unit: group.unit,
        labData: group.labData,
        fieldData: group.fieldData,
        thresholds: CWV_THRESHOLDS[metricName] || { good: 0, needsImprovement: 0 }
      }))
    },
    { watch: [period] }
  )
}

export interface PerformanceSummary {
  lcp: { lab: number | null, field: number | null, status: 'good' | 'needs-improvement' | 'poor' | 'unknown' }
  cls: { lab: number | null, field: number | null, status: 'good' | 'needs-improvement' | 'poor' | 'unknown' }
  inp: { lab: number | null, field: number | null, status: 'good' | 'needs-improvement' | 'poor' | 'unknown' }
}

export function usePerformanceSummary() {
  const supabase = useSupabaseClient()

  return useAsyncData(
    'performance-summary',
    async (): Promise<PerformanceSummary> => {
      // Get latest metrics for each type
      const { data, error } = await supabase
        .from('metrics_raw')
        .select(`
          value,
          metadata,
          dim_metric_types!inner(name, axis)
        `)
        .eq('dim_metric_types.axis', 'performance')
        .order('collected_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const summary: PerformanceSummary = {
        lcp: { lab: null, field: null, status: 'unknown' },
        cls: { lab: null, field: null, status: 'unknown' },
        inp: { lab: null, field: null, status: 'unknown' }
      }

      // Find latest values for each metric/source combination
      const found: Record<string, boolean> = {}

      for (const row of (data || [])) {
        const metricType = row.dim_metric_types as Record<string, string>
        const metadata = row.metadata as Record<string, unknown> | null
        const metricName = metricType.name as keyof PerformanceSummary
        const dataSource = (metadata?.data_source as 'lab' | 'field') || 'lab'
        const key = `${metricName}-${dataSource}`

        if (found[key]) continue
        found[key] = true

        if (metricName in summary) {
          summary[metricName][dataSource] = row.value as number
        }
      }

      // Calculate status for each metric (prefer field, fallback to lab)
      for (const metric of ['lcp', 'cls', 'inp'] as const) {
        const value = summary[metric].field ?? summary[metric].lab
        if (value !== null) {
          const thresholds = CWV_THRESHOLDS[metric]
          if (value <= thresholds.good) {
            summary[metric].status = 'good'
          } else if (value <= thresholds.needsImprovement) {
            summary[metric].status = 'needs-improvement'
          } else {
            summary[metric].status = 'poor'
          }
        }
      }

      return summary
    }
  )
}

/**
 * Get CWV status color based on thresholds
 */
export function getCWVStatusColor(metricName: string, value: number | null): string {
  if (value === null) return 'gray'

  const thresholds = CWV_THRESHOLDS[metricName]
  if (!thresholds) return 'gray'

  if (value <= thresholds.good) return 'success'
  if (value <= thresholds.needsImprovement) return 'warning'
  return 'error'
}

/**
 * Format CWV value based on unit
 */
export function formatCWVValue(metricName: string, value: number | null): string {
  if (value === null) return '—'

  if (metricName === 'cls') {
    return value.toFixed(3)
  }
  // LCP and INP are in ms
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`
  }
  return `${Math.round(value)}ms`
}
