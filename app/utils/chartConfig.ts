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
