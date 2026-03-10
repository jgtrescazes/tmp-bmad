/**
 * Anomaly Engine - Pure functions for anomaly detection
 * Detects threshold breaches, delta changes, and trends
 */

import { isInvertedMetric } from './metricPolarity'

// Types
export type AnomalyType = 'threshold' | 'delta' | 'trend'
export type AnomalySeverity = 'critical' | 'warning' | 'info'

export interface Anomaly {
  type: AnomalyType
  source: string
  metric: string
  currentValue: number
  expectedValue: number
  severity: AnomalySeverity
}

export interface PerformanceMetricInput {
  metricName: string
  value: number
  source: string
}

export interface MonthlyDataPoint {
  periodStart: string
  value: number
  metricTypeId?: number
  metricName?: string
  source?: string
}

export interface VulnerabilityAlertInput {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  createdAt: string
  package: string
  title: string
}

export interface ScoredVulnerability extends VulnerabilityAlertInput {
  score: number
  ageDays: number
}

// Constants - Google Core Web Vitals absolute thresholds (FR15)
export const CWV_THRESHOLDS_ABSOLUTE: Record<string, number> = {
  lcp: 2500, // ms
  inp: 200, // ms
  cls: 0.1 // ratio
}

// Default delta threshold for M/M-1 comparison (FR16)
export const DELTA_THRESHOLD_DEFAULT = 0.1 // 10%

// Severity coefficients for Dependabot vulnerabilities (FR18)
export const SEVERITY_COEFFICIENTS: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

/**
 * Detect threshold anomalies for CWV metrics (FR15)
 * Only checks LCP, INP, CLS against Google absolute thresholds
 */
export function detectThresholdAnomalies(
  metrics: PerformanceMetricInput[]
): Anomaly[] {
  const anomalies: Anomaly[] = []

  for (const metric of metrics) {
    const threshold = CWV_THRESHOLDS_ABSOLUTE[metric.metricName]

    // Only check CWV metrics with defined thresholds
    if (threshold === undefined) continue

    // Threshold exceeded (strictly greater than)
    if (metric.value > threshold) {
      anomalies.push({
        type: 'threshold',
        source: metric.source,
        metric: metric.metricName,
        currentValue: metric.value,
        expectedValue: threshold,
        severity: 'critical'
      })
    }
  }

  return anomalies
}

/**
 * Detect delta anomalies between current and previous period (FR16)
 * Detects significant degradations (not improvements)
 */
export function detectDeltaAnomalies(
  current: PerformanceMetricInput[],
  previous: PerformanceMetricInput[],
  threshold: number = DELTA_THRESHOLD_DEFAULT
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Index previous metrics by name
  const previousByName = new Map<string, PerformanceMetricInput>()
  for (const metric of previous) {
    previousByName.set(metric.metricName, metric)
  }

  for (const currentMetric of current) {
    const previousMetric = previousByName.get(currentMetric.metricName)

    // Skip if no previous data
    if (!previousMetric) continue

    // Skip if previous value is zero (cannot compute percentage)
    if (previousMetric.value === 0) continue

    // Calculate delta percentage
    const deltaValue = currentMetric.value - previousMetric.value
    const deltaPercent = Math.abs(deltaValue) / Math.abs(previousMetric.value)

    // Check if delta exceeds threshold
    if (deltaPercent < threshold) continue

    // Determine if this is a degradation
    const inverted = isInvertedMetric(currentMetric.metricName)
    const isDegradation = inverted
      ? deltaValue > 0 // For inverted metrics (LCP, errors), higher = worse
      : deltaValue < 0 // For normal metrics (coverage), lower = worse

    // Only report degradations
    if (!isDegradation) continue

    // Determine severity based on delta magnitude
    // >50% = critical, >20% = warning, else info
    let severity: AnomalySeverity = 'info'
    if (deltaPercent > 0.5) {
      severity = 'critical'
    } else if (deltaPercent > 0.2) {
      severity = 'warning'
    }

    anomalies.push({
      type: 'delta',
      source: currentMetric.source,
      metric: currentMetric.metricName,
      currentValue: currentMetric.value,
      expectedValue: previousMetric.value,
      severity
    })
  }

  return anomalies
}

/**
 * Detect trend anomalies over 3 consecutive months (FR17)
 * Detects continuous degradation patterns
 */
export function detectTrendAnomalies(
  monthlyData: MonthlyDataPoint[]
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Need at least 3 data points for trend detection
  if (monthlyData.length < 3) return anomalies

  // Group by metric
  const byMetric = new Map<string, MonthlyDataPoint[]>()
  for (const point of monthlyData) {
    const key = point.metricName || 'unknown'
    const existing = byMetric.get(key) || []
    existing.push(point)
    byMetric.set(key, existing)
  }

  for (const [metricName, points] of byMetric) {
    // Sort by period (most recent last)
    const sorted = [...points].sort((a, b) =>
      a.periodStart.localeCompare(b.periodStart)
    )

    // Take last 3 periods
    if (sorted.length < 3) continue
    const recent = sorted.slice(-3)

    const [m2, m1, m0] = recent
    const inverted = isInvertedMetric(metricName)

    // Check for continuous degradation
    const degrading1 = inverted
      ? m1.value > m2.value
      : m1.value < m2.value
    const degrading2 = inverted
      ? m0.value > m1.value
      : m0.value < m1.value

    if (degrading1 && degrading2) {
      // Find first non-undefined source
      const source = points.find(p => p.source)?.source || 'unknown'
      anomalies.push({
        type: 'trend',
        source,
        metric: metricName,
        currentValue: m0.value,
        expectedValue: m2.value, // Baseline from 3 months ago
        severity: 'warning'
      })
    }
  }

  return anomalies
}

/**
 * Calculate vulnerability severity score (FR18)
 * Score = age (days) x severity coefficient
 */
export function calculateVulnerabilityScore(
  alerts: VulnerabilityAlertInput[]
): ScoredVulnerability[] {
  const now = Date.now()

  const scored = alerts.map((alert) => {
    const createdTime = new Date(alert.createdAt).getTime()
    const ageDays = Math.floor((now - createdTime) / (1000 * 60 * 60 * 24))
    const coefficient = SEVERITY_COEFFICIENTS[alert.severity] || 1
    const score = ageDays * coefficient

    return {
      ...alert,
      ageDays,
      score
    }
  })

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score)
}

/**
 * Combine all anomaly types and sort by severity
 */
export function combineAndSortAnomalies(
  thresholdAnomalies: Anomaly[],
  deltaAnomalies: Anomaly[],
  trendAnomalies: Anomaly[] = []
): Anomaly[] {
  const all = [...thresholdAnomalies, ...deltaAnomalies, ...trendAnomalies]

  // Sort by severity priority: critical > warning > info
  const severityOrder: Record<AnomalySeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2
  }

  return all.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
