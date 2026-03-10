/**
 * Quality metrics composable
 * Fetches PHPUnit coverage data from metrics_raw
 */

import type { Period } from './usePeriod'

export type CoverageType = 'lines' | 'functions' | 'classes'

export interface ModuleCoverage {
  name: string
  linesPct: number
}

export interface QualityMetricRow {
  id: number
  value: number
  collectedAt: string
  metricName: string
  coverageType: CoverageType
  modules: ModuleCoverage[]
  format: string
}

export interface QualitySummary {
  lines: number | null
  functions: number | null
  classes: number | null
  modules: ModuleCoverage[]
}

// Coverage thresholds
export const COVERAGE_THRESHOLDS = {
  good: 80,
  acceptable: 60,
  poor: 40
}

export function useQualityMetrics(period: Ref<Period>) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `quality-metrics-${period.value.from}-${period.value.to}`,
    async (): Promise<QualityMetricRow[]> => {
      const { data, error } = await supabase
        .from('metrics_raw')
        .select(`
          id,
          value,
          collected_at,
          metadata,
          dim_metric_types!inner(name, display_name, unit, axis),
          dim_sources!inner(name)
        `)
        .eq('dim_metric_types.axis', 'quality')
        .eq('dim_sources.name', 'coverage')
        .gte('collected_at', period.value.from)
        .lte('collected_at', period.value.to)
        .order('collected_at', { ascending: true })

      if (error) throw error

      return (data || []).map((row: Record<string, unknown>) => {
        const metricType = row.dim_metric_types as Record<string, string>
        const metadata = row.metadata as Record<string, unknown> | null

        // Extract coverage type from metric name (coverage_lines -> lines)
        const coverageType = metricType.name.replace('coverage_', '') as CoverageType

        // Parse modules from metadata
        const rawModules = (metadata?.modules || []) as Array<{
          name: string
          lines_pct: number
        }>

        const modules: ModuleCoverage[] = rawModules.map(m => ({
          name: m.name,
          linesPct: m.lines_pct
        }))

        return {
          id: row.id as number,
          value: row.value as number,
          collectedAt: row.collected_at as string,
          metricName: metricType.name,
          coverageType,
          modules,
          format: (metadata?.format as string) || 'unknown'
        }
      })
    },
    { watch: [period] }
  )
}

export interface QualityChartData {
  date: string
  lines: number | null
  functions: number | null
  classes: number | null
}

export function useQualityChartData(period: Ref<Period>) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `quality-chart-${period.value.from}-${period.value.to}`,
    async (): Promise<QualityChartData[]> => {
      const { data, error } = await supabase
        .from('metrics_raw')
        .select(`
          id,
          value,
          collected_at,
          dim_metric_types!inner(name, axis)
        `)
        .eq('dim_metric_types.axis', 'quality')
        .gte('collected_at', period.value.from)
        .lte('collected_at', period.value.to)
        .order('collected_at', { ascending: true })

      if (error) throw error

      // Group by collection timestamp
      const byDate: Record<string, QualityChartData> = {}

      for (const row of (data || [])) {
        const metricType = row.dim_metric_types as Record<string, string>
        const date = row.collected_at as string
        const coverageType = metricType.name.replace('coverage_', '') as CoverageType
        const value = row.value as number

        if (!byDate[date]) {
          byDate[date] = { date, lines: null, functions: null, classes: null }
        }

        byDate[date][coverageType] = value
      }

      return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    },
    { watch: [period] }
  )
}

export function useQualitySummary() {
  const supabase = useSupabaseClient()

  return useAsyncData(
    'quality-summary',
    async (): Promise<QualitySummary> => {
      // Get latest metrics for each coverage type
      const { data, error } = await supabase
        .from('metrics_raw')
        .select(`
          value,
          metadata,
          dim_metric_types!inner(name, axis)
        `)
        .eq('dim_metric_types.axis', 'quality')
        .order('collected_at', { ascending: false })
        .limit(6) // 3 coverage types, recent 2 collections

      if (error) throw error

      const summary: QualitySummary = {
        lines: null,
        functions: null,
        classes: null,
        modules: []
      }

      // Find latest values for each coverage type
      const found: Record<string, boolean> = {}

      for (const row of (data || [])) {
        const metricType = row.dim_metric_types as Record<string, string>
        const coverageType = metricType.name.replace('coverage_', '') as CoverageType
        const metadata = row.metadata as Record<string, unknown> | null

        if (found[coverageType]) continue
        found[coverageType] = true

        summary[coverageType] = row.value as number

        // Extract modules from first row with modules data
        if (summary.modules.length === 0 && metadata?.modules) {
          const rawModules = metadata.modules as Array<{
            name: string
            lines_pct: number
          }>
          summary.modules = rawModules.map(m => ({
            name: m.name,
            linesPct: m.lines_pct
          }))
        }
      }

      return summary
    }
  )
}

/**
 * Get coverage status color
 */
export function getCoverageStatusColor(value: number | null): string {
  if (value === null) return 'gray'
  if (value >= COVERAGE_THRESHOLDS.good) return 'success'
  if (value >= COVERAGE_THRESHOLDS.acceptable) return 'warning'
  return 'error'
}

/**
 * Get coverage status label
 */
export function getCoverageStatus(value: number | null): string {
  if (value === null) return 'Inconnu'
  if (value >= COVERAGE_THRESHOLDS.good) return 'Bon'
  if (value >= COVERAGE_THRESHOLDS.acceptable) return 'Acceptable'
  if (value >= COVERAGE_THRESHOLDS.poor) return 'Faible'
  return 'Insuffisant'
}

/**
 * Format coverage percentage
 */
export function formatCoverage(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)}%`
}
