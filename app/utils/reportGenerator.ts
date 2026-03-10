/**
 * Report Generator
 * Generates Markdown report from ReportData
 */

import type {
  ReportData,
  ReportSection,
  ReportMetric,
  ReportDeployment,
  ReportTrend
} from '~/types/report'
import type { Anomaly } from '~/utils/anomalyEngine'
import { isInvertedMetric } from '~/utils/metricPolarity'

/**
 * Severity emoji mapping
 */
const SEVERITY_EMOJI: Record<Anomaly['severity'], string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵'
}

/**
 * Format a date for display using French locale
 */
function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date(isoString))
}

/**
 * Format a short date (day only)
 */
function formatShortDate(isoString: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium'
  }).format(new Date(isoString))
}

/**
 * Format a period (YYYY-MM) for display
 * Uses UTC to avoid timezone issues
 */
function formatPeriodDisplay(period: string): string {
  const [year, month] = period.split('-')
  // Use UTC date to avoid timezone issues (e.g., 2026-02 showing as January in certain timezones)
  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 15))
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}

/**
 * Format delta with sign and percentage
 */
function formatDelta(
  delta: number | null,
  metricName: string
): string {
  if (delta === null) {
    return 'N/A'
  }

  const sign = delta > 0 ? '+' : ''
  const formatted = `${sign}${delta.toFixed(1)}%`

  // Add warning emoji for degradations
  const isInverted = isInvertedMetric(metricName)
  const isDegradation = isInverted ? delta > 10 : delta < -10

  return isDegradation ? `${formatted} ⚠️` : formatted
}

/**
 * Format metric value with unit
 */
function formatValue(value: number, unit: string): string {
  // Handle common units
  if (unit === 'ms') {
    return `${value.toFixed(0)} ms`
  }
  if (unit === '%') {
    return `${value.toFixed(1)}%`
  }
  if (unit === 'ratio') {
    return value.toFixed(3)
  }

  // Default formatting
  if (Number.isInteger(value)) {
    return `${value}${unit ? ` ${unit}` : ''}`
  }
  return `${value.toFixed(2)}${unit ? ` ${unit}` : ''}`
}

/**
 * Get trend label in French
 */
function getTrendLabel(trend: ReportTrend): string {
  switch (trend) {
    case 'improving':
      return 'Amelioration'
    case 'degrading':
      return 'Degradation'
    case 'stable':
      return 'Stable'
  }
}

/**
 * Get trend emoji
 */
function getTrendEmoji(trend: ReportTrend): string {
  switch (trend) {
    case 'improving':
      return '📈'
    case 'degrading':
      return '📉'
    case 'stable':
      return '➡️'
  }
}

/**
 * Generate metrics table for a section
 */
function generateMetricsTable(
  metrics: ReportMetric[],
  currentPeriod: string,
  previousPeriod: string
): string {
  if (metrics.length === 0) {
    return '_Aucune metrique disponible_\n'
  }

  const currentLabel = formatPeriodDisplay(currentPeriod)
  const previousLabel = formatPeriodDisplay(previousPeriod)

  const lines: string[] = []

  lines.push(`| Metrique | M (${currentLabel}) | M-1 (${previousLabel}) | Delta |`)
  lines.push('|----------|-----------|----------------|-------|')

  for (const metric of metrics) {
    const currentFormatted = formatValue(metric.currentValue, metric.unit)
    const previousFormatted = metric.previousValue !== null
      ? formatValue(metric.previousValue, metric.unit)
      : 'N/A'
    const deltaFormatted = formatDelta(metric.delta, metric.name)

    lines.push(
      `| ${metric.displayName} | ${currentFormatted} | ${previousFormatted} | ${deltaFormatted} |`
    )
  }

  return lines.join('\n') + '\n'
}

/**
 * Generate top problems list
 */
function generateTopProblems(anomalies: Anomaly[]): string {
  if (anomalies.length === 0) {
    return '_Aucun probleme majeur detecte_\n'
  }

  const lines: string[] = []

  for (const anomaly of anomalies) {
    const emoji = SEVERITY_EMOJI[anomaly.severity]
    const description = formatAnomalyDescription(anomaly)
    lines.push(`- ${emoji} ${description}`)
  }

  return lines.join('\n') + '\n'
}

/**
 * Format anomaly description
 */
