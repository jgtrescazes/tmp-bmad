/**
 * ECharts configuration utilities
 * Theme definitions and chart option builders
 */

import type { EChartsOption, LineSeriesOption, BarSeriesOption } from 'echarts'

// Watchtower color palette
export const CHART_COLORS = {
  primary: '#3b82f6', // blue-500
  success: '#10b981', // emerald-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  purple: '#8b5cf6', // violet-500
  pink: '#ec4899' // pink-500
}

export const watchtowerDarkTheme = {
  backgroundColor: 'transparent',
  textStyle: { color: '#e5e7eb' },
  title: { textStyle: { color: '#f3f4f6' } },
  legend: { textStyle: { color: '#d1d5db' } },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#374151' } },
    axisLabel: { color: '#9ca3af' },
    splitLine: { lineStyle: { color: '#1f2937' } }
  },
  valueAxis: {
    axisLine: { lineStyle: { color: '#374151' } },
    splitLine: { lineStyle: { color: '#1f2937' } },
    axisLabel: { color: '#9ca3af' }
  },
  color: [CHART_COLORS.primary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.danger, CHART_COLORS.purple, CHART_COLORS.pink]
}

export const watchtowerLightTheme = {
  backgroundColor: 'transparent',
  textStyle: { color: '#374151' },
  title: { textStyle: { color: '#111827' } },
  legend: { textStyle: { color: '#4b5563' } },
  categoryAxis: {
    axisLine: { lineStyle: { color: '#d1d5db' } },
    axisLabel: { color: '#6b7280' },
    splitLine: { lineStyle: { color: '#e5e7eb' } }
  },
  valueAxis: {
    axisLine: { lineStyle: { color: '#d1d5db' } },
    splitLine: { lineStyle: { color: '#e5e7eb' } },
    axisLabel: { color: '#6b7280' }
  },
  color: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777']
}

export interface TimeSeriesDataPoint {
  date: string
  value: number
}

export interface TimeSeriesOptions {
  title?: string
  unit?: string
  type?: 'line' | 'bar'
  smooth?: boolean
  showArea?: boolean
  color?: string
}

export function createTimeSeriesOption(
  data: TimeSeriesDataPoint[],
  options: TimeSeriesOptions = {}
): EChartsOption {
  const { title, unit = '', type = 'line', smooth = true, showArea = true, color } = options

  const seriesData = data.map(d => [d.date, d.value])

  const series: (LineSeriesOption | BarSeriesOption)[] = [{
    type,
    data: seriesData,
    smooth: type === 'line' ? smooth : undefined,
    areaStyle: type === 'line' && showArea ? { opacity: 0.15 } : undefined,
    itemStyle: color ? { color } : undefined,
    lineStyle: color ? { color } : undefined
  }]

  return {
    title: title ? { text: title, left: 'center', top: 10 } : undefined,
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = params as Array<{ axisValue: string, value: [string, number] }>
        if (p.length > 0) {
          const date = new Date(p[0].axisValue).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })
          return `${date}<br/><strong>${p[0].value[1]}</strong> ${unit}`
        }
        return ''
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: title ? '15%' : '10%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: '{MM}-{dd} {HH}:{mm}'
      }
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameLocation: 'end',
      nameGap: 10
    },
    series,
    dataZoom: [{ type: 'inside' }]
  }
}

export interface MultiSeriesData {
  name: string
  data: TimeSeriesDataPoint[]
  color?: string
}

