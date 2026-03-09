/**
 * Tests for chartConfig utilities
 */

import { describe, it, expect } from 'vitest'
import {
  createTimeSeriesOption,
  createMultiSeriesOption,
  CHART_COLORS,
  watchtowerDarkTheme,
  watchtowerLightTheme
} from '~/utils/chartConfig'
import type { TimeSeriesDataPoint, MultiSeriesData } from '~/utils/chartConfig'

describe('CHART_COLORS', () => {
  it('defines all required colors', () => {
    expect(CHART_COLORS.primary).toBe('#3b82f6')
    expect(CHART_COLORS.success).toBe('#10b981')
    expect(CHART_COLORS.warning).toBe('#f59e0b')
    expect(CHART_COLORS.danger).toBe('#ef4444')
    expect(CHART_COLORS.purple).toBe('#8b5cf6')
    expect(CHART_COLORS.pink).toBe('#ec4899')
  })
})

describe('watchtowerDarkTheme', () => {
  it('has transparent background', () => {
    expect(watchtowerDarkTheme.backgroundColor).toBe('transparent')
  })

  it('has light text for dark mode', () => {
    expect(watchtowerDarkTheme.textStyle.color).toBe('#e5e7eb')
  })

  it('defines color palette', () => {
    expect(watchtowerDarkTheme.color).toHaveLength(6)
    expect(watchtowerDarkTheme.color).toContain(CHART_COLORS.primary)
  })
})

describe('watchtowerLightTheme', () => {
  it('has transparent background', () => {
    expect(watchtowerLightTheme.backgroundColor).toBe('transparent')
  })

  it('has dark text for light mode', () => {
    expect(watchtowerLightTheme.textStyle.color).toBe('#374151')
  })
})

describe('createTimeSeriesOption', () => {
  const testData: TimeSeriesDataPoint[] = [
    { date: '2026-03-01', value: 10 },
    { date: '2026-03-02', value: 20 },
    { date: '2026-03-03', value: 15 }
  ]

  it('creates valid ECharts option', () => {
    const option = createTimeSeriesOption(testData)

    expect(option).toBeDefined()
    expect(option.xAxis).toBeDefined()
    expect(option.yAxis).toBeDefined()
    expect(option.series).toBeDefined()
  })

  it('sets time axis correctly', () => {
    const option = createTimeSeriesOption(testData)

    expect(option.xAxis).toEqual(expect.objectContaining({
      type: 'time'
    }))
  })

  it('creates line series by default', () => {
    const option = createTimeSeriesOption(testData)
    const series = option.series as Array<{ type: string }>

    expect(series).toHaveLength(1)
    expect(series[0].type).toBe('line')
  })

  it('creates bar series when specified', () => {
    const option = createTimeSeriesOption(testData, { type: 'bar' })
    const series = option.series as Array<{ type: string }>

    expect(series[0].type).toBe('bar')
  })

  it('includes title when provided', () => {
    const option = createTimeSeriesOption(testData, { title: 'Test Chart' })

    expect(option.title).toBeDefined()
    expect((option.title as { text: string }).text).toBe('Test Chart')
  })

  it('includes data zoom', () => {
    const option = createTimeSeriesOption(testData)

    expect(option.dataZoom).toBeDefined()
    expect(Array.isArray(option.dataZoom)).toBe(true)
  })

  it('applies custom color', () => {
    const option = createTimeSeriesOption(testData, { color: '#ff0000' })
    const series = option.series as Array<{ itemStyle: { color: string } }>

    expect(series[0].itemStyle?.color).toBe('#ff0000')
  })
})

describe('createMultiSeriesOption', () => {
  const testSeries: MultiSeriesData[] = [
    {
      name: 'Series A',
      data: [
        { date: '2026-03-01', value: 10 },
        { date: '2026-03-02', value: 20 }
      ],
      color: '#ff0000'
    },
    {
      name: 'Series B',
      data: [
        { date: '2026-03-01', value: 5 },
        { date: '2026-03-02', value: 15 }
      ],
      color: '#00ff00'
    }
  ]

  it('creates valid multi-series option', () => {
    const option = createMultiSeriesOption(testSeries)

    expect(option).toBeDefined()
    expect(option.series).toBeDefined()
  })

  it('creates correct number of series', () => {
    const option = createMultiSeriesOption(testSeries)
    const series = option.series as Array<{ name: string }>

    expect(series).toHaveLength(2)
    expect(series[0].name).toBe('Series A')
    expect(series[1].name).toBe('Series B')
  })

  it('includes legend', () => {
    const option = createMultiSeriesOption(testSeries)

    expect(option.legend).toBeDefined()
    expect((option.legend as { data: string[] }).data).toContain('Series A')
    expect((option.legend as { data: string[] }).data).toContain('Series B')
  })

  it('applies individual series colors', () => {
    const option = createMultiSeriesOption(testSeries)
    const series = option.series as Array<{ itemStyle: { color: string } }>

    expect(series[0].itemStyle?.color).toBe('#ff0000')
    expect(series[1].itemStyle?.color).toBe('#00ff00')
  })
})
