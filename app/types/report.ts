/**
 * Report Types
 * Types for monthly report aggregation and export
 */

import type { Anomaly } from '~/utils/anomalyEngine'

/**
 * Single metric with M/M-1 comparison
 */
export interface ReportMetric {
  name: string
  displayName: string
  currentValue: number
  previousValue: number | null
  delta: number | null // percentage of variation
  unit: string
}

/**
 * Report section for one axis
 */
export interface ReportSection {
  axis: 'stability' | 'performance' | 'security' | 'quality'
  displayName: string
  metrics: ReportMetric[]
  anomalies: Anomaly[]
  topProblems: Anomaly[] // top 3 by severity
}

/**
 * Deployment included in the report
 */
export interface ReportDeployment {
  sha: string
  shortSha: string
  message: string
  author: string
  prNumber: number | null
  deployedAt: string
}

/**
 * Complete monthly report data
 */
export interface ReportData {
  period: string // e.g., "2026-02"
  previousPeriod: string // e.g., "2026-01"
  repositoryName: string
  generatedAt: string // ISO 8601
  sections: ReportSection[]
  deployments: ReportDeployment[]
  totalAnomalies: number
}

/**
 * Overall trend direction for executive summary
 */
export type ReportTrend = 'improving' | 'degrading' | 'stable'

/**
 * Executive summary data
 */
export interface ReportSummary {
  totalAnomalies: number
  criticalCount: number
  warningCount: number
  trend: ReportTrend
  deploymentCount: number
}