export function createMultiSeriesOption(
  series: MultiSeriesData[],
  options: Omit<TimeSeriesOptions, 'color'> = {}
): EChartsOption {
  const { title, unit = '', type = 'line', smooth = true, showArea = false } = options

  const chartSeries: (LineSeriesOption | BarSeriesOption)[] = series.map((s, _index) => ({
    name: s.name,
    type,
    data: s.data.map(d => [d.date, d.value]),
    smooth: type === 'line' ? smooth : undefined,
    areaStyle: type === 'line' && showArea ? { opacity: 0.1 } : undefined,
    itemStyle: s.color ? { color: s.color } : undefined,
    lineStyle: s.color ? { color: s.color } : undefined
  }))

  return {
    title: title ? { text: title, left: 'center', top: 10 } : undefined,
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      bottom: 0,
      data: series.map(s => s.name)
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: title ? '15%' : '10%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: '{MM}-{dd}'
      }
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameLocation: 'end',
      nameGap: 10
    },
    series: chartSeries,
    dataZoom: [{ type: 'inside' }]
  }
}

// Core Web Vitals threshold markLines
export interface CWVMarkLineConfig {
  good: number
  needsImprovement: number
}

export function createCWVChartOption(
  labData: TimeSeriesDataPoint[],
  fieldData: TimeSeriesDataPoint[],
  thresholds: CWVMarkLineConfig,
  options: { title: string, unit: string }
): EChartsOption {
  const series: LineSeriesOption[] = []

  if (labData.length > 0) {
    series.push({
      name: 'Lab',
      type: 'line',
      data: labData.map(d => [d.date, d.value]),
      smooth: true,
      itemStyle: { color: CHART_COLORS.primary },
      lineStyle: { color: CHART_COLORS.primary },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed' },
        data: [
          {
            yAxis: thresholds.good,
            label: { formatter: 'Bon', position: 'end' },
            lineStyle: { color: CHART_COLORS.success }
          },
          {
            yAxis: thresholds.needsImprovement,
            label: { formatter: 'À améliorer', position: 'end' },
            lineStyle: { color: CHART_COLORS.warning }
          }
        ]
      }
    })
  }

  if (fieldData.length > 0) {
    series.push({
      name: 'Field (CrUX)',
      type: 'line',
      data: fieldData.map(d => [d.date, d.value]),
      smooth: true,
      itemStyle: { color: CHART_COLORS.purple },
      lineStyle: { color: CHART_COLORS.purple, type: 'dashed' }
    })
  }

  return {
    title: { text: options.title, left: 'center', top: 10 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = params as Array<{ seriesName: string, axisValue: string, value: [string, number] }>
        if (p.length === 0) return ''

        const date = new Date(p[0].axisValue).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })

        let html = `<strong>${date}</strong><br/>`
        for (const point of p) {
          const value = options.unit === 'ratio' ? point.value[1].toFixed(3) : Math.round(point.value[1])
          const unitLabel = options.unit === 'ms' ? 'ms' : options.unit === 'ratio' ? '' : options.unit
          html += `${point.seriesName}: <strong>${value}</strong>${unitLabel}<br/>`
        }
        return html
      }
    },
    legend: {
      bottom: 0,
      data: series.map(s => s.name!)
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLabel: { formatter: '{MM}-{dd}' }
    },
    yAxis: {
      type: 'value',
      name: options.unit,
      nameLocation: 'end',
      nameGap: 10
    },
    series,
    dataZoom: [{ type: 'inside' }]
  }
}

/**
 * Time series with M-1 overlay (previous period comparison)
 * Current period: solid line, Previous period: dashed line with lower opacity
 */
export interface ComparisonSeriesData {
  current: TimeSeriesDataPoint[]
  previous: TimeSeriesDataPoint[]
}

