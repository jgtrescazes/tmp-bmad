/**
 * Metric polarity configuration
 * Defines which metrics are "inverted" (lower = better)
 */

/**
 * Inverted metrics: lower values are better (green down arrow)
 * - Errors: less = good
 * - Vulnerabilities: less = good
 * - Core Web Vitals: lower = faster = good
 */
export const INVERTED_METRICS = [
  // Stability (Sentry)
  'new_errors',
  'error_count',
  'error_rate',
  'avg_resolution_time',

  // Performance (DebugBear CWV)
  'lcp', // Largest Contentful Paint - lower is better
  'cls', // Cumulative Layout Shift - lower is better
  'inp', // Interaction to Next Paint - lower is better
  'fcp', // First Contentful Paint - lower is better
  'ttfb', // Time to First Byte - lower is better
  'tti', // Time to Interactive - lower is better
  'tbt', // Total Blocking Time - lower is better

  // Security (Dependabot)
  'vuln_critical',
  'vuln_high',
  'vuln_medium',
  'vuln_low',
  'vuln_total'
] as const

export type InvertedMetric = (typeof INVERTED_METRICS)[number]

/**
 * Check if a metric is inverted (lower is better)
 */
export function isInvertedMetric(metricName: string): boolean {
  return INVERTED_METRICS.includes(metricName as InvertedMetric)
}

/**
 * Get the semantic color for a delta based on metric polarity
 * @param delta - The delta value (positive = increase, negative = decrease)
 * @param metricName - The name of the metric to check polarity
 * @returns 'success' | 'danger' | 'neutral'
 */
export function getDeltaColor(
  delta: number | null,
  metricName: string
): 'success' | 'danger' | 'neutral' {
  if (delta === null || Math.abs(delta) < 0.01) {
    return 'neutral'
  }

  const inverted = isInvertedMetric(metricName)
  const isImprovement = inverted ? delta < 0 : delta > 0

  return isImprovement ? 'success' : 'danger'
}

/**
 * Determine if a trend represents improvement based on metric polarity
 * @param trend - 'up' | 'down' | 'stable'
 * @param metricName - The metric name
 * @returns true if the trend is an improvement
 */
export function isImprovement(
  trend: 'up' | 'down' | 'stable' | 'unknown',
  metricName: string
): boolean | null {
  if (trend === 'stable' || trend === 'unknown') return null

  const inverted = isInvertedMetric(metricName)
  return inverted ? trend === 'down' : trend === 'up'
}
