/**
 * Formatting utilities for dates, numbers, and metrics
 */

/**
 * Format a date as relative time in French
 * Examples: "À l'instant", "Il y a 5min", "Il y a 2h", "Il y a 3j"
 */
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'À l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes}min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Il y a ${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Il y a ${diffDays}j`

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `Il y a ${diffWeeks}sem`

  const diffMonths = Math.floor(diffDays / 30)
  return `Il y a ${diffMonths}mois`
}

/**
 * Format a date to French locale format
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(date))
}

/**
 * Format a date to ISO date string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format a number with French locale
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m${seconds}s`
}

/**
 * Format a delta value with sign
 */
export function formatDelta(value: number, unit = ''): string {
  const sign = value >= 0 ? '+' : ''
  const formatted = formatNumber(value)
  return `${sign}${formatted}${unit ? ` ${unit}` : ''}`
}

/**
 * Format a metric value based on its unit
 */
export function formatMetricValue(value: number, unit: string): string {
  switch (unit) {
    case 'ms':
      return `${formatNumber(Math.round(value))} ms`
    case 'ratio':
      return value.toFixed(4)
    case 'percent':
      return formatPercent(value)
    case 'count':
    default:
      return formatNumber(value)
  }
}