export function createComparisonChartOption(
  data: ComparisonSeriesData,
  options: TimeSeriesOptions & { previousLabel?: string } = {}
): EChartsOption {
  const { title, unit = '', smooth = true, showArea = true, color, previousLabel = 'M-1' } = options

  const series: LineSeriesOption[] = []

  // Current period series (solid)
  if (data.current.length > 0) {
    series.push({
      name: 'Mois en cours',
      type: 'line',
      data: data.current.map(d => [d.date, d.value]),
      smooth,
      areaStyle: showArea ? { opacity: 0.15 } : undefined,
      itemStyle: color ? { color } : undefined,
      lineStyle: color ? { color } : undefined,
      z: 2
    })
  }

  // Previous period series (dashed, lower opacity)
  if (data.previous.length > 0) {
    // Shift dates to align with current period for visual comparison
    const currentStart = data.current[0]?.date ? new Date(data.current[0].date) : new Date()
    const prevStart = data.previous[0]?.date ? new Date(data.previous[0].date) : new Date()
    const offset = currentStart.getTime() - prevStart.getTime()

    const shiftedPrevious = data.previous.map(d => ({
      date: new Date(new Date(d.date).getTime() + offset).toISOString().split('T')[0],
      value: d.value
    }))

    series.push({
      name: previousLabel,
      type: 'line',
      data: shiftedPrevious.map(d => [d.date, d.value]),
      smooth,
      lineStyle: {
        type: 'dashed',
        opacity: 0.5,
        color: color || '#888'
      },
      itemStyle: { opacity: 0.5 },
      areaStyle: undefined, // No area for previous period
      z: 1
    })
  }

  return {
    title: title ? { text: title, left: 'center', top: 10 } : undefined,
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = params as Array<{ seriesName: string, axisValue: string, value: [string, number] }>
        if (p.length === 0) return ''

        const date = new Date(p[0].axisValue).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short'
        })

        let html = `<strong>${date}</strong><br/>`
        for (const point of p) {
          const value = unit === 'ratio' ? point.value[1].toFixed(3) : Math.round(point.value[1])
          const unitLabel = unit === 'ms' ? 'ms' : unit === 'percent' ? '%' : unit
          html += `${point.seriesName}: <strong>${value}</strong>${unitLabel}<br/>`
        }
        return html
      }
    },
    legend: {
      bottom: 0,
      data: series.map(s => s.name!)
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: title ? '15%' : '10%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: '{MM}-{dd}'
      }
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameLocation: 'end',
      nameGap: 10
    },
    series,
    dataZoom: [{ type: 'inside' }]
  }
}

/**
 * Deployment markLines for chart annotations
 */
export interface DeploymentMarker {
  deployedAt: string
  shortSha: string
  message: string
  author: string
}

export function createDeploymentMarkLine(deployments: DeploymentMarker[]): {
  markLine: {
    silent: boolean
    symbol: [string, string]
    lineStyle: { type: string, color: string, width: number }
    label: { show: boolean }
    data: Array<{ xAxis: string, name: string }>
  }
} {
  return {
    markLine: {
      silent: false, // Enable hover interaction
      symbol: ['none', 'none'],
      lineStyle: {
        type: 'dashed',
        color: '#888',
        width: 1
      },
      label: {
        show: false // Use tooltip instead
      },
      data: deployments.map(d => ({
        xAxis: d.deployedAt,
        name: d.shortSha
      }))
    }
  }
}

// Stacked bar chart for vulnerability severity
export interface StackedBarData {
  date: string
  values: Record<string, number>
}

export function createStackedBarOption(
  data: StackedBarData[],
  seriesConfig: Array<{ name: string, color: string }>,
  options: { title?: string, unit?: string } = {}
): EChartsOption {
  const { title, unit = '' } = options

  const dates = data.map(d => d.date)
  const series: BarSeriesOption[] = seriesConfig.map(config => ({
    name: config.name,
    type: 'bar',
    stack: 'total',
    data: data.map(d => d.values[config.name] || 0),
    itemStyle: { color: config.color }
  }))

  return {
    title: title ? { text: title, left: 'center', top: 10 } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      bottom: 0,
      data: seriesConfig.map(s => s.name)
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: title ? '15%' : '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates.map(d => new Date(d).toLocaleDateString('fr-FR', { month: 'short', day: '2-digit' }))
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameLocation: 'end',
      nameGap: 10
    },
    series,
    dataZoom: [{ type: 'inside' }]
  }
}