function formatAnomalyDescription(anomaly: Anomaly): string {
  const deltaPercent = anomaly.expectedValue !== 0
    ? ((anomaly.currentValue - anomaly.expectedValue) / Math.abs(anomaly.expectedValue)) * 100
    : 0

  const sign = deltaPercent > 0 ? '+' : ''
  const change = `${sign}${deltaPercent.toFixed(1)}%`

  switch (anomaly.type) {
    case 'threshold':
      return `**${anomaly.metric}** depasse le seuil (${formatValue(anomaly.currentValue, '')} > ${formatValue(anomaly.expectedValue, '')})`
    case 'delta':
      return `**${anomaly.metric}** variation significative (${change})`
    case 'trend':
      return `**${anomaly.metric}** tendance degradee sur 3 mois (${change})`
  }
}

/**
 * Generate section for one axis
 */
function generateSection(
  section: ReportSection,
  currentPeriod: string,
  previousPeriod: string
): string {
  const lines: string[] = []

  lines.push(`## ${section.displayName}`)
  lines.push('')
  lines.push(generateMetricsTable(section.metrics, currentPeriod, previousPeriod))

  if (section.topProblems.length > 0) {
    lines.push('### Top problemes')
    lines.push('')
    lines.push(generateTopProblems(section.topProblems))
  }

  return lines.join('\n')
}

/**
 * Generate deployments table
 */
function generateDeploymentsTable(deployments: ReportDeployment[]): string {
  if (deployments.length === 0) {
    return '_Aucun deploiement ce mois_\n'
  }

  const lines: string[] = []

  lines.push('| Date | SHA | Auteur | PR | Message |')
  lines.push('|------|-----|--------|-----|---------|')

  for (const deployment of deployments) {
    const date = formatShortDate(deployment.deployedAt)
    const prLink = deployment.prNumber !== null
      ? `#${deployment.prNumber}`
      : '-'
    const message = deployment.message.length > 50
      ? `${deployment.message.substring(0, 47)}...`
      : deployment.message

    lines.push(
      `| ${date} | ${deployment.shortSha} | ${deployment.author} | ${prLink} | ${message} |`
    )
  }

  return lines.join('\n') + '\n'
}

/**
 * Determine overall trend from report data
 */
function calculateOverallTrend(data: ReportData): ReportTrend {
  const allAnomalies = data.sections.flatMap(s => s.anomalies)

  if (allAnomalies.length === 0) {
    return 'stable'
  }

  const criticalCount = allAnomalies.filter(a => a.severity === 'critical').length
  const warningCount = allAnomalies.filter(a => a.severity === 'warning').length

  if (criticalCount > 0 || warningCount > 2) {
    return 'degrading'
  }

  if (warningCount === 0 && allAnomalies.length <= 2) {
    return 'improving'
  }

  return 'stable'
}

/**
 * Generate complete Markdown report
 */
export function generateMarkdownReport(data: ReportData): string {
  const lines: string[] = []

  // Header
  const periodDisplay = formatPeriodDisplay(data.period)
  lines.push(`# Rapport Mensuel — ${data.repositoryName} — ${periodDisplay}`)
  lines.push('')
  lines.push(`> Genere le ${formatDate(data.generatedAt)} par Watchtower`)
  lines.push('')

  // Executive Summary
  const trend = calculateOverallTrend(data)
  const criticalCount = data.sections.flatMap(s => s.anomalies).filter(a => a.severity === 'critical').length
  const warningCount = data.sections.flatMap(s => s.anomalies).filter(a => a.severity === 'warning').length

  lines.push('## Resume Executif')
  lines.push('')
  lines.push(`- **${data.totalAnomalies} anomalie(s)** detectee(s) ce mois`)

  if (criticalCount > 0) {
    lines.push(`  - ${criticalCount} critique(s) 🔴`)
  }
  if (warningCount > 0) {
    lines.push(`  - ${warningCount} avertissement(s) 🟡`)
  }

  lines.push(`- **${data.deployments.length} deploiement(s)** ce mois`)
  lines.push(`- Tendance generale : ${getTrendEmoji(trend)} ${getTrendLabel(trend)}`)
  lines.push('')

  // Sections by axis
  for (const section of data.sections) {
    lines.push(generateSection(section, data.period, data.previousPeriod))
    lines.push('')
  }

  // Deployments
  lines.push('## Deploiements du mois')
  lines.push('')
  lines.push(generateDeploymentsTable(data.deployments))

  // Footer
  lines.push('---')
  lines.push('*Rapport genere automatiquement par Watchtower*')

  return lines.join('\n')
}

/**
 * Generate filename for the report
 * Format: rapport-{repository}-{YYYY-MM}.md
 */
export function generateReportFilename(data: ReportData): string {
  const repoSlug = data.repositoryName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `rapport-${repoSlug}-${data.period}.md`
}

/**
 * Download markdown content as a file
 * Uses Blob + URL.createObjectURL pattern
 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Cleanup to prevent memory leak
  URL.revokeObjectURL(url)
}
