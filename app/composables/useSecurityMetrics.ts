/**
 * Security metrics composable
 * Fetches vulnerability data from Dependabot via metrics_raw
 */

import type { Period } from './usePeriod'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface VulnerabilityAlert {
  number: number
  state: string
  severity: Severity
  package: string
  ageDays: number
  createdAt: string
}

export interface SecurityMetricRow {
  id: number
  value: number
  collectedAt: string
  metricName: string
  severity: Severity
  alerts: VulnerabilityAlert[]
  totalOpen: number
}

export interface SecuritySummary {
  critical: number
  high: number
  medium: number
  low: number
  total: number
  oldestAlert: VulnerabilityAlert | null
}

// Severity colors for charts and badges
export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ef4444', // red-500
  high: '#f97316', // orange-500
  medium: '#eab308', // yellow-500
  low: '#3b82f6' // blue-500
}

export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low']

export function useSecurityMetrics(period: Ref<Period>) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `security-metrics-${period.value.from}-${period.value.to}`,
    async (): Promise<SecurityMetricRow[]> => {
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
        .eq('dim_metric_types.axis', 'security')
        .eq('dim_sources.name', 'dependabot')
        .gte('collected_at', period.value.from)
        .lte('collected_at', period.value.to)
        .order('collected_at', { ascending: true })

      if (error) throw error

      return (data || []).map((row: Record<string, unknown>) => {
        const metricType = row.dim_metric_types as Record<string, string>
        const metadata = row.metadata as Record<string, unknown> | null

        // Extract severity from metric name (vuln_critical -> critical)
        const severity = metricType.name.replace('vuln_', '') as Severity

        // Parse alerts from metadata
        const rawAlerts = (metadata?.alerts || []) as Array<{
          number: number
          state: string
          severity: string
          package: string
          age_days: number
          created_at: string
        }>

        const alerts: VulnerabilityAlert[] = rawAlerts.map(a => ({
          number: a.number,
          state: a.state,
          severity: a.severity as Severity,
          package: a.package,
          ageDays: a.age_days,
          createdAt: a.created_at
        }))

        return {
          id: row.id as number,
          value: row.value as number,
          collectedAt: row.collected_at as string,
          metricName: metricType.name,
          severity,
          alerts,
          totalOpen: (metadata?.total_open as number) || 0
        }
      })
    },
    { watch: [period] }
  )
}

export interface SecurityChartData {
  date: string
  critical: number
  high: number
  medium: number
  low: number
  total: number
}

export function useSecurityChartData(period: Ref<Period>) {
  const supabase = useSupabaseClient()

  return useAsyncData(
    `security-chart-${period.value.from}-${period.value.to}`,
    async (): Promise<SecurityChartData[]> => {
      const { data, error } = await supabase
        .from('metrics_raw')
        .select(`
          id,
          value,
          collected_at,
          dim_metric_types!inner(name, axis)
        `)
        .eq('dim_metric_types.axis', 'security')
        .gte('collected_at', period.value.from)
        .lte('collected_at', period.value.to)
        .order('collected_at', { ascending: true })

      if (error) throw error

      // Group by collection timestamp
      const byDate: Record<string, SecurityChartData> = {}

      for (const row of (data || [])) {
        const metricType = row.dim_metric_types as Record<string, string>
        const date = row.collected_at as string
        const severity = metricType.name.replace('vuln_', '') as Severity
        const value = row.value as number

        if (!byDate[date]) {
          byDate[date] = { date, critical: 0, high: 0, medium: 0, low: 0, total: 0 }
        }

        byDate[date][severity] = value
        byDate[date].total += value
      }

      return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    },
    { watch: [period] }
  )
}

export function useSecuritySummary() {
  const supabase = useSupabaseClient()

  return useAsyncData(
    'security-summary',
    async (): Promise<SecuritySummary> => {
      // Get latest metrics for each severity
      const { data, error } = await supabase
        .from('metrics_raw')
        .select(`
          value,
          metadata,
          dim_metric_types!inner(name, axis)
        `)
        .eq('dim_metric_types.axis', 'security')
        .order('collected_at', { ascending: false })
        .limit(8) // 4 severities, recent 2 collections

      if (error) throw error

      const summary: SecuritySummary = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
        oldestAlert: null
      }

      // Find latest values for each severity
      const found: Record<string, boolean> = {}

      for (const row of (data || [])) {
        const metricType = row.dim_metric_types as Record<string, string>
        const severity = metricType.name.replace('vuln_', '') as Severity
        const metadata = row.metadata as Record<string, unknown> | null

        if (found[severity]) continue
        found[severity] = true

        summary[severity] = row.value as number
        summary.total += row.value as number

        // Extract oldest alert from first row with alerts
        if (!summary.oldestAlert && metadata?.alerts) {
          const alerts = metadata.alerts as Array<{
            number: number
            state: string
            severity: string
            package: string
            age_days: number
            created_at: string
          }>

          if (alerts.length > 0) {
            // Find oldest alert
            const oldest = alerts.reduce((prev, curr) =>
              curr.age_days > prev.age_days ? curr : prev
            )
            summary.oldestAlert = {
              number: oldest.number,
              state: oldest.state,
              severity: oldest.severity as Severity,
              package: oldest.package,
              ageDays: oldest.age_days,
              createdAt: oldest.created_at
            }
          }
        }
      }

      return summary
    }
  )
}

export function useSecurityAlerts() {
  const supabase = useSupabaseClient()

  return useAsyncData(
    'security-alerts',
    async (): Promise<VulnerabilityAlert[]> => {
      // Get latest collection with full alert details
      const { data, error } = await supabase
        .from('metrics_raw')
        .select(`
          metadata,
          dim_metric_types!inner(name, axis)
        `)
        .eq('dim_metric_types.axis', 'security')
        .eq('dim_metric_types.name', 'vuln_critical') // Just need one row for full metadata
        .order('collected_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      if (!data) return []

      const metadata = data.metadata as Record<string, unknown> | null
      const rawAlerts = (metadata?.alerts || []) as Array<{
        number: number
        state: string
        severity: string
        package: string
        age_days: number
        created_at: string
      }>

      return rawAlerts
        .map(a => ({
          number: a.number,
          state: a.state,
          severity: a.severity as Severity,
          package: a.package,
          ageDays: a.age_days,
          createdAt: a.created_at
        }))
        .sort((a, b) => {
          // Sort by severity (critical first) then by age (oldest first)
          const severityOrder = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
          if (severityOrder !== 0) return severityOrder
          return b.ageDays - a.ageDays
        })
    }
  )
}

/**
 * Get badge color for severity
 */
export function getSeverityBadgeColor(severity: Severity): 'error' | 'warning' | 'info' | 'neutral' {
  switch (severity) {
    case 'critical': return 'error'
    case 'high': return 'warning'
    case 'medium': return 'warning'
    case 'low': return 'info'
    default: return 'neutral'
  }
}

/**
 * Format age for display
 */
export function formatAge(days: number): string {
  if (days === 0) return 'Aujourd\'hui'
  if (days === 1) return '1 jour'
  if (days < 7) return `${days} jours`
  const weeks = Math.floor(days / 7)
  if (days < 30) return `${weeks} semaine${weeks > 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (days < 365) return `${months} mois`
  const years = Math.floor(days / 365)
  return `${years} an${years > 1 ? 's' : ''}`
}
